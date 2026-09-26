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
  ], "write").then(() => undefined).catch((e) => { ready = null; throw e; });
  await ready;
  return client;
}

/** Chiude la connessione (serve nei test: su Windows il file resta bloccato). */
export function closeDb() {
  client?.close();
  client = null; ready = null;
}
