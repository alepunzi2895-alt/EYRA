import { createHash } from "node:crypto";
import { addDays, type Scad } from "./kb";

export type CalendarEvent = {
  id: string; etag?: string; status?: string; summary?: string; description?: string; htmlLink?: string;
  start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
};
export type EventBody = Pick<CalendarEvent, "summary" | "description" | "start" | "end" | "extendedProperties">;
export type CalendarTransport = {
  list: (source: string) => Promise<CalendarEvent[]>;
  insert: (event: EventBody & { id: string }) => Promise<void>;
  update: (event: CalendarEvent, body: EventBody) => Promise<void>;
  remove: (event: CalendarEvent) => Promise<void>;
};
export const calendarSource = (root: string) => createHash("sha256").update(root).digest("hex");

/** Only events marked for this archive can be reconciled. No write ever flows back to the KB. */
export async function reconcileCalendar(api: CalendarTransport, rows: Scad[], root: string, name: string, from: string) {
  if (!root) throw new Error("Collega prima l’archivio Drive.");
  const source = calendarSource(root), until = addDays(from, 90);
  const wanted = new Map<string, EventBody>();
  for (const row of rows) {
    if (!row.validato || row.data < from || row.data > until) continue;
    const id = calendarSource(JSON.stringify([source, row.tipo, row.id, row.data]));
    wanted.set(id, {
      summary: row.titolo,
      description: `Scadenza sincronizzata da ${name}.\nRiferimento archivio: ${row.id}\nAggiorna la scadenza nell’archivio; le modifiche a questo evento saranno riallineate alla prossima sincronizzazione.`,
      start: { date: row.data }, end: { date: addDays(row.data, 1) },
      extendedProperties: { private: { eyraSource: source, eyraKey: id } },
    });
  }
  if (wanted.size > 500) throw new Error("Più di 500 scadenze da sincronizzare: riduci il numero prima di riprovare.");
  // Complete the entire listing before writing: an incomplete page must never cause deletion.
  const existing = (await api.list(source)).filter(e => e.status !== "cancelled" && e.extendedProperties?.private?.eyraSource === source);
  const byId = new Map(existing.map(e => [e.extendedProperties?.private?.eyraKey ?? e.id, e]));
  const result = { created: 0, updated: 0, removed: 0, unchanged: 0 };
  for (const [id, body] of wanted) {
    const old = byId.get(id);
    if (!old) { await api.insert({ ...body, id }); result.created++; }
    else if (old.summary !== body.summary || old.description !== body.description || old.start?.date !== body.start?.date || old.end?.date !== body.end?.date || old.start?.dateTime || old.end?.dateTime) {
      await api.update(old, body); result.updated++;
    } else result.unchanged++;
  }
  for (const old of existing) {
    const date = old.start?.date ?? old.start?.dateTime?.slice(0, 10);
    const key = old.extendedProperties?.private?.eyraKey;
    if (date && date >= from && date <= until && key && !wanted.has(key) && /^[a-f0-9]{64}$/.test(key) && (old.id === key || (old.id.startsWith(key) && /^[a-f0-9]{72}$/.test(old.id)))) {
      await api.remove(old); result.removed++;
    }
  }
  return result;
}
