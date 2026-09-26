import { db } from "./db";
export async function claimWebhook(id: string) {
  const c = await db(); if (!c) throw new Error("Database necessario per ricevere allegati in sicurezza.");
  return !!(await c.execute({ sql: "INSERT OR IGNORE INTO webhook_events(id,status,updated_at) VALUES(?,'processing',?)", args: [id, new Date().toISOString()] })).rowsAffected;
}
export async function finishWebhook(id: string, status: "done" | "error") {
  const c = await db(); if (c) await c.execute({ sql: "UPDATE webhook_events SET status=?,updated_at=? WHERE id=?", args: [status, new Date().toISOString(), id] });
}
