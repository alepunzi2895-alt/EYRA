// npm run check — test offline su kb-demo (copia temporanea)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "eyra-"));
fs.cpSync("kb-demo", tmp, { recursive: true });
process.env.KB_LOCAL_DIR = tmp;

let fail = 0;
const ok = (c: unknown, m: string) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) fail++; };

(async () => {
  (await import("./entities-selftest")).testEntities();
  await (await import("./auth-selftest")).testAuth();
  await (await import("./connections-selftest")).testConnections();
  await (await import("./calendar-selftest")).testCalendar();
  const kb = await import("../lib/kb");
  const pt = await import("../lib/patch");
  const { extractXml, summarize } = await import("../lib/fattura");

  const docs = await kb.loadAll(true);
  ok(docs.length > 20, `kb caricata (${docs.length} file)`);
  ok(kb.validate(docs).length === 0, `validazione: ${kb.validate(docs).join("; ") || "ok"}`);
  ok(kb.occorrenze({ ricorrenza: { mensile: 31, slitta_weekend: false } }, "2027-02-01", "2027-02-28")[0] === "2027-02-28", "mensile 31 → fine febbraio");
  ok(kb.occorrenze({ ricorrenza: { annuale: ["05-16"], slitta_weekend: true } }, "2027-01-01", "2027-12-31")[0] === "2027-05-17", "slittamento weekend");

  const p: any = { code: pt.newCode(), stato: "pending", creato: new Date().toISOString(), da: "test", fonte: { tipo: "commercialista" },
    operazioni: [
      { op: "set", file: "demo-srl", campo: "regime", valore: "ordinario" },
      { op: "set", file: "demo-srl", campo: "forma", valore: "spa" },
      { op: "append", file: "demo-srl", sezione: "Dettagli", testo: "Esercizio al 31/12." },
      { op: "create", template: "scadenza", dir: "40-scadenze/singole", id: "2027-01-16-test", campi: { titolo: "Test", data: "2027-01-16", entita: ["demo-srl"], stato: "attivo" } },
    ] };
  const pv = await pt.preview(p);
  ok(pv.conflicts.length === 1 && pv.errors.length === 0, "preview: 1 conflitto, 0 errori");
  await pt.savePatch(p);
  const r = await pt.apply((await pt.loadPatch(p.code))!, false);
  ok(r.files.length === 2 && r.validazione.length === 0, `apply: ${r.files.length} file, validazione ${r.validazione.join("; ") || "ok"}`);
  const srl = (await kb.loadAll(true)).find((d) => d.id === "demo-srl")!;
  ok(srl.fm!.regime === "ordinario" && srl.fm!.forma === "srl", "set applicato, conflitto non sovrascritto");
  ok(srl.fm!.fonti_campi?.regime?.startsWith("commercialista"), "provenienza campo registrata");
  ok(!(await pt.pendingPatches()).length, "nessuna patch pendente");
  await (await import("./profile-selftest")).testProfile();
  await (await import("./workspace-selftest")).testWorkspace();
  await (await import("./chat-stream-selftest")).testChatStream();
  await (await import("./mobile-audio-selftest")).testMobileAudio();

  const xml = '<?xml version="1.0"?><p:FatturaElettronica><Numero>7</Numero><ImportoTotaleDocumento>100.00</ImportoTotaleDocumento></p:FatturaElettronica>';
  ok(summarize(extractXml(Buffer.concat([Buffer.from([0x30, 0x80]), Buffer.from(xml), Buffer.from([0, 0])]))!).includes("Totale documento: 100.00"), "fattura p7m");

  // Configurazione su Turso reale: prova il salvataggio e poi ripristina i valori precedenti.
  process.env.APP_NAME = "Nome precedente"; delete process.env.WA_ALLOWED_NUMBERS;
  const cfg = await import("../lib/config");
  const before = await cfg.detail();
  try {
    await cfg.save({ WA_ALLOWED_NUMBERS: "" }, "test");
    ok((await cfg.settings()).APP_NAME === "EYRA", "nome fisso anche con override in env");
    ok((await cfg.save({ WA_ALLOWED_NUMBERS: "+39 340 000 0000, 34600000000" }, "test")).ok, "salvataggio impostazioni");
    const d = await cfg.detail();
    ok(!Object.keys(cfg.DEFS).includes("APP_NAME") && !("APP_NAME" in d), "nome escluso dalle impostazioni modificabili");
    ok((await cfg.brand()).name === "EYRA", "identità interfaccia fissa");
    ok(d.WA_ALLOWED_NUMBERS.value === "393400000000,34600000000", "numeri normalizzati");
    ok(cfg.gmailLabel({ ...await cfg.settings(), GMAIL_LABEL: "" }) === "EYRA", "etichetta Gmail = nome se vuota");
    const bad = await cfg.save({ WA_ALLOWED_NUMBERS: "abc", REMINDER_DAYS: "7,200" }, "test");
    ok(!bad.ok && !!bad.errors.WA_ALLOWED_NUMBERS && !!bad.errors.REMINDER_DAYS, "valori non validi rifiutati");
    await cfg.save(Object.fromEntries([["APP_NAME", "Ettore"]]), "test");
    ok((await cfg.settings()).APP_NAME === "EYRA", "richiesta di rinomina ignorata dal server");
    ok(!cfg.KEYS.some((k) => /KEY|TOKEN|SECRET|PASSWORD/.test(k)), "nessun segreto tra le impostazioni da web");
    ok((await cfg.save({ TELEGRAM_ALLOWED_CHAT_IDS: "123456789, 987654321" }, "test")).ok, "ID chat Telegram salvati");
    const tg = await import("../lib/telegram");
    ok(await tg.telegramAllowed(123456789) && !(await tg.telegramAllowed(111111111)), "Telegram: whitelist applicata");
    ok(!(await cfg.save({ TELEGRAM_ALLOWED_CHAT_IDS: "+393400000000" }, "test")).ok, "Telegram: numero con prefisso rifiutato");
  } finally {
    await cfg.save({
      WA_ALLOWED_NUMBERS: before.WA_ALLOWED_NUMBERS.source === "web" ? before.WA_ALLOWED_NUMBERS.value : "",
      TELEGRAM_ALLOWED_CHAT_IDS: before.TELEGRAM_ALLOWED_CHAT_IDS.source === "web" ? before.TELEGRAM_ALLOWED_CHAT_IDS.value : "",
    }, "test-restore");
    (await import("../lib/db")).closeDb();
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(fail ? `\n${fail} test falliti` : "\nTutti i test ok");
  process.exit(fail ? 1 : 0);
})();
