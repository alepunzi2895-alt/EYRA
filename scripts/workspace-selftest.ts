import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { zipSync, unzipSync, strToU8 } from "fflate";
import { proposeMemory, memoryContext, proposeTask, tasks, proposeOperations } from "../lib/workflows";
import { loadPatch, apply } from "../lib/patch";
import { loadAll, occorrenze } from "../lib/kb";
import { appendHistory, loadHistory, archiveConversation, searchHistory } from "../lib/history";
import { db } from "../lib/db";
import { runJob } from "../lib/automations";
import { quietNow } from "../lib/notifications";
import { claimWebhook, finishWebhook } from "../lib/webhook-state";
import { verifyBackup } from "../lib/backup";
import { telegramAttachment } from "../lib/telegram";
import { transcribe } from "../lib/transcription";
import { speechChunk, spokenText } from "../lib/speech-text";
import { writeText } from "../lib/drive";

export async function testWorkspace() {
  const text = "Preferisco riepiloghi sintetici prima dei dettagli.";
  const proposed = await proposeMemory(text, "Test su dati finti");
  assert.ok(!(await memoryContext()).includes(text), "nessuna memoria prima dell’approvazione");
  assert.equal((await proposeMemory(text, "Test")).code, proposed.code, "dedup delle proposte");
  assert.equal((await apply((await loadPatch(proposed.code))!, true)).errors.length, 0);
  assert.ok((await memoryContext()).includes(text));
  await assert.rejects(() => proposeMemory(text, "Test"), /già presente/);
  await assert.rejects(() => proposeMemory("Password: segreto-demo", "Test"), /credenziali/);
  const memory = (await loadAll()).find(d => d.fm?.memory_text === text)!;
  const forget = await proposeOperations([{ op: "set", file: memory.id, campo: "stato", valore: "archiviato" }], "Test");
  await apply((await loadPatch(forget.code))!, true);
  assert.ok(!(await memoryContext()).includes(text));
  const input = { kind: "renewal", title: "Manutenzione demo", owner: "Persona demo", next: "Contattare officina", date: "2027-11-05", status: "waiting", recurrence: "yearly", notice: "30" };
  const task = await proposeTask(input);
  assert.ok(!(await tasks()).some(t => t.title === input.title));
  assert.equal((await apply((await loadPatch(task.code))!, true)).errors.length, 0);
  const saved = (await tasks()).find(t => t.title === input.title)!;
  assert.equal(saved.notice, "30");
  const doc = (await loadAll()).find(d => d.id === saved.id)!;
  assert.deepEqual(occorrenze(doc.fm!, "2026-01-01", "2028-12-31"), ["2027-11-05", "2028-11-05"]);
  const closed = await proposeTask({ ...input, id: saved.id, status: "done" });
  await apply((await loadPatch(closed.code))!, true);
  assert.ok((await tasks()).find(t => t.id === saved.id)?.completed);
  await assert.rejects(() => proposeTask({ ...input, date: "2027-02-30" }), /Data non valida/);
  console.log("✓ memorie e attività: proposta, approvazione, dedup, oblio, rinnovi e completamento");

  const id = `test-${randomUUID()}`, other = `test-${randomUUID()}`;
  const c = (await db())!;
  try {
    await writeText(`95-log/chat/${id}.json`, JSON.stringify([{ role: "user", text: `legacy-${id}`, at: new Date().toISOString() }]));
    assert.equal((await loadHistory(id)).length, 1);
    assert.equal((await loadHistory(id)).length, 1, "migrazione una sola volta");
    await appendHistory(id, Array.from({ length: 42 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `finto ${id} ${i}`, at: new Date().toISOString() })));
    assert.equal((await loadHistory(id)).length, 30);
    const all = await loadHistory(id, 100);
    assert.equal(all.length, 43, "cronologia completa conservata");
    assert.equal((await loadHistory(id, 100, all[2].id)).length, 2);
    assert.equal((await loadHistory(other)).length, 0);
    await appendHistory(id, [{ role: "user", text: "pin: 123456", at: new Date().toISOString() }]);
    assert.ok(!(await loadHistory(id)).at(-1)?.text.includes("123456"));
    assert.ok((await searchHistory(id)).length > 0);
    await archiveConversation(id, true);
    assert.equal((await searchHistory(id)).length, 0);
    assert.equal(await claimWebhook(id), true);
    assert.equal(await claimWebhook(id), false);
    await finishWebhook(id, "error");
    assert.equal(await claimWebhook(id), false, "nessun replay ambiguo dopo errore");
    await runJob("briefing", id); await runJob("briefing", id);
    assert.equal((await c.execute({ sql: "SELECT count(*) AS n FROM automation_runs WHERE period=?", args: [id] })).rows[0].n, 1);
  } finally {
    await c.batch([
      { sql: "DELETE FROM messages WHERE conversation_id IN (?,?)", args: [id, other] },
      { sql: "DELETE FROM conversations WHERE id IN (?,?)", args: [id, other] },
      { sql: "DELETE FROM webhook_events WHERE id=?", args: [id] },
      { sql: "DELETE FROM automation_runs WHERE period=?", args: [id] },
    ], "write");
  }
  const quiet = { AUTO_TIMEZONE: "Europe/Rome", QUIET_START: "22", QUIET_END: "7" };
  assert.equal(quietNow(quiet, new Date("2026-07-01T04:30:00Z")), true);
  assert.equal(quietNow(quiet, new Date("2026-07-01T05:00:00Z")), false);
  assert.equal(quietNow(quiet, new Date("2026-12-01T05:30:00Z")), true);
  assert.equal(quietNow({ ...quiet, QUIET_END: "22" }), false);
  console.log("✓ Turso: migrazione, cronologia completa, paginazione, ricerca, isolamento, dedup e orari legali");

  const data = strToU8("Solo contenuto finto"), name = "archive/demo.md";
  const manifest = strToU8(JSON.stringify({ version: 1, files: { [name]: createHash("sha256").update(data).digest("hex") } }));
  const zip = zipSync({ [name]: data, "manifest.json": manifest });
  assert.equal(verifyBackup(zip), 1);
  assert.deepEqual(unzipSync(zip)[name], data, "contenuto ripristinato identico");
  assert.throws(() => verifyBackup(zipSync({ [name]: strToU8("corrotto"), "manifest.json": manifest })));
  assert.throws(() => verifyBackup(zipSync({ "../escape.md": data, "manifest.json": manifest })));
  assert.throws(() => verifyBackup(zipSync({ "manifest.json": manifest })));
  const fetchBefore = globalThis.fetch, token = process.env.TELEGRAM_BOT_TOKEN;
  try {
    process.env.TELEGRAM_BOT_TOKEN = "test-only-token";
    globalThis.fetch = async input => String(input).includes("getFile") ? Response.json({ ok: true, result: { file_path: "voice/demo.ogg", file_size: 4 } }) : new Response("fake");
    const message = { chat: { id: 123, type: "private" as const }, from: { id: 123 }, voice: { file_id: "demo", duration: 5 } };
    assert.equal((await telegramAttachment(message))?.data.toString(), "fake");
    await assert.rejects(() => telegramAttachment({ ...message, voice: { file_id: "demo", duration: 601 } }), /troppo grande/);
    await assert.rejects(() => transcribe(Buffer.from("fake"), "demo.ogg", "audio/ogg"), /demo/);
    globalThis.fetch = async () => { throw new Error("https://api.telegram.org/bottest-only-token/"); };
    await assert.rejects(() => telegramAttachment(message), error => error instanceof Error && !error.message.includes("test-only-token"));
  } finally { globalThis.fetch = fetchBefore; if (token === undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN = token; }
  assert.deepEqual(speechChunk("Una frase. Un’altra"), { text: "Una frase.", rest: " Un’altra" });
  assert.equal(speechChunk("Frase incompleta").text, "");
  assert.equal(speechChunk("Frase incompleta", true).text, "Frase incompleta");
  assert.equal(spokenText("## Leggi [qui](https://example.com) **oggi**"), "Leggi qui oggi");
  console.log("✓ backup ripristinabile e checksum; Telegram simulato e limiti; frasi vocali progressive");
}
