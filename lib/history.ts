import { randomUUID } from "node:crypto";
import { db } from "./db";
import { readText, index } from "./drive";
import { redactSensitive } from "./privacy";

export type Turn = { id?: number; role: "user" | "assistant"; text: string; at: string };
export type Conversation = { id: string; title: string; channel: string; archived: number; updated_at: string };
export const validConversation = (key: string) => /^[a-z0-9_-]{1,100}$/i.test(key);
const channelOf = (id: string) => id.startsWith("tg-") ? "telegram" : id.startsWith("wa-") ? "whatsapp" : id.startsWith("web") ? "web" : "altro";
async function database() { const c = await db(); if (!c) throw new Error("Collega Turso per salvare le conversazioni."); return c; }

export async function ensureConversation(key: string) {
  if (!validConversation(key)) throw new Error("Conversazione non valida.");
  const c = await database(), now = new Date().toISOString();
  await c.execute({ sql: "INSERT OR IGNORE INTO conversations(id,title,channel,created_at,updated_at) VALUES(?,?,?,?,?)", args: [key, "Nuova conversazione", channelOf(key), now, now] });
  return c;
}
export async function createConversation() { const id = `web-${randomUUID()}`; await ensureConversation(id); return id; }

/** Import legacy Drive history once, preserving the original file. */
async function migrate(key: string) {
  const c = await ensureConversation(key);
  if ((await c.execute({ sql: "SELECT migrated FROM conversations WHERE id=?", args: [key] })).rows[0]?.migrated) return;
  const path = `95-log/chat/${key}.json`;
  let legacy: Turn[] = [];
  try {
    if ((await index()).has(path)) {
      const parsed: unknown = JSON.parse(await readText(path));
      if (Array.isArray(parsed)) legacy = parsed.filter(t => ["user", "assistant"].includes(t?.role) && typeof t?.text === "string");
    }
  } catch { return; }
  const tx = await c.transaction("write");
  try {
    if (!(await tx.execute({ sql: "SELECT migrated FROM conversations WHERE id=?", args: [key] })).rows[0]?.migrated) {
      for (const t of legacy) await tx.execute({ sql: "INSERT INTO messages(conversation_id,role,text,created_at) VALUES(?,?,?,?)", args: [key, t.role, redactSensitive(t.text), t.at || new Date().toISOString()] });
      await tx.execute({ sql: "UPDATE conversations SET migrated=1 WHERE id=?", args: [key] });
    }
    await tx.commit();
  } finally { tx.close(); }
}

export async function loadHistory(key: string, limit = 30, before?: number): Promise<Turn[]> {
  await migrate(key);
  const c = await database();
  const rows = (await c.execute({ sql: `SELECT id,role,text,created_at FROM messages WHERE conversation_id=? ${before ? "AND id < ?" : ""} ORDER BY id DESC LIMIT ?`, args: before ? [key, before, Math.min(limit, 200)] : [key, Math.min(limit, 200)] })).rows;
  return rows.reverse().map(r => ({ id: Number(r.id), role: r.role as Turn["role"], text: String(r.text), at: String(r.created_at) }));
}
export async function appendHistory(key: string, turns: Turn[]) {
  await migrate(key);
  const c = await database(), now = new Date().toISOString();
  const title = redactSensitive(turns.find(t => t.role === "user")?.text ?? "Conversazione").replace(/\s+/g, " ").slice(0, 80);
  await c.batch([
    ...turns.map(t => ({ sql: "INSERT INTO messages(conversation_id,role,text,created_at) VALUES(?,?,?,?)", args: [key, t.role, redactSensitive(t.text), t.at] })),
    { sql: "UPDATE conversations SET title=CASE WHEN title='Nuova conversazione' THEN ? ELSE title END, updated_at=? WHERE id=?", args: [title, now, key] },
  ], "write");
}
export async function conversations(query = "", archived = false): Promise<Conversation[]> {
  const c = await database(), term = `%${query.slice(0, 100).replace(/[!%_]/g, "!$&")}%`;
  const rows = (await c.execute({ sql: "SELECT id,title,channel,archived,updated_at FROM conversations WHERE archived=? AND (title LIKE ? ESCAPE '!' OR id IN (SELECT conversation_id FROM messages WHERE text LIKE ? ESCAPE '!')) ORDER BY updated_at DESC LIMIT 100", args: [archived ? 1 : 0, term, term] })).rows;
  return rows.map(r => ({ id: String(r.id), title: String(r.title), channel: String(r.channel), archived: Number(r.archived), updated_at: String(r.updated_at) }));
}
export async function archiveConversation(id: string, archived: boolean) {
  const c = await database(); await c.execute({ sql: "UPDATE conversations SET archived=? WHERE id=?", args: [archived ? 1 : 0, id] });
}

export async function searchHistory(query: string) {
  if (query.trim().length < 3) throw new Error("Usa almeno tre caratteri per cercare nelle chat.");
  const c = await database(), term = `%${query.slice(0, 120).replace(/[!%_]/g, "!$&")}%`;
  const rows = (await c.execute({ sql: "SELECT m.conversation_id,m.role,m.text,m.created_at FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.archived=0 AND m.text LIKE ? ESCAPE '!' ORDER BY m.id DESC LIMIT 12", args: [term] })).rows;
  return rows.map(r => ({ conversation: r.conversation_id, role: r.role, text: String(r.text).slice(0, 2000), date: r.created_at }));
}
