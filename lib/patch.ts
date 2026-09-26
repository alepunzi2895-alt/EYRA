import yaml from "js-yaml";
import { createTwoFilesPatch } from "diff";
import { readText, writeText, index, move } from "./drive";
import { loadAll, split, validate, invalidateDocs, today, FM } from "./kb";

export type Op =
  | { op: "set"; file: string; campo: string; valore: unknown }
  | { op: "append"; file: string; sezione: string; testo: string }
  | { op: "create"; template: string; dir: string; id: string; campi?: FM; corpo?: string };

export type Fonte = { tipo: string; nome?: string; data?: string; rif?: string };
export type Patch = { code: string; stato: "pending" | "applied" | "rejected"; creato: string; da: string; fonte: Fonte; operazioni: Op[] };
export type Preview = { diff: string; conflicts: string[]; errors: string[]; files: string[] };

const norm = (v: unknown): unknown =>
  v instanceof Date ? v.toISOString().slice(0, 10)
  : Array.isArray(v) ? v.map(norm)
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, norm(x)]))
  : v;

export function serialize(fm: FM, body: string): string {
  const lines: string[] = [];
  for (const [k, raw] of Object.entries(fm)) {
    const v = norm(raw);
    if (Array.isArray(v)) lines.push(`${k}: ${yaml.dump(v, { flowLevel: 0, lineWidth: -1 }).trim()}`);
    else if (v && typeof v === "object")
      lines.push(`${k}:\n` + yaml.dump(v, { flowLevel: 1, lineWidth: -1 }).trimEnd().split("\n").map((l) => "  " + l).join("\n"));
    else if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) lines.push(`${k}: ${v}`);
    else lines.push(yaml.dump({ [k]: v }, { lineWidth: -1 }).trim());
  }
  return `---\n${lines.join("\n")}\n---${body.startsWith("\n") ? "" : "\n"}${body}`;
}

function get(fm: FM, key: string) {
  return key.split(".").reduce<any>((c, k) => (c && typeof c === "object" ? c[k] : undefined), fm);
}
function put(fm: FM, key: string, val: unknown) {
  const ks = key.split("."); let c = fm;
  for (const k of ks.slice(0, -1)) c = c[k] ??= {};
  c[ks.at(-1)!] = val;
}
export function addLine(body: string, section: string, line: string): string {
  const lines = body.split("\n"); const head = `## ${section}`;
  const i = lines.findIndex((l) => l.trim() === head);
  if (i < 0) return body.replace(/\n*$/, "") + `\n\n${head}\n${line}\n`;
  let j = i + 1; while (j < lines.length && !lines[j].startsWith("## ")) j++;
  let k = j; while (k > i + 1 && lines[k - 1].trim() === "") k--;
  lines.splice(k, 0, line);
  return lines.join("\n");
}

const tagOf = (f: Fonte) => `${f.tipo}${f.nome ? " " + f.nome : ""}, ${f.data ?? today()}`;
const same = (a: unknown, b: unknown) => JSON.stringify(norm(a)) === JSON.stringify(norm(b));

type Pending = Map<string, { path: string; fm: FM; body: string; old: string }>;

async function compute(p: Patch, force: boolean): Promise<{ pending: Pending; conflicts: string[]; errors: string[]; log: string[] }> {
  const docs = await loadAll(true);
  const byId = new Map(docs.map((d) => [d.id, d]));
  const pending: Pending = new Map(); const conflicts: string[] = []; const errors: string[] = []; const log: string[] = [];
  const tag = tagOf(p.fonte); const T = today();
  const load = (id: string) => {
    if (pending.has(id)) return pending.get(id)!;
    const d = byId.get(id);
    if (!d || !d.fm) { errors.push(`file '${id}' non trovato o senza frontmatter`); return null; }
    const e = { path: d.path, fm: structuredClone(d.fm), body: d.body, old: d.raw };
    pending.set(id, e); return e;
  };
  p.operazioni.forEach((op, n) => {
    const N = n + 1;
    if (op.op === "set") {
      const e = load(op.file); if (!e) return;
      const old = get(e.fm, op.campo);
      if (same(old, op.valore)) return;
      if (!(old === undefined || old === null || old === "" || (Array.isArray(old) && !old.length)) && !force) {
        conflicts.push(`[${N}] ${op.file}.${op.campo}: ${JSON.stringify(norm(old))} → ${JSON.stringify(op.valore)}`); return;
      }
      put(e.fm, op.campo, op.valore);
      (e.fm.fonti_campi ??= {})[op.campo] = tag;
      e.body = addLine(e.body, "Storico", `- ${T} — ${op.campo}: ${JSON.stringify(norm(old) ?? null)} → ${JSON.stringify(op.valore)} (${tag})`);
      log.push(`set ${op.file}.${op.campo}`);
    } else if (op.op === "append") {
      const e = load(op.file); if (!e) return;
      e.body = addLine(addLine(e.body, op.sezione, `- ${op.testo} (${tag})`), "Storico", `- ${T} — aggiunto a ${op.sezione} (${tag})`);
      log.push(`append ${op.file}#${op.sezione}`);
    } else if (op.op === "create") {
      if (byId.has(op.id) || pending.has(op.id)) { errors.push(`[${N}] id '${op.id}' esiste già`); return; }
      if (!/^[a-z0-9-]+$/.test(op.id)) { errors.push(`[${N}] id '${op.id}' non kebab-case`); return; }
      pending.set(op.id, { path: `${op.dir.replace(/\/$/, "")}/${op.id}.md`, fm: {}, body: "", old: "" });
      log.push(`create ${op.dir}/${op.id}.md`);
    } else errors.push(`[${N}] operazione sconosciuta`);
  });
  // template dei create (async)
  for (const op of p.operazioni) if (op.op === "create" && pending.get(op.id)?.old === "" && !Object.keys(pending.get(op.id)!.fm).length) {
    try {
      const { fm, body } = split(await readText(`_templates/${op.template}.md`));
      const e = pending.get(op.id)!;
      e.fm = { ...(fm ?? {}), id: op.id, ...(op.campi ?? {}) };
      e.fm.fonti_campi = Object.fromEntries(Object.keys(op.campi ?? {}).map((k) => [k, tag]));
      let b = body;
      if (op.corpo) b = addLine(b, ["Dettagli", "Cosa fare", "Note"].find((s) => b.includes(`## ${s}`)) ?? "Dettagli", `- ${op.corpo} (${tag})`);
      e.body = addLine(b, "Storico", `- ${T} — creato (${tag})`);
    } catch { errors.push(`template '${op.template}' non trovato`); pending.delete(op.id); }
  }
  for (const e of pending.values()) e.fm.aggiornato = T;
  return { pending, conflicts, errors, log };
}

export async function preview(p: Patch, force = false): Promise<Preview> {
  const { pending, conflicts, errors } = await compute(p, force);
  const diff = [...pending.values()].map((e) => createTwoFilesPatch(e.path, e.path, e.old, serialize(e.fm, e.body), "", "", { context: 1 })).join("\n");
  return { diff, conflicts, errors, files: [...pending.values()].map((e) => e.path) };
}

export async function apply(p: Patch, force = false): Promise<{ files: string[]; conflicts: string[]; errors: string[]; validazione: string[] }> {
  const { pending, conflicts, errors, log } = await compute(p, force);
  if (errors.length) return { files: [], conflicts, errors, validazione: [] };
  for (const e of pending.values()) await writeText(e.path, serialize(e.fm, e.body));
  const ch = "95-log/changelog.md";
  const prev = (await index()).has(ch) ? await readText(ch) : "# Changelog KB\n";
  await writeText(ch, prev + `\n## ${today()} — ${tagOf(p.fonte)} — ${p.fonte.rif ?? ""} (patch ${p.code}, da ${p.da})\n` + log.map((l) => `- ${l}`).join("\n") + (conflicts.length ? `\n- conflitti non applicati: ${conflicts.length}` : "") + "\n");
  await savePatch({ ...p, stato: "applied" });
  await move(`90-inbox/patch-${p.code}.json`, `90-inbox/processati/patch-${p.code}.json`).catch(() => {});
  invalidateDocs();
  const validazione = validate(await loadAll(true));
  return { files: [...pending.values()].map((e) => e.path), conflicts, errors, validazione };
}

// ---- storage patch su Drive ----
export const newCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();
export async function savePatch(p: Patch) {
  const path = (await index()).has(`90-inbox/processati/patch-${p.code}.json`) ? `90-inbox/processati/patch-${p.code}.json` : `90-inbox/patch-${p.code}.json`;
  await writeText(path, JSON.stringify(p, null, 2), "application/json");
}
export async function loadPatch(code: string): Promise<Patch | null> {
  try { return JSON.parse(await readText(`90-inbox/patch-${code.toUpperCase()}.json`)); } catch { return null; }
}
export async function pendingPatches(): Promise<Patch[]> {
  const map = await index(true);
  const paths = [...map.keys()].filter((k) => /^90-inbox\/patch-[A-Z0-9]+\.json$/.test(k));
  const all = await Promise.all(paths.map(async (k) => JSON.parse(await readText(k)) as Patch));
  return all.filter((p) => p.stato === "pending").sort((a, b) => b.creato.localeCompare(a.creato));
}
export async function reject(code: string) {
  const p = await loadPatch(code); if (!p) return;
  await savePatch({ ...p, stato: "rejected" });
  await move(`90-inbox/patch-${p.code}.json`, `90-inbox/processati/patch-${p.code}.json`);
}
