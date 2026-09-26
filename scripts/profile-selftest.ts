import assert from "node:assert/strict";
import { readProfile, proposeProfile, profileContext } from "../lib/profile";
import { loadPatch, apply, preview, reject } from "../lib/patch";

export async function testProfile() {
  const initial = await readProfile();
  const first = { name: "Persona demo", markdown: "## Obiettivi\n- Organizzare i progetti\n\n## Risposte\nPreferisco risposte **brevi**." };
  const proposed = await proposeProfile(first);
  assert.deepEqual(await readProfile(), initial, "una proposta non cambia il profilo");
  assert.match(proposed.diff, /profilo_markdown/);
  const patch = await loadPatch(proposed.code);
  assert.equal(patch?.stato, "pending");
  const result = await apply(patch!, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.validazione.length, 0);
  assert.deepEqual(await readProfile(), first);
  assert.match(await profileContext(), /Persona demo/);
  const second = await proposeProfile({ name: "Nome aggiornato demo", markdown: "## Risposte\nPreferisco risposte dettagliate." });
  const revision = (await loadPatch(second.code))!;
  assert.equal((await preview(revision)).conflicts.length, 2, "modifiche al profilo richiedono conferma dei conflitti");
  await reject(second.code);
  assert.deepEqual(await readProfile(), first, "il rifiuto conserva il profilo precedente");
  const third = await proposeProfile({ name: "Nome aggiornato demo", markdown: "## Risposte\nPreferisco risposte dettagliate." });
  await apply((await loadPatch(third.code))!, true);
  const context = await profileContext();
  assert.match(context, /Nome aggiornato demo/);
  assert.doesNotMatch(context, /Persona demo|risposte \*\*brevi\*\*/);
  const clear = await proposeProfile({ name: "", markdown: "" });
  await apply((await loadPatch(clear.code))!, true);
  assert.equal(await profileContext(), "");
  await assert.rejects(() => proposeProfile({ name: "x".repeat(81), markdown: "" }), /80 caratteri/);
  console.log("✓ profilo: proposta, approvazione, rifiuto, conflitti, aggiornamento immediato e svuotamento");
}
