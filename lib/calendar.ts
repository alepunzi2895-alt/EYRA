import { googleAuth } from "./drive";
import { settings, type Settings } from "./config";
import { loadAll, scadenze, today, validate } from "./kb";
import { archiveIssue } from "./availability";
import { reconcileCalendar, type CalendarEvent, type EventBody, type CalendarTransport } from "./calendar-sync";

type CalendarInfo = { id: string; summary: string; accessRole: string; timeZone?: string };
type Page<T> = { items?: T[]; nextPageToken?: string; summary?: string; timeZone?: string };
class CalendarApiError extends Error {
  constructor(error: unknown, readonly status = (error as { response?: { status?: number } })?.response?.status) { super(calendarError(error)); }
}

function requireGoogle() {
  if (process.env.KB_LOCAL_DIR) throw new Error("Modalità demo: Calendar non contatta Google e non invia scadenze di esempio.");
  if (!["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"].every(k => process.env[k]?.trim()))
    throw new Error("Collega Google nelle Impostazioni per usare Calendar.");
}

export function calendarError(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 401) return "Accesso Google scaduto o revocato. Ricollega Google e aggiorna GOOGLE_REFRESH_TOKEN.";
  if (status === 403) return "Accesso Calendar non consentito. Abilita Google Calendar API, ricollega Google e verifica i permessi sul calendario.";
  if (status === 404) return "Calendario non trovato. Controlla l’ID e l’account Google collegato.";
  if (status === 409 || status === 410 || status === 412) return "Un evento è stato modificato o eliminato su Google durante la sincronizzazione. Riprova; se persiste, verifica il calendario di destinazione.";
  if (status === 429) return "Limite Google Calendar raggiunto. Attendi qualche minuto e riprova.";
  return "Google Calendar non raggiungibile. Riprova e verifica il collegamento nelle Impostazioni.";
}

async function request<T>(path: string, params: Record<string, string | number | boolean> = {}, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", data?: unknown, etag?: string): Promise<T> {
  try {
    const response = await googleAuth().request<T>({
      url: `https://www.googleapis.com/calendar/v3/${path}`, method, params, data,
      timeout: 15000, headers: etag ? { "If-Match": etag } : undefined,
    });
    return response.data;
  } catch (error) { throw new CalendarApiError(error); }
}

/** Deterministic fallback IDs also make retries safe after a Google event was deleted. */
async function insertEvent(path: string, body: EventBody & { id: string }) {
  for (let generation = 0; generation < 20; generation++) {
    const id = body.id + (generation ? generation.toString(16).padStart(8, "0") : "");
    try {
      await request(path, { sendUpdates: "none" }, "POST", { ...body, id, transparency: "transparent", reminders: { useDefault: false } });
      return;
    } catch (error) {
      if (!(error instanceof CalendarApiError) || error.status !== 409) throw error;
      let old: CalendarEvent;
      try { old = await request<CalendarEvent>(`${path}/${id}`); }
      catch (readError) { if (readError instanceof CalendarApiError && readError.status === 410) continue; throw readError; }
      if (old.status === "cancelled") continue;
      if (old.extendedProperties?.private?.eyraSource !== body.extendedProperties?.private?.eyraSource || old.extendedProperties?.private?.eyraKey !== body.id) throw error;
      const { id: _id, ...fields } = body;
      await request(`${path}/${id}`, { sendUpdates: "none" }, "PATCH", fields, old.etag);
      return;
    }
  }
  throw new Error("Evento eliminato ripetutamente su Google. Controlla il calendario prima di riprovare.");
}

async function pages<T>(path: string, params: Record<string, string | number | boolean> = {}) {
  const items: T[] = [];
  let next = "";
  for (let n = 0; n < 100; n++) {
    const page = await request<Page<T>>(path, { ...params, maxResults: 250, ...(next ? { pageToken: next } : {}) });
    items.push(...(page.items ?? []));
    if (!page.nextPageToken) return items;
    next = page.nextPageToken;
  }
  throw new Error("Calendario troppo grande: lettura incompleta. Nessuna sincronizzazione eseguita.");
}

export async function listCalendars(): Promise<CalendarInfo[]> {
  requireGoogle();
  return pages<CalendarInfo>("users/me/calendarList", { minAccessRole: "reader" });
}

function checkMode(cfg: Settings, write = false) {
  requireGoogle();
  if (!["read", "sync"].includes(cfg.GOOGLE_CALENDAR_MODE)) throw new Error("Google Calendar è disattivato. Scegli una modalità nelle Impostazioni.");
  if (write && cfg.GOOGLE_CALENDAR_MODE !== "sync") throw new Error("Attiva «Lettura e sincronizzazione» nelle Impostazioni.");
}

export async function calendarStatus() {
  requireGoogle();
  const cfg = await settings();
  const cal = await request<CalendarInfo>(`users/me/calendarList/${encodeURIComponent(cfg.GOOGLE_CALENDAR_ID)}`);
  await request(`calendars/${encodeURIComponent(cfg.GOOGLE_CALENDAR_ID)}/events`, { maxResults: 1 });
  if (cfg.GOOGLE_CALENDAR_MODE === "sync" && !["owner", "writer"].includes(cal.accessRole))
    throw new Error("Il calendario è leggibile ma non modificabile. Scegli un calendario con permesso di scrittura.");
  return `Calendar collegato: ${cal.summary}. ${["owner", "writer"].includes(cal.accessRole) ? "Scrittura consentita." : "Solo lettura."}`;
}

export async function calendarEvents(days = 30) {
  if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error("Indica un intervallo da 1 a 90 giorni.");
  const cfg = await settings();
  checkMode(cfg);
  const from = new Date(), until = new Date(from.getTime() + days * 86400000);
  const page = await request<Page<CalendarEvent>>(`calendars/${encodeURIComponent(cfg.GOOGLE_CALENDAR_ID)}/events`, {
    timeMin: from.toISOString(), timeMax: until.toISOString(), singleEvents: true, orderBy: "startTime", maxResults: 50,
    fields: "summary,timeZone,nextPageToken,items(id,status,summary,start,end,htmlLink)",
  });
  return { name: page.summary ?? "Calendario", timeZone: page.timeZone ?? "Europe/Rome", events: (page.items ?? []).filter(e => e.status !== "cancelled"), more: !!page.nextPageToken };
}

export function calendarTransport(calendarId: string): CalendarTransport {
  const path = `calendars/${encodeURIComponent(calendarId)}/events`;
  return {
    list: source => pages<CalendarEvent>(path, { privateExtendedProperty: `eyraSource=${source}`, showDeleted: false }),
    insert: body => insertEvent(path, body),
    update: async (old, body: EventBody) => { await request(`${path}/${encodeURIComponent(old.id)}`, { sendUpdates: "none" }, "PATCH", body, old.etag); },
    remove: async old => { await request(`${path}/${encodeURIComponent(old.id)}`, { sendUpdates: "none" }, "DELETE", undefined, old.etag); },
  };
}

export async function syncCalendar() {
  const cfg = await settings();
  checkMode(cfg, true);
  const issue = await archiveIssue();
  if (issue) throw new Error(issue);
  const docs = await loadAll(true);
  if (validate(docs).length) throw new Error("Correggi gli errori di struttura dell’archivio prima di sincronizzare Calendar.");
  return reconcileCalendar(calendarTransport(cfg.GOOGLE_CALENDAR_ID), scadenze(docs.filter(d => d.fm?.validato === true), 90), cfg.KB_ROOT_FOLDER_ID, cfg.APP_NAME, today());
}

export async function dailyCalendarSync() {
  if (process.env.KB_LOCAL_DIR || (await settings()).GOOGLE_CALENDAR_MODE !== "sync") return { skipped: true };
  return syncCalendar();
}
