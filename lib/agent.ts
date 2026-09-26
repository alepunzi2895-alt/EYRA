import Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";
import { index, readText, writeText, isFolder } from "./drive";
import { loadAll, search, scadenze, today } from "./kb";
import { preview, apply, savePatch, loadPatch, newCode, Patch, Op, Fonte } from "./patch";
import { loadHistory, appendHistory } from "./history";
import { isFattura, extractXml, summarize } from "./fattura";
import { settings } from "./config";
import { agentIssue } from "./availability";
import { profileContext } from "./profile";
import { split } from "./kb";


export type Attachment = { name: string; mime: string; data: Buffer };
export type Channel = "whatsapp" | "telegram" | "web" | "email" | "upload";
type Ctx = { userText: string; channel: Channel; who: string };

// ---------- tools ----------
const tools: Anthropic.ToolUnion[] = [
  { type: "web_search_20250305", name: "web_search", max_uses: 5 },
  {
    name: "kb_cerca", description: "Cerca nella knowledge base (entità, immobili, contratti, scadenze, moduli). Restituisce id e titoli.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "kb_leggi", description: "Legge un file della KB per id (nome file senza .md) o per percorso (es. 'directives/ingest-informazioni.md').",
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
  },
  {
    name: "kb_elenco", description: "Elenca file in una cartella della KB (es. '10-entita', '_templates'). Vuoto = radice.",
    input_schema: { type: "object", properties: { cartella: { type: "string" } } },
  },
  {
    name: "kb_scadenze", description: "Scadenze e fine contratti nei prossimi N giorni.",
    input_schema: { type: "object", properties: { giorni: { type: "integer", default: 60 } } },
  },
  {
    name: "patch_proponi",
    description: "Propone modifiche alla KB (NON le applica). Salva patch in attesa e restituisce codice, diff, conflitti. Operazioni: set {file,campo,valore} | append {file,sezione,testo} | create {template,dir,id,campi,corpo}. Mostra all'utente riepilogo e codice, chiedi conferma.",
    input_schema: {
      type: "object",
      properties: {
        fonte: { type: "object", properties: { tipo: { type: "string" }, nome: { type: "string" }, data: { type: "string" }, rif: { type: "string" } }, required: ["tipo"] },
        operazioni: { type: "array", items: { type: "object" } },
      },
      required: ["fonte", "operazioni"],
    },
  },
  {
    name: "patch_applica",
    description: "Applica patch in attesa. Consentito SOLO se l'ultimo messaggio dell'utente contiene il codice patch (es. 'ok K3F9A'). force=true solo se utente conferma esplicitamente i conflitti.",
    input_schema: { type: "object", properties: { code: { type: "string" }, force: { type: "boolean" } }, required: ["code"] },
  },
  {
    name: "email_importa", description: "Importa ora da Gmail le email con l'etichetta configurata (incluse PEC inoltrate) e propone modifiche. Usa se la titolare chiede di controllare email/PEC.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "inbox_salva", description: "Salva testo grezzo ricevuto (email/nota commercialista) in 90-inbox per tracciabilità.",
    input_schema: { type: "object", properties: { titolo: { type: "string" }, testo: { type: "string" } }, required: ["titolo", "testo"] },
  },
];

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);

async function runTool(name: string, input: any, ctx: Ctx): Promise<string> {
  switch (name) {
    case "kb_cerca": return JSON.stringify(search(await loadAll(), input.query));
    case "kb_leggi": {
      const docs = await loadAll();
      const d = docs.find((x) => x.id === input.id || x.path === input.id);
      if (d) return `# ${d.path}\n${d.raw}`;
      try { return await readText(input.id); } catch { return `Non trovato: ${input.id}. Usa kb_cerca.`; }
    }
    case "kb_elenco": {
      const base = (input.cartella ?? "").replace(/\/$/, "");
      const out = [...(await index()).values()].filter((n) => n.path && n.path.split("/").slice(0, -1).join("/") === base)
        .map((n) => (isFolder(n) ? `📁 ${n.path}/` : n.path));
      return out.join("\n") || "(vuota)";
    }
    case "kb_scadenze": return JSON.stringify(scadenze(await loadAll(), input.giorni ?? 60));
    case "patch_proponi": {
      const p: Patch = { code: newCode(), stato: "pending", creato: new Date().toISOString(), da: ctx.who, fonte: input.fonte as Fonte, operazioni: input.operazioni as Op[] };
      const pv = await preview(p);
      if (pv.errors.length) return JSON.stringify({ ok: false, errors: pv.errors, nota: "Correggi la patch (self-annealing) e riproponi." });
      await savePatch(p);
      return JSON.stringify({ ok: true, code: p.code, files: pv.files, conflicts: pv.conflicts, diff: pv.diff.slice(0, 6000) });
    }
    case "patch_applica": {
      const code = String(input.code).toUpperCase();
      if (!ctx.userText.toUpperCase().includes(code)) return `Rifiutato: l'utente non ha confermato il codice ${code} nel suo ultimo messaggio. Chiedi "ok ${code}".`;
      const p = await loadPatch(code);
      if (!p || p.stato !== "pending") return `Patch ${code} non trovata o già gestita.`;
      return JSON.stringify(await apply(p, !!input.force));
    }
    case "email_importa": {
      if (ctx.channel === "email") return "Non disponibile durante l'import stesso.";
      const { importEmails } = await import("./gmail");
      const r = await importEmails(5);
      return r.length ? JSON.stringify(r) : "Nessuna email nuova.";
    }
    case "inbox_salva": {
      const path = `90-inbox/${today()}-${slug(input.titolo)}.md`;
      await writeText(path, `# ${input.titolo}\n\nRicevuto: ${new Date().toISOString()} da ${ctx.who}\n\n${input.testo}\n`);
      return `Salvato: ${path}`;
    }
  }
  return `Tool sconosciuto: ${name}`;
}

// ---------- prompt ----------
let sysCache: { at: number; text: string } | null = null;
/** AGENT.md può usare {{NOME}}: sostituito con l'identità fissa del progetto. */
async function systemPrompt(nome: string): Promise<string> {
  if (sysCache && Date.now() - sysCache.at < 300_000) return sysCache.text.replaceAll("{{NOME}}", nome);
  const read = (p: string) => readText(p).catch(() => "");
  const [agent, router, ingest, learn, onboarding] = await Promise.all([read("AGENT.md"), read("00-router/moduli.md"), read("directives/ingest-informazioni.md"), read("directives/apprendimento.md"), read("00-router/onboarding.md")]);
  // Le preferenze correnti vengono caricate a ogni richiesta, fuori dalla cache del prompt.
  const onb = split(onboarding).body.split(/^## Storico\s*$/m)[0];
  const text = `${agent}

# Router
${router}

# Directive: ingest
${ingest}

# Directive: apprendimento
${learn}

# Stato onboarding (se incompleto leggi directives/onboarding-intervista.md)
${onb}

# Scrittura KB
Nell'ambiente API NON esistono script Python: gli equivalenti sono i tool.
- execution/apply_patch.py dry-run → patch_proponi
- --apply → patch_applica (solo dopo "ok CODICE" dell'utente)
- Leggi sempre il file target (kb_leggi) prima di proporre set/append.
- Per create: usa kb_elenco _templates e rispetta CONVENTIONS.
Operazioni: {"op":"set","file":"id","campo":"regime","valore":"forfettario"} | {"op":"append","file":"id","sezione":"Dettagli","testo":"..."} | {"op":"create","template":"scadenza","dir":"40-scadenze/singole","id":"2026-11-16-f24-saldo","campi":{...},"corpo":"..."}`;
  sysCache = { at: Date.now(), text };
  return text.replaceAll("{{NOME}}", nome);
}

function attachmentBlocks(atts: Attachment[]): Anthropic.ContentBlockParam[] {
  const out: Anthropic.ContentBlockParam[] = [];
  for (const a of atts) {
    const b64 = a.data.toString("base64");
    if (isFattura(a.name, a.mime)) {
      const xml = extractXml(a.data);
      out.push({ type: "text", text: xml ? `Allegato ${a.name}:\n${summarize(xml)}\n\nXML:\n${xml.slice(0, 20_000)}` : `[Allegato ${a.name}: XML fattura non estraibile]` });
    } else if (a.mime === "application/pdf") out.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 }, title: a.name });
    else if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(a.mime))
      out.push({ type: "image", source: { type: "base64", media_type: a.mime as "image/jpeg", data: b64 } });
    else if (/spreadsheet|excel|csv/.test(a.mime) || /\.(xlsx|xls|csv)$/i.test(a.name)) {
      const wb = XLSX.read(a.data);
      const csv = wb.SheetNames.map((s) => `## Foglio ${s}\n${XLSX.utils.sheet_to_csv(wb.Sheets[s])}`).join("\n\n");
      out.push({ type: "text", text: `Allegato ${a.name}:\n${csv.slice(0, 100_000)}` });
    } else if (a.mime.startsWith("text/")) out.push({ type: "text", text: `Allegato ${a.name}:\n${a.data.toString("utf8").slice(0, 100_000)}` });
    else out.push({ type: "text", text: `[Allegato ${a.name} (${a.mime}) non leggibile: salvato su Drive]` });
  }
  return out;
}

const CHANNEL_NOTE: Record<Channel, string> = {
  telegram: " Rispondi in testo semplice, senza tabelle. Le patch richiedono sempre conferma con il codice.",
  whatsapp: " Rispondi breve, niente tabelle, max ~1200 caratteri salvo richiesta.",
  web: "",
  email: " Elaborazione automatica di email importata: nessuno legge in tempo reale. Proponi patch per i fatti rilevanti (patch_proponi), non applicarle. Chiudi con riepilogo di 2 righe e codici patch.",
  upload: " Documento caricato dalla titolare dalla pagina Carica. Estrai i dati, proponi patch (patch_proponi), non applicarle. Chiudi con riepilogo breve e codici patch.",
};

// ---------- loop ----------
export async function runAgent(opts: { key: string; who: string; channel: Channel; text: string; attachments?: Attachment[]; noHistory?: boolean }): Promise<string> {
  const issue = await agentIssue();
  if (issue) return issue;
  const anthropic = new Anthropic();
  const history = opts.noHistory ? [] : await loadHistory(opts.key);
  const ctx: Ctx = { userText: opts.text, channel: opts.channel, who: opts.who };
  const cfg = await settings();
  const profile = await profileContext().catch(() => "");
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: await systemPrompt(cfg.APP_NAME), cache_control: { type: "ephemeral" } },
    { type: "text", text: `Il tuo nome è ${cfg.APP_NAME}: presentati così anche se le istruzioni usano un altro nome. Oggi: ${today()} (Europe/Madrid). Canale: ${opts.channel}. Da: ${opts.who}.${CHANNEL_NOTE[opts.channel]}` },
  ];
  const messages: Anthropic.MessageParam[] = history.map((t) => ({ role: t.role, content: t.text }));
  if (profile) system.push({ type: "text", text: profile });
  const userContent: Anthropic.ContentBlockParam[] = [...attachmentBlocks(opts.attachments ?? []), { type: "text", text: opts.text || "(allegato senza testo)" }];
  messages.push({ role: "user", content: userContent });

  let final = "";
  for (let step = 0; step < 14; step++) {
    const res = await anthropic.messages.create({ model: cfg.ANTHROPIC_MODEL, max_tokens: 4096, system, tools, messages });
    messages.push({ role: "assistant", content: res.content });
    if (res.stop_reason === "pause_turn") continue;
    const uses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !uses.length) {
      final = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
      break;
    }
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const u of uses) {
      let out: string;
      try { out = await runTool(u.name, u.input, ctx); } catch (e: any) { out = `Errore tool: ${e?.message ?? e}`; }
      results.push({ type: "tool_result", tool_use_id: u.id, content: out.slice(0, 30_000) });
    }
    messages.push({ role: "user", content: results });
  }
  if (!final) final = "Non sono riuscito a completare. Riprova con richiesta più specifica.";
  const note = (opts.attachments ?? []).map((a) => `[allegato: ${a.name}]`).join(" ");
  if (!opts.noHistory) await appendHistory(opts.key, [
    { role: "user", text: `${note} ${opts.text}`.trim(), at: new Date().toISOString() },
    { role: "assistant", text: final, at: new Date().toISOString() },
  ]);
  return final;
}
