import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { createHash } from "node:crypto";
import { index, isFolder, readBinary, writeBinary, trash } from "./drive";
import { db } from "./db";
import { KEYS } from "./config";

const KEEP = 8;

const MAX_BYTES = 100 * 1024 * 1024;
const hash = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
const safePath = (path: string) => !path.startsWith("/") && !path.includes("\\") && !path.split("/").includes("..") && !path.includes(":");

export function verifyBackup(data: Uint8Array) {
  let total = 0;
  const restored = unzipSync(data, { filter: file => {
    total += file.originalSize;
    if (!safePath(file.name) || total > MAX_BYTES) throw new Error("Archivio non sicuro o troppo grande.");
    return true;
  } });
  const manifest = JSON.parse(strFromU8(restored["manifest.json"] || new Uint8Array())) as { version: number; files: Record<string, string> };
  if (manifest.version !== 1 || !manifest.files || typeof manifest.files !== "object") throw new Error("Manifest backup non valido.");
  if (Object.keys(restored).length !== Object.keys(manifest.files).length + 1) throw new Error("Backup incompleto.");
  for (const [name, checksum] of Object.entries(manifest.files)) if (!restored[name] || hash(restored[name]) !== checksum) throw new Error("Verifica ripristino non riuscita.");
  return Object.keys(manifest.files).length;
}

/** Complete, bounded export. Restore test is performed in memory, never over the live archive. */
export async function buildBackup() {
  const map = await index(true);
  const files: Record<string, Uint8Array> = {};
  let size = 0;
  for (const n of map.values()) {
    if (isFolder(n) || n.path.startsWith("_backup/")) continue;
    if (!safePath(n.path)) throw new Error("Percorso archivio non valido.");
    const data = await readBinary(n.path); size += data.length;
    if (size > MAX_BYTES - 5 * 1024 * 1024) throw new Error("Archivio oltre 95 MB: serve un backup a flusso. Nessun backup parziale salvato.");
    files[`archive/${n.path}`] = data;
  }
  const c = await db();
  if (!c) throw new Error("Database non disponibile: backup completo interrotto.");
  const snapshot = await c.transaction("read");
  try {
  for (const table of ["settings", "conversations", "messages", "automation_runs", "deliveries", "webhook_events"]) {
    let rows = (await snapshot.execute(`SELECT * FROM ${table}`)).rows;
    if (table === "settings") rows = rows.filter(r => KEYS.includes(String(r.key) as typeof KEYS[number]));
    files[`database/${table}.json`] = strToU8(JSON.stringify(rows, (_, v) => typeof v === "bigint" ? String(v) : v));
  }
  await snapshot.commit();
  } finally { snapshot.close(); }
  if (Object.values(files).reduce((sum,f) => sum + f.length, 0) > MAX_BYTES - 1024 * 1024) throw new Error("Backup oltre il limite di 100 MB.");
  files["manifest.json"] = strToU8(JSON.stringify({ version: 1, created: new Date().toISOString(), files: Object.fromEntries(Object.entries(files).map(([name,data]) => [name,hash(data)])) }));
  const data = zipSync(files, { level: 6 });
  const count = verifyBackup(data);
  return { data, count, name: `eyra-completo-${new Date().toISOString().replace(/[:.]/g, "-")}.zip` };
}

export async function backup(): Promise<string> {
  if (process.env.KB_LOCAL_DIR) return "Demo: backup su archivio disattivato. Usa lo scaricamento per verificare una copia senza scrivere nel repository.";
  const { data, count, name } = await buildBackup();
  const path = `_backup/${name}`;
  await writeBinary(path, Buffer.from(data), "application/zip");
  let mirror = "Copia separata non configurata: puoi scaricare il backup dal sito.";
  if (!process.env.KB_LOCAL_DIR && process.env.BACKUP_MIRROR_URL) {
    try {
      const url = new URL(process.env.BACKUP_MIRROR_URL);
      if (url.protocol !== "https:" || !process.env.BACKUP_MIRROR_TOKEN) throw new Error();
      const response = await fetch(url, { method: "PUT", redirect: "error", headers: { Authorization: `Bearer ${process.env.BACKUP_MIRROR_TOKEN}`, "Content-Type": "application/zip", "X-Backup-Name": name }, body: new Uint8Array(data), signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error();
      mirror = "Copia separata consegnata.";
    } catch { throw new Error("Backup Drive riuscito e verificato, ma copia separata non consegnata. Controlla endpoint e token."); }
  }
  const old = [...(await index(true)).keys()].filter(k => /^_backup\/eyra-completo-.*\.zip$/.test(k)).sort().slice(0, -KEEP);
  for (const k of old) await trash(k);
  return `${path} · ${count} file · verifica ripristino superata. ${mirror}`;
}
