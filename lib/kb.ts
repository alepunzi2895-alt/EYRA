import yaml from "js-yaml";
import { index, readText, isFolder } from "./drive";

export type FM = Record<string, any>;
export type Doc = { path: string; id: string; fm: FM | null; body: string; raw: string; modifiedTime?: string };

const SKIP = ["_templates/", "_backup/", "90-inbox/", "95-log/"];
const META = new Set(["README.md", "CONVENTIONS.md", "AGENT.md"]);
const REQ = ["id", "tipo", "titolo", "stato", "aggiornato", "validato"];
export const TIPI = new Set(["entita", "immobile", "barca", "contratto", "scadenza", "decisione", "procedura", "modulo", "fonte", "documento"]);
const LINK = /\[\[([^\]|#]+)/g;

export function split(raw: string): { fm: FM | null; body: string } {
  if (!raw.startsWith("---")) return { fm: null, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return { fm: null, body: raw };
  const fm = (yaml.load(raw.slice(3, end)) as FM) ?? {};
  return { fm, body: raw.slice(end + 4) };
}

export function iso(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

let cache: { at: number; docs: Doc[] } | null = null;
export const invalidateDocs = () => { cache = null; };

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

export async function loadAll(force = false): Promise<Doc[]> {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache.docs;
  const map = await index(force);
  const nodes = [...map.values()].filter(
    (n) => !isFolder(n) && n.path.endsWith(".md") && !SKIP.some((s) => n.path.startsWith(s)) && !META.has(n.path.split("/").at(-1)!)
  );
  const docs = await pool(nodes, 8, async (n) => {
    const raw = await readText(n.path);
    let fm: FM | null = null, body = raw;
    try { ({ fm, body } = split(raw)); } catch { fm = null; }
    return { path: n.path, id: n.name.replace(/\.md$/, ""), fm, body, raw, modifiedTime: n.modifiedTime };
  });
  cache = { at: Date.now(), docs };
  return docs;
}

export async function byId(id: string): Promise<Doc | undefined> {
  return (await loadAll()).find((d) => d.id === id);
}

export function validate(docs: Doc[]): string[] {
  const errs: string[] = [];
  const ids = new Set(docs.map((d) => d.id).concat(["moduli"]));
  for (const d of docs) {
    if (!d.fm) { errs.push(`${d.path}: frontmatter mancante o YAML non valido`); continue; }
    for (const k of REQ) if (!(k in d.fm)) errs.push(`${d.path}: manca '${k}'`);
    if (d.fm.id !== d.id) errs.push(`${d.path}: id '${d.fm.id}' ≠ nome file`);
    if (!TIPI.has(d.fm.tipo)) errs.push(`${d.path}: tipo '${d.fm.tipo}' non valido`);
    const refs = [...d.body.matchAll(LINK)].map((m) => m[1].trim()).concat((d.fm.entita ?? []).filter(Boolean));
    for (const r of refs) if (!ids.has(r)) errs.push(`${d.path}: link rotto [[${r}]]`);
  }
  return errs;
}

// ---- scadenze ----
export type Scad = { data: string; titolo: string; entita: string[]; responsabile: string; validato: boolean; id: string; preavviso: number; tipo: "scadenza" | "fine-contratto" };

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
function shift(d: Date, on: boolean) {
  if (on) while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

export function occorrenze(fm: FM, start: string, end: string): string[] {
  const out: string[] = [];
  const single = iso(fm.data);
  if (single) out.push(single);
  const r = fm.ricorrenza ?? {};
  const sw = !!r.slitta_weekend;
  const y0 = +start.slice(0, 4), y1 = +end.slice(0, 4);
  for (let y = y0; y <= y1; y++) {
    for (const md of r.annuale ?? []) {
      const [m, g] = String(md).split("-").map(Number);
      const d = new Date(Date.UTC(y, m - 1, g));
      if (d.getUTCMonth() === m - 1) out.push(ymd(shift(d, sw)));
    }
    if (r.mensile) for (let m = 0; m < 12; m++) {
      const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      out.push(ymd(shift(new Date(Date.UTC(y, m, Math.min(+r.mensile, last))), sw)));
    }
  }
  return [...new Set(out)].filter((d) => d >= start && d <= end).sort();
}

export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}
export function addDays(s: string, n: number): string {
  const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return ymd(d);
}

export function scadenze(docs: Doc[], giorni = 60, from = today()): Scad[] {
  const end = addDays(from, giorni);
  const rows: Scad[] = [];
  for (const d of docs) {
    const fm = d.fm;
    if (!fm || fm.stato !== "attivo") continue;
    const base = { entita: fm.entita ?? [], responsabile: fm.responsabile ?? "", validato: !!fm.validato, id: d.id, preavviso: +(fm.preavviso_gg ?? 15) };
    if (fm.tipo === "contratto") {
      const f = iso(fm.fine);
      if (f && f >= from && f <= addDays(from, Math.max(giorni, 90))) rows.push({ ...base, data: f, titolo: `Fine contratto: ${fm.titolo}`, tipo: "fine-contratto", preavviso: 90 });
    } else if (fm.tipo === "scadenza") {
      for (const data of occorrenze(fm, from, end)) rows.push({ ...base, data, titolo: fm.titolo, tipo: "scadenza" });
    }
  }
  return rows.sort((a, b) => a.data.localeCompare(b.data));
}

export function search(docs: Doc[], q: string, limit = 10) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return docs
    .map((d) => {
      const hay = (d.id + " " + (d.fm?.titolo ?? "") + " " + d.raw).toLowerCase();
      const score = terms.reduce((s, t) => s + (hay.split(t).length - 1) + ((d.fm?.titolo ?? "").toLowerCase().includes(t) ? 5 : 0), 0);
      return { d, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ d }) => ({ id: d.id, path: d.path, titolo: d.fm?.titolo ?? d.id, tipo: d.fm?.tipo }));
}
