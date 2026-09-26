import { randomUUID } from "node:crypto";
import { db } from "./db";
import { settings } from "./config";
import { loadAll, scadenze, today, addDays } from "./kb";
import { pendingPatches } from "./patch";
import { tasks } from "./workflows";
import { enqueueNotification, dispatchNotifications } from "./notifications";
import { calendarEvents, dailyCalendarSync } from "./calendar";
import { importEmails } from "./gmail";
import { backup } from "./backup";
import { dueReminders } from "./reminders";
import { redactSensitive } from "./privacy";

export const JOBS = { briefing: "Briefing del mattino", weekly: "Riepilogo settimanale", reminders: "Scadenze e attività", calendar: "Google Calendar", email: "Import Gmail", backup: "Backup completo", delivery: "Consegna avvisi" } as const;
export type Job = keyof typeof JOBS;
export async function overview() {
  const c = await db(); if (!c) throw new Error("Collega Turso per il centro automatismi.");
  return { runs: (await c.execute("SELECT * FROM automation_runs ORDER BY started_at DESC LIMIT 60")).rows, queue: (await c.execute("SELECT status,count(*) AS n FROM deliveries GROUP BY status")).rows };
}
export async function brief(weekly = false) {
  const cfg = await settings(), date = today();
  const [docs, work, pending] = await Promise.all([loadAll(), tasks(), pendingPatches()]);
  const due = scadenze(docs, weekly ? 7 : 1).filter(r => r.validato && r.data <= addDays(date, weekly ? 7 : 0));
  const open = work.filter(t => t.status !== "done").sort((a,b) => (a.date || "9999").localeCompare(b.date || "9999"));
  let appointments = "Calendar non attivo";
  if (cfg.GOOGLE_CALENDAR_MODE !== "off") {
    try { const cal = await calendarEvents(weekly ? 7 : 1); appointments = cal.events.slice(0, 8).map(e => `${e.start?.dateTime || e.start?.date}: ${e.summary || "Appuntamento"}`).join("\n") || "Nessun appuntamento"; }
    catch { appointments = "Calendar non raggiungibile: verifica il collegamento"; }
  }
  const completed = work.filter(t => t.completed >= addDays(date, -7) && t.completed <= date && t.status === "done");
  return `${cfg.APP_NAME} · ${weekly ? "Riepilogo settimanale" : "Briefing"} · ${date}\n\nAppuntamenti\n${appointments}\n\nScadenze confermate\n${due.slice(0, 12).map(r => `${r.data}: ${r.titolo}`).join("\n") || "Nessuna"}\n\n${weekly ? `Completate nella settimana: ${completed.length}\n` : ""}Priorità suggerite dalle date\n${open.slice(0, 3).map(t => `${t.title}: ${t.next || "definire il prossimo passo"}${t.date ? ` (${t.date})` : ""}`).join("\n") || "Nessuna attività aperta"}\n\n${pending.length} proposte da approvare. ${open.filter(t => t.status === "waiting").length} pratiche in attesa.`;
}
async function execute(kind: Job, key: string): Promise<string> {
  if (kind === "delivery") return dispatchNotifications();
  if (kind === "calendar") return JSON.stringify(await dailyCalendarSync());
  if (kind === "backup") return backup();
  if (kind === "email") { const r = await importEmails(); if (r.length) await enqueueNotification(key, `${r.length} email importate. Rivedi le proposte in Da approvare.`); return `${r.length} email importate`; }
  if (kind === "briefing" || kind === "weekly") return enqueueNotification(key, await brief(kind === "weekly"));
  const [due, work] = await Promise.all([dueReminders(), tasks()]);
  const stalled = work.filter(t => t.kind === "task" && t.status !== "done" && t.date && t.date <= today());
  if (!due.length && !stalled.length) return "Nessuna scadenza o attività da segnalare";
  return enqueueNotification(key, `Scadenze\n${due.map(r => `${r.data}: ${r.titolo}${r.validato ? "" : " (da confermare)"}`).join("\n")}\n\nAttività da ricontrollare\n${stalled.map(t => `${t.title}: ${t.next || "aggiorna lo stato"}`).join("\n")}`);
}
export async function runJob(kind: Job, period: string) {
  const c = await db(); if (!c) throw new Error("Database necessario per gli automatismi.");
  const id = randomUUID(), now = new Date().toISOString();
  const inserted = await c.execute({ sql: "INSERT OR IGNORE INTO automation_runs(id,kind,period,status,started_at) VALUES(?,?,?,'running',?)", args: [id, kind, period, now] });
  if (!inserted.rowsAffected) return "Esecuzione già registrata; consulta l’esito";
  try {
    const text = process.env.KB_LOCAL_DIR ? "Demo: nessuna chiamata o invio automatico esterno" : await execute(kind, `${kind}:${period}`);
    await c.execute({ sql: "UPDATE automation_runs SET status='success',summary=?,finished_at=? WHERE id=?", args: [redactSensitive(text).slice(0, 1500), new Date().toISOString(), id] }); return text;
  } catch (e) {
    const error = redactSensitive(e instanceof Error ? e.message : "Esecuzione non riuscita").slice(0, 1000);
    await c.execute({ sql: "UPDATE automation_runs SET status='error',summary=?,finished_at=? WHERE id=?", args: [error, new Date().toISOString(), id] });
    if (kind !== "delivery") await enqueueNotification(`${kind}:error:${period}`, `${JOBS[kind]}: esecuzione non riuscita. Apri il centro Automatismi per i dettagli.`).catch(() => {});
    return `Errore: ${error}`;
  }
}
export async function runDaily() {
  const cfg = await settings(), now = new Date();
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: cfg.AUTO_TIMEZONE }).format(now);
  const sunday = new Intl.DateTimeFormat("en", { timeZone: cfg.AUTO_TIMEZONE, weekday: "short" }).format(now) === "Sun";
  const enabled: Job[] = [];
  if (cfg.AUTO_EMAIL === "on") enabled.push("email");
  if (cfg.GOOGLE_CALENDAR_MODE === "sync") enabled.push("calendar");
  if (cfg.AUTO_REMINDERS === "on") enabled.push("reminders");
  if (cfg.AUTO_BRIEFING === "on") enabled.push("briefing");
  if (sunday && cfg.AUTO_WEEKLY === "on") enabled.push("weekly");
  if (sunday && cfg.AUTO_BACKUP === "on") enabled.push("backup");
  const result: Record<string, string> = {};
  for (const kind of enabled) result[kind] = await runJob(kind, day);
  result.delivery = await runJob("delivery", `${day}-${randomUUID()}`);
  return result;
}
