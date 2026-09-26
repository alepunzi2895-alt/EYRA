import assert from "node:assert/strict";
import { auth } from "@googleapis/drive";
import { calendarSource, reconcileCalendar, type CalendarEvent, type CalendarTransport } from "../lib/calendar-sync";
import { calendarTransport, calendarError, listCalendars, dailyCalendarSync } from "../lib/calendar";
import { type Scad } from "../lib/kb";
import { APP_NAME } from "../lib/config";

export async function testCalendar() {
  const row: Scad = { id: "scadenza-demo", titolo: "Scadenza di prova", data: "2027-03-28", tipo: "scadenza", validato: true, entita: [], responsabile: "", preavviso: 7 };
  const stored = new Map<string, CalendarEvent>();
  const api: CalendarTransport = {
    list: async () => [...stored.values()],
    insert: async e => { assert(!stored.has(e.id), "non duplicare gli eventi"); stored.set(e.id, structuredClone(e)); },
    update: async (e, body) => { stored.set(e.id, { ...e, ...structuredClone(body) }); },
    remove: async e => { stored.delete(e.id); },
  };
  const run = (rows: Scad[]) => reconcileCalendar(api, rows, "archive-test", APP_NAME, "2027-03-01");
  const first = await run([row, { ...row, id: "non-confermata", validato: false }, { ...row, id: "oltre-finestra", data: "2028-01-01" }]);
  assert.equal(first.created, 1);
  const event = [...stored.values()][0];
  assert.match(event.id, /^[0-9a-f]{64}$/);
  assert.equal(event.end?.date, "2027-03-29", "fine esclusiva all-day anche al cambio ora");
  assert.deepEqual(await run([row]), { created: 0, updated: 0, removed: 0, unchanged: 1 });
  assert.equal((await run([{ ...row, titolo: "Titolo aggiornato" }])).updated, 1);
  stored.set("personal", { id: "personal", start: { date: "2027-03-28" } });
  stored.set("other", { id: "other", start: { date: "2027-03-28" }, extendedProperties: { private: { eyraSource: calendarSource("another-archive") } } });
  stored.set("past", { ...event, id: "past", start: { date: "2027-02-01" } });
  const moved = await run([{ ...row, data: "2027-04-02" }]);
  assert.equal(moved.created, 1); assert.equal(moved.removed, 1);
  assert(stored.has("personal") && stored.has("other") && stored.has("past"));
  assert.equal((await run([])).removed, 1, "scadenza rimossa o non più confermata");
  let wrote = false;
  await assert.rejects(() => reconcileCalendar({ ...api, list: async () => { throw new Error("pagina incompleta"); }, insert: async () => { wrote = true; } }, [row], "archive-test", APP_NAME, "2027-03-01"));
  assert.equal(wrote, false);

  type Options = { url: string; method?: string; params: Record<string, string | number | boolean>; data?: CalendarEvent; headers?: Record<string, string> };
  const original = auth.OAuth2.prototype.request;
  let respond: (o: Options) => unknown = () => { throw new Error("unexpected request"); };
  auth.OAuth2.prototype.request = (async (o: Options) => ({ data: await respond(o) })) as unknown as typeof original;
  try {
    await assert.rejects(listCalendars, /demo/, "la demo non può leggere Google");
    assert.deepEqual(await dailyCalendarSync(), { skipped: true });
    const transport = calendarTransport("demo@example.test");
    let lists = 0;
    respond = o => {
      assert(o.url.includes("demo%40example.test"));
      lists++;
      return o.params.pageToken ? { items: [event] } : { items: [{ id: "first" }], nextPageToken: "page-2" };
    };
    assert.equal((await transport.list("test-source")).length, 2);
    assert.equal(lists, 2);
    let posts = 0, gets = 0;
    respond = o => {
      if (o.method === "POST") {
        assert.equal(o.params.sendUpdates, "none");
        assert.equal(o.data?.extendedProperties?.private?.eyraKey, event.id);
        if (++posts === 1) throw { response: { status: 409 }, message: "secret must not leak" };
        assert.equal(o.data?.id, event.id + "00000001");
        return {};
      }
      gets++; return { id: event.id, status: "cancelled" };
    };
    await transport.insert(event);
    assert.equal(posts, 2); assert.equal(gets, 1);
    const recovered = { ...event, id: event.id + "00000001" };
    assert.equal((await reconcileCalendar({ ...api, list: async () => [recovered] }, [row], "archive-test", APP_NAME, "2027-03-01")).unchanged, 1);
    respond = o => {
      if (o.method === "POST") throw { response: { status: 409 } };
      if (o.method === "GET") return { ...event, etag: "version-1" };
      assert.equal(o.method, "PATCH"); assert.equal(o.headers?.["If-Match"], "version-1"); return {};
    };
    await transport.insert(event); // simultaneous insertion/retry, same stable ID
    respond = o => { assert.equal(o.headers?.["If-Match"], "version-2"); return {}; };
    await transport.remove({ ...event, etag: "version-2" });
    respond = () => { throw { response: { status: 403 }, message: "secret must not leak" }; };
    await assert.rejects(() => transport.list("source"), e => e instanceof Error && /Calendar/.test(e.message) && !e.message.includes("secret"));
    assert(!calendarError(new Error("secret must not leak")).includes("secret"));
    console.log("✓ Calendar: confermate, ricorrenze per data, idempotenza, aggiornamenti, rimozioni circoscritte, paginazione, recupero eventi eliminati, ETag, demo isolata e segreti protetti");
  } finally { auth.OAuth2.prototype.request = original; }
}
