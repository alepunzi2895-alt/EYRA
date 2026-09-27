import assert from "node:assert/strict";
import { emptyEntities, parseEntities, entityPlanets, entityTrend, demoEntities } from "../lib/entities";
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
  const monthly = Array<number | null>(12).fill(null); monthly[0] = 0; monthly[2] = 100;
  const extended = structuredClone(config); extended.entities[0].monthly = monthly;
  assert.deepEqual(parseEntities(JSON.stringify(extended)).entities[0].monthly, monthly);
  const partial = entityTrend(extended.entities[0]);
  assert.equal(partial.count, 2); assert.equal(partial.total, 100); assert.equal(partial.complete, false);
  assert.equal(partial.monthly[1], null);
  assert.equal(entityTrend(config.entities[0]).total, null);
  assert.equal(entityTrend({ ...config.entities[0], monthly: Array(12).fill(0) }).complete, true);
  for (const invalid of [[1, 2], Array(12).fill(-1), Array(12).fill("5")]) {
    assert.throws(() => parseEntities(JSON.stringify({ ...config, entities: config.entities.map((e, i) => i === 0 ? { ...e, monthly: invalid } : e) })));
  }
  for (const demo of demoEntities().entities) assert.equal(entityTrend(demo).total, demo.volume);
  console.log("✓ pianeti: centri distinti, volumi confrontabili, dati mancanti, scadenze e stato archivio");
}
