import assert from "node:assert/strict";
import { CloudSpeaker } from "../lib/cloud-speaker";

class FakeAudioContext {
  static suspendAfterDecode = false;
  state = "suspended";
  destination = {};
  resume() { this.state = "running"; return Promise.resolve(); }
  close() { this.state = "closed"; return Promise.resolve(); }
  decodeAudioData() { if (FakeAudioContext.suspendAfterDecode) this.state = "suspended"; return Promise.resolve({}); }
  createBufferSource() {
    return { buffer: null, onended: null as (() => void) | null, connect() {}, disconnect() {}, start() { queueMicrotask(() => this.onended?.()); }, stop() { this.onended?.(); } };
  }
}
async function until(predicate: () => boolean) {
  for (let attempt = 0; attempt < 100; attempt++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  assert.fail("Timeout nella coda audio simulata");
}
export async function testCloudSpeaker() {
  const originalFetch = globalThis.fetch, originalContext = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
  const statuses: string[] = [], requests: string[] = [];
  const speaker = new CloudSpeaker(text => statuses.push(text));
  let release: (() => void) | undefined;
  try {
    Object.defineProperty(globalThis, "AudioContext", { configurable: true, writable: true, value: FakeAudioContext });
    globalThis.fetch = async (_input, init) => {
      requests.push(JSON.parse(String(init?.body)).text);
      if (requests.length === 1) await new Promise<void>(resolve => { release = resolve; });
      return new Response("fake audio");
    };
    speaker.unlock(); speaker.enqueue("Prima frase.", "marin");
    await until(() => !!release);
    speaker.enqueue("Seconda frase.", "marin"); release!();
    await until(() => requests.length === 2 && statuses.at(-1) === "");
    assert.deepEqual(requests, ["Prima frase.", "Seconda frase."], "le frasi arrivate durante la sintesi non vengono perse");

    FakeAudioContext.suspendAfterDecode = true;
    speaker.enqueue("Risposta dopo interruzione.", "coral");
    await until(() => statuses.at(-1)?.includes("Riprendi") === true);
    const count = requests.length;
    FakeAudioContext.suspendAfterDecode = false; speaker.unlock();
    await until(() => statuses.at(-1) === "");
    assert.equal(requests.length, count, "riprende l’audio già scaricato senza pagare una seconda sintesi");

    let aborted = false;
    globalThis.fetch = async (_input, init) => {
      const text = JSON.parse(String(init?.body)).text; requests.push(text);
      if (text === "Da fermare.") return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => { aborted = true; reject(new Error("aborted")); }, { once: true }));
      return new Response("fake audio");
    };
    speaker.enqueue("Da fermare.", "marin");
    await until(() => requests.at(-1) === "Da fermare.");
    speaker.stop(); speaker.enqueue("Nuova risposta.", "marin");
    await until(() => requests.at(-1) === "Nuova risposta." && statuses.at(-1) === "");
    assert.equal(aborted, true);
    console.log("✓ riproduzione mobile: coda durante streaming, ripresa senza risintesi, annullamento e nuova risposta");
  } finally {
    release?.(); speaker.dispose(); FakeAudioContext.suspendAfterDecode = false; globalThis.fetch = originalFetch;
    if (originalContext) Object.defineProperty(globalThis, "AudioContext", originalContext); else Reflect.deleteProperty(globalThis, "AudioContext");
  }
}
