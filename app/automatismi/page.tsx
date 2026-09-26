import Link from "next/link";
import { Shell } from "@/app/components/Shell";
import { overview, JOBS } from "@/lib/automations";
import { detail, DEFS, type Key } from "@/lib/config";
import { Campi, type Campo } from "@/app/setup/Campi";
import Controls from "./Controls";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export default async function Automations() {
  const d = await detail().catch(() => null), data = await overview().catch(() => null);
  const fields: Campo[] = (Object.keys(DEFS) as Key[]).filter(k => DEFS[k].group === "automatismi").map(k => ({ key: k, label: DEFS[k].label, value: d?.[k].value ?? DEFS[k].def, source: d?.[k].source ?? "default", ...("help" in DEFS[k] ? { help: String(DEFS[k].help) } : {}), ...(k.startsWith("AUTO_") && !["AUTO_CHANNEL", "AUTO_TIMEZONE"].includes(k) ? { options: [{ value: "off", label: "Disattivato" }, { value: "on", label: "Attivo" }] } : k === "AUTO_CHANNEL" ? { options: [{ value: "telegram", label: "Telegram" }, { value: "whatsapp", label: "WhatsApp" }, { value: "both", label: "Entrambi" }] } : {}) }));
  return <Shell><h1>Centro automatismi</h1><p className="sub">Controlli, riepiloghi e consegne. Gli interruttori regolano le esecuzioni pianificate; i pulsanti avviano una singola esecuzione manuale.</p>
    <p>Controllo giornaliero alle 06 UTC: 08 in estate e 07 in inverno per Roma e Madrid, con la tolleranza del piano Vercel. Le fasce silenziose rinviano gli avvisi alla prossima esecuzione utile. <Link href="/setup#telegram">Configura destinatari e collegamenti</Link>.</p>
    {!data && <p className="vuoto">Collega Turso per lo storico degli automatismi.</p>}
    <details className="passo"><summary>Orari, canali e interruttori</summary><Campi campi={fields} bloccato={!data} /></details>
    <div className="workflow-grid">{Object.entries(JOBS).map(([kind, label]) => {
      const last = data?.runs.find(r => r.kind === kind);
      return <article className="passo" key={kind}><h2>{label}</h2><p>{last ? `${last.status} · ${new Date(String(last.started_at)).toLocaleString("it-IT")}` : "Mai eseguito"}</p><p className="aiuto">{String(last?.summary || "")}</p><Controls kind={kind} label={kind === "delivery" ? "Consegna avvisi in coda" : ["briefing", "weekly", "reminders"].includes(kind) ? "Prepara avviso in coda" : "Esegui ora"} /></article>;
    })}</div>
    <h2>Coda consegne</h2><p>{data?.queue.map(r => `${r.status}: ${r.n}`).join(" · ") || "Nessun avviso in coda"}</p>
    <p className="aiuto">Tre tentativi al massimo. Una consegna rimasta «sending» dopo un’interruzione richiede verifica: non viene reinviata automaticamente, per evitare duplicati.</p>
    <h2>Backup</h2><p><a href="/api/backup/export">Scarica una copia completa verificata</a>. Include allegati, impostazioni non segrete, chat e registro automatismi.</p>
    <h2>Ultime esecuzioni</h2><div className="automation-history">{data?.runs.map(r => <p key={String(r.id)}><b>{JOBS[r.kind as keyof typeof JOBS] || String(r.kind)}</b> · {String(r.status)} · {String(r.summary)}</p>)}</div>
  </Shell>;
}
