import assert from "node:assert/strict";
import { emptyEntities, parseEntities, entityPlanets } from "../lib/entities";
import type { Doc, Scad } from "../lib/kb";

export function testEntities() {
  const config = emptyEntities(2026);
  config.entities[0] = { ...config.entities[0], reference: "demo-es", volume: 100 };
  config.entities[1].volume = 400;
  assert.deepEqual(parseEntities(JSON.stringify(config)), config);
  for (const volume of [-1, "100"]) {
    const bad = structuredClone(config); (bad.entities[0] as { volume: unknown }).volume = volume;
    assert.throws(() => parseEntities(JSON.stringify(bad)));
  }
  assert.throws(() => parseEntities(JSON.stringify(config).replace('"volume":100', '"volume":1e309')));
  const duplicate = structuredClone(config); duplicate.entities[1].reference = "demo-es";
  assert.throws(() => parseEntities(JSON.stringify(duplicate)));
  const doc: Doc = { id: "demo-es", path: "10-entita/demo-es.md", fm: { tipo: "entita", validato: true }, raw: "", body: "" };
  const due: Scad = { id: "demo-due", data: "2026-09-29", entita: ["demo-es"], titolo: "Scadenza demo", responsabile: "", validato: true, preavviso: 7, tipo: "scadenza" };
  const evaluate = (docs: Doc[], dates: Scad[], available = true) => entityPlanets(config, docs, dates, available, "2026-09-27");
  assert.equal(evaluate([doc], [due])[0].attention, "urgent");
  assert.equal(evaluate([doc], [{ ...due, data: "2026-09-01" }])[0].attention, "urgent");
  assert.equal(evaluate([doc], [{ ...due, data: "2025-09-01" }])[0].attention, "calm");
  assert.equal(evaluate([doc], [{ ...due, data: "2026-10-08" }])[0].attention, "watch");
  assert.equal(evaluate([{ ...doc, fm: { ...doc.fm, validato: false } }], [])[0].attention, "watch");
  assert.equal(evaluate([doc], [])[0].attention, "calm");
  assert.equal(evaluate([], [due])[0].attention, "unknown");
  assert.equal(evaluate([doc], [due], false)[0].attention, "unknown");
  const planets = evaluate([doc], [due]);
  assert.equal(planets[1].attention, "unknown");
  assert.ok(planets[1].size > planets[0].size);
  assert.equal(planets[2].volume, null);
  assert.equal(planets[2].size, 36);
  config.entities[0].volume = 0;
  assert.equal(evaluate([doc], [])[0].size, 24);
  console.log("✓ pianeti: centri distinti, volumi confrontabili, dati mancanti, scadenze e stato archivio");
}
