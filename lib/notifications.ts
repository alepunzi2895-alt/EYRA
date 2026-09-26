import { createHash } from "node:crypto";
import { db } from "./db";
import { settings, list, type Settings } from "./config";
import { sendTelegramText } from "./telegram";
import { sendTemplate } from "./whatsapp";
import { oneLine } from "./reminders";
import { redactSensitive } from "./privacy";

export function quietNow(cfg: Pick<Settings, "AUTO_TIMEZONE" | "QUIET_START" | "QUIET_END">, now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: cfg.AUTO_TIMEZONE, hour: "numeric", hourCycle: "h23" }).format(now));
  const start = +cfg.QUIET_START, end = +cfg.QUIET_END;
  return start !== end && (start < end ? hour >= start && hour < end : hour >= start || hour < end);
}
export async function enqueueNotification(key: string, text: string) {
  const cfg = await settings(), c = await db();
  if (!c) throw new Error("Database necessario per gli avvisi.");
  const recipients: { channel: string; id: string }[] = [];
  if (["telegram", "both"].includes(cfg.AUTO_CHANNEL)) for (const id of list(cfg.TELEGRAM_DIGEST_CHAT_IDS || cfg.TELEGRAM_ALLOWED_CHAT_IDS)) {
    if (list(cfg.TELEGRAM_ALLOWED_CHAT_IDS).includes(id)) recipients.push({ channel: "telegram", id });
  }
  if (["whatsapp", "both"].includes(cfg.AUTO_CHANNEL)) for (const id of list(cfg.WA_DIGEST_NUMBERS || cfg.WA_ALLOWED_NUMBERS)) {
    if (list(cfg.WA_ALLOWED_NUMBERS).includes(id)) recipients.push({ channel: "whatsapp", id });
  }
  if (!recipients.length) throw new Error("Configura almeno un destinatario autorizzato per gli automatismi.");
  for (const target of recipients) {
    const id = createHash("sha256").update(`${key}:${target.channel}:${target.id}`).digest("hex");
    await c.execute({ sql: "INSERT OR IGNORE INTO deliveries(id,channel,recipient,text,updated_at) VALUES(?,?,?,?,?)", args: [id, target.channel, target.id, redactSensitive(text).slice(0, 12000), new Date().toISOString()] });
  }
  return `${recipients.length} avvisi accodati`;
}
export async function dispatchNotifications() {
  if (process.env.KB_LOCAL_DIR) return "Demo: nessun avviso inviato";
  const cfg = await settings(), c = await db();
  if (!c) throw new Error("Database non collegato.");
  if (quietNow(cfg)) return "Fascia silenziosa: avvisi conservati in coda";
  const rows = (await c.execute("SELECT * FROM deliveries WHERE status='pending' AND attempts<3 ORDER BY updated_at LIMIT 40")).rows;
  let sent = 0, failed = 0;
  for (const row of rows) {
    const allowed = row.channel === "telegram" ? list(cfg.TELEGRAM_ALLOWED_CHAT_IDS) : list(cfg.WA_ALLOWED_NUMBERS);
    const now = new Date().toISOString();
    if (!allowed.includes(String(row.recipient))) { await c.execute({ sql: "UPDATE deliveries SET status='cancelled',updated_at=? WHERE id=?", args: [now, row.id] }); continue; }
    const lock = await c.execute({ sql: "UPDATE deliveries SET status='sending',attempts=attempts+1,updated_at=? WHERE id=? AND status='pending'", args: [now, row.id] });
    if (!lock.rowsAffected) continue;
    try {
      if (row.channel === "telegram") await sendTelegramText(Number(row.recipient), String(row.text));
      else if (await sendTemplate(String(row.recipient), cfg.WA_TEMPLATE_AVVISO, [oneLine(String(row.text))])) throw new Error("Invio WhatsApp non riuscito");
      await c.execute({ sql: "UPDATE deliveries SET status='sent',updated_at=? WHERE id=?", args: [new Date().toISOString(), row.id] }); sent++;
    } catch { await c.execute({ sql: "UPDATE deliveries SET status='pending',updated_at=? WHERE id=?", args: [new Date().toISOString(), row.id] }); failed++; }
  }
  if (failed) throw new Error(`${sent} avvisi inviati, ${failed} non consegnati; ritentativo alla prossima esecuzione (max 3).`);
  return `${sent} avvisi inviati`;
}
