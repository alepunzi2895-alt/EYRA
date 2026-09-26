import { createClient, Client } from "@libsql/client";

/**
 * Turso (libSQL). Credenziali solo in env: TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
 * Senza URL il DB è assente: l'app mostra la configurazione come non disponibile.
 */
let client: Client | null = null;
let ready: Promise<void> | null = null;

export const dbConfigured = () => !!process.env.TURSO_DATABASE_URL && !!process.env.TURSO_AUTH_TOKEN;
export const dbKind = (): "turso" | "assente" => dbConfigured() ? "turso" : "assente";

export async function db(): Promise<Client | null> {
  if (!dbConfigured()) return null;
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL!;
    if (!url.startsWith("libsql://")) throw new Error("TURSO_DATABASE_URL deve iniziare con libsql://");
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN! });
  }
  ready ??= client.batch([
    "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT)",
    "CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT NOT NULL, channel TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0, migrated INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL, role TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL)",
    "CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation_id, id)",
    "CREATE TABLE IF NOT EXISTS automation_runs (id TEXT PRIMARY KEY, kind TEXT NOT NULL, period TEXT NOT NULL, status TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '', started_at TEXT NOT NULL, finished_at TEXT, UNIQUE(kind, period))",
    "CREATE TABLE IF NOT EXISTS deliveries (id TEXT PRIMARY KEY, channel TEXT NOT NULL, recipient TEXT NOT NULL, text TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS webhook_events (id TEXT PRIMARY KEY, status TEXT NOT NULL, updated_at TEXT NOT NULL)",
  ], "write").then(() => undefined).catch((e) => { ready = null; throw e; });
  await ready;
  return client;
}

/** Chiude la connessione (serve nei test: su Windows il file resta bloccato). */
export function closeDb() {
  client?.close();
  client = null; ready = null;
}
