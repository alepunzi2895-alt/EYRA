import { drive as driveApi, auth, drive_v3 } from "@googleapis/drive";
import { Readable } from "node:stream";
import fs from "node:fs/promises";
import nodePath from "node:path";
import { setting } from "./config";

/** Modalità locale per sviluppo/test: KB_LOCAL_DIR=./kb (nessuna chiamata a Google). */
const LOCAL = process.env.KB_LOCAL_DIR;

const FOLDER = "application/vnd.google-apps.folder";

export type Node = { id: string; name: string; path: string; mimeType: string; modifiedTime?: string };

export function googleAuth() {
  const o = new auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  o.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return o;
}

let client: drive_v3.Drive | null = null;
export function drive() {
  if (client) return client;
  client = driveApi({ version: "v3", auth: googleAuth() });
  return client;
}

async function rootId(): Promise<string> {
  const r = await setting("KB_ROOT_FOLDER_ID");
  if (!r) throw new Error("Cartella archivio non impostata: Setup → Crea archivio");
  return r;
}

// ---- indice path -> nodo (cache 60s per istanza) ----
let cache: { at: number; map: Map<string, Node> } | null = null;

async function listChildren(parent: string): Promise<drive_v3.Schema$File[]> {
  const out: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined;
  do {
    const r = await drive().files.list({
      q: `'${parent}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime)",
      pageSize: 1000,
      pageToken,
    });
    out.push(...(r.data.files ?? []));
    pageToken = r.data.nextPageToken ?? undefined;
  } while (pageToken);
  return out;
}

export async function index(force = false): Promise<Map<string, Node>> {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache.map;
  const map = new Map<string, Node>();
  if (LOCAL) {
    map.set("", { id: "local", name: "", path: "", mimeType: FOLDER });
    const walk = async (rel: string): Promise<void> => {
      for (const e of await fs.readdir(nodePath.join(LOCAL, rel), { withFileTypes: true })) {
        const p = rel ? `${rel}/${e.name}` : e.name;
        const st = await fs.stat(nodePath.join(LOCAL, p));
        map.set(p, { id: "local:" + p, name: e.name, path: p, mimeType: e.isDirectory() ? FOLDER : "text/plain", modifiedTime: st.mtime.toISOString() });
        if (e.isDirectory()) await walk(p);
      }
    };
    await walk("");
    cache = { at: Date.now(), map };
    return map;
  }
  const root = await rootId();
  map.set("", { id: root, name: "", path: "", mimeType: FOLDER });
  const walk = async (id: string, base: string): Promise<void> => {
    const kids = await listChildren(id);
    await Promise.all(
      kids.map(async (f) => {
        const path = base ? `${base}/${f.name}` : f.name!;
        map.set(path, { id: f.id!, name: f.name!, path, mimeType: f.mimeType!, modifiedTime: f.modifiedTime ?? undefined });
        if (f.mimeType === FOLDER) await walk(f.id!, path);
      })
    );
  };
  await walk(root, "");
  cache = { at: Date.now(), map };
  return map;
}

export const invalidate = () => { cache = null; };
export const isFolder = (n: Node) => n.mimeType === FOLDER;

export async function readText(path: string): Promise<string> {
  const n = (await index()).get(path);
  if (!n) throw new Error(`File non trovato: ${path}`);
  if (LOCAL) return fs.readFile(nodePath.join(LOCAL, path), "utf8");
  const r = await drive().files.get({ fileId: n.id, alt: "media" }, { responseType: "text" });
  return r.data as unknown as string;
}

async function ensureFolder(path: string): Promise<string> {
  const map = await index();
  const found = map.get(path);
  if (found) return found.id;
  const parts = path.split("/");
  const parent = await ensureFolder(parts.slice(0, -1).join("/"));
  const r = await drive().files.create({
    requestBody: { name: parts.at(-1), mimeType: FOLDER, parents: [parent] },
    fields: "id",
  });
  map.set(path, { id: r.data.id!, name: parts.at(-1)!, path, mimeType: FOLDER });
  return r.data.id!;
}

/** Crea o aggiorna file di testo (update conserva revisioni Drive). */
export async function writeText(path: string, content: string, mimeType = "text/markdown"): Promise<void> {
  if (LOCAL) { await fs.mkdir(nodePath.dirname(nodePath.join(LOCAL, path)), { recursive: true }); await fs.writeFile(nodePath.join(LOCAL, path), content); invalidate(); return; }
  const map = await index();
  const existing = map.get(path);
  const media = { mimeType, body: Readable.from([content]) };
  if (existing) {
    await drive().files.update({ fileId: existing.id, media });
    return;
  }
  const parts = path.split("/");
  const parent = await ensureFolder(parts.slice(0, -1).join("/"));
  const r = await drive().files.create({
    requestBody: { name: parts.at(-1), parents: [parent], mimeType },
    media,
    fields: "id",
  });
  map.set(path, { id: r.data.id!, name: parts.at(-1)!, path, mimeType });
}

export async function writeBinary(path: string, data: Buffer, mimeType: string): Promise<string> {
  if (LOCAL) { await fs.mkdir(nodePath.dirname(nodePath.join(LOCAL, path)), { recursive: true }); await fs.writeFile(nodePath.join(LOCAL, path), data); invalidate(); return path; }
  const parts = path.split("/");
  const parent = await ensureFolder(parts.slice(0, -1).join("/"));
  const r = await drive().files.create({
    requestBody: { name: parts.at(-1), parents: [parent] },
    media: { mimeType, body: Readable.from([data]) },
    fields: "id, webViewLink",
  });
  invalidate();
  return r.data.webViewLink ?? r.data.id!;
}

export async function move(from: string, to: string): Promise<void> {
  if (LOCAL) { await fs.mkdir(nodePath.dirname(nodePath.join(LOCAL, to)), { recursive: true }); await fs.rename(nodePath.join(LOCAL, from), nodePath.join(LOCAL, to)); invalidate(); return; }
  const map = await index();
  const n = map.get(from);
  if (!n) throw new Error(`File non trovato: ${from}`);
  const parts = to.split("/");
  const newParent = await ensureFolder(parts.slice(0, -1).join("/"));
  const cur = await drive().files.get({ fileId: n.id, fields: "parents" });
  await drive().files.update({
    fileId: n.id,
    addParents: newParent,
    removeParents: (cur.data.parents ?? []).join(","),
    requestBody: { name: parts.at(-1) },
  });
  invalidate();
}

export async function trash(path: string): Promise<void> {
  const n = (await index()).get(path);
  if (!n) return;
  if (LOCAL) { await fs.rm(nodePath.join(LOCAL, path), { recursive: true, force: true }); invalidate(); return; }
  await drive().files.update({ fileId: n.id, requestBody: { trashed: true } });
  invalidate();
}

export async function readBinary(path: string): Promise<Buffer> {
  const n = (await index()).get(path);
  if (!n) throw new Error(`File non trovato: ${path}`);
  if (LOCAL) return fs.readFile(nodePath.join(LOCAL, path));
  const r = await drive().files.get({ fileId: n.id, alt: "media" }, { responseType: "arraybuffer" });
  return Buffer.from(r.data as ArrayBuffer);
}
