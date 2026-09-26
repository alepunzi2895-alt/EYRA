import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { BrowserDictation, type Recognition, type RecognitionResult } from "../lib/browser-dictation";
import { AI_VOICES, recordingFormat } from "../lib/audio-catalog";
import { speechChunk } from "../lib/speech-text";
import { webAudioStatus, synthesize } from "../lib/web-audio";
import { GET, POST as speak } from "../app/api/audio/route";
import { POST as transcribe } from "../app/api/audio/transcribe/route";
import { middleware } from "../middleware";
import { detail, save } from "../lib/config";
import { testCloudSpeaker } from "./cloud-speaker-selftest";

class FakeRecognition implements Recognition {
  lang = ""; continuous = false; interimResults = false; aborted = false;
  onresult: ((event: RecognitionResult) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null; onstart: (() => void) | null = null;
  start() { this.onstart?.(); } stop() {} abort() { this.aborted = true; }
  result(text: string, final = false) { this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: final })] }); }
}
export async function testMobileAudio() {
  await testCloudSpeaker();
  const recognitions: FakeRecognition[] = [], texts: string[] = [], states: [boolean, string][] = [];
  const dictation = new BrowserDictation(() => { const r = new FakeRecognition(); recognitions.push(r); return r; }, text => texts.push(text), (on, message) => states.push([on, message]));
  try {
    dictation.start("Nota iniziale.");
    assert.equal(recognitions[0].continuous, true);
    recognitions[0].result("Paga la"); recognitions[0].result("Paga la fattura.", true);
    assert.equal(texts.at(-1), "Nota iniziale. Paga la fattura.", "le ipotesi intermedie non duplicano il testo");
    recognitions[0].onend?.();
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(recognitions.length, 2, "riavvia una sessione interrotta da Safari");
    recognitions[1].result("Domani.", true);
    assert.equal(texts.at(-1), "Nota iniziale. Paga la fattura. Domani.");
    dictation.stop(); recognitions[1].result("Domani mattina.", true); recognitions[1].onend?.();
    assert.equal(texts.at(-1), "Nota iniziale. Paga la fattura. Domani mattina.", "accetta l’ultimo risultato prima dell’arresto");
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(recognitions.length, 2, "nessun riavvio dopo stop esplicito");
    dictation.start(""); recognitions[2].onerror?.({ error: "not-allowed" }); recognitions[2].onend?.();
    assert.equal(states.at(-1)?.[0], false); assert.match(states.at(-1)![1], /Consenti il microfono/);
    dictation.start(""); const last = recognitions.at(-1)!; dictation.dispose();
    assert.equal(last.aborted, true); assert.equal(last.onresult, null, "rilascio e rimozione callback allo smontaggio");
  } finally { dictation.dispose(); }
  assert.equal(recordingFormat("audio/mp4;codecs=mp4a.40.2"), "mp4");
  assert.equal(recordingFormat("audio/webm;codecs=opus"), "webm");
  assert.equal(recordingFormat("text/plain"), null);
  assert.equal(speechChunk("x".repeat(3000) + ".", true).text.length, 220);
  console.log("✓ dettatura mobile: risultati parziali, riavvio limitato, conservazione testo, stop e permessi; MP4 Safari/WebM");

  for (const path of ["/api/audio", "/api/audio/transcribe"]) assert.equal((await middleware(new NextRequest(`https://example.test${path}`))).status, 401);
  const before = (await detail()).WEB_AUDIO_PROVIDER, env = { local: process.env.KB_LOCAL_DIR, key: process.env.OPENAI_API_KEY }, originalFetch = globalThis.fetch;
  const requests: { url: string; body: unknown }[] = [];
  try {
    assert.equal((await webAudioStatus()).enabled, false, "demo non chiama servizi a pagamento");
    await save({ WEB_AUDIO_PROVIDER: "off" }, "test"); delete process.env.KB_LOCAL_DIR;
    assert.equal((await webAudioStatus()).enabled, false);
    await save({ WEB_AUDIO_PROVIDER: "openai" }, "test"); delete process.env.OPENAI_API_KEY;
    assert.equal((await webAudioStatus()).enabled, false);
    process.env.OPENAI_API_KEY = "fake-openai-test-only";
    globalThis.fetch = async (input, options) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url.startsWith("https://api.openai.com/")) return originalFetch(input, options);
      const body = typeof options?.body === "string" ? JSON.parse(options.body) : options?.body;
      requests.push({ url, body });
      return url.endsWith("/speech") ? new Response("fake-mp3", { headers: { "Content-Type": "audio/mpeg" } }) : Response.json({ text: "Una nota di prova." });
    };
    const catalog = await (await GET()).json();
    assert.equal(catalog.enabled, true); assert.equal(catalog.voices.length, 13); assert.ok(AI_VOICES.includes("marin"));
    const audio = await speak(new NextRequest("https://example.test/api/audio", { method: "POST", body: JSON.stringify({ text: "Ciao, prova.", voice: "coral" }) }));
    assert.equal(audio.status, 200); assert.equal(await audio.text(), "fake-mp3");
    assert.equal((requests[0].body as { voice: string }).voice, "coral");
    const form = new FormData(); form.set("file", new File(["fake mp4"], "nota.mp4", { type: "audio/mp4" }));
    const result = await transcribe(new NextRequest("https://example.test/api/audio/transcribe", { method: "POST", body: form }));
    assert.equal((await result.json()).text, "Una nota di prova.");
    assert.equal((requests[1].body as FormData).get("language"), "it");
    await assert.rejects(() => synthesize("ciao", "inventata"), /non validi/);
    const invalid = await speak(new NextRequest("https://example.test/api/audio", { method: "POST", body: JSON.stringify({ text: "a".repeat(2001), voice: "coral" }) }));
    assert.equal(invalid.status, 400); assert.equal(requests.length, 2);
    globalThis.fetch = async (input, options) => {
      if (String(input).startsWith("https://api.openai.com/")) throw new Error("fake-openai-test-only");
      return originalFetch(input, options);
    };
    await assert.rejects(() => synthesize("ciao", "coral"), e => e instanceof Error && !e.message.includes("fake-openai-test-only"));
    console.log("✓ audio AI: accesso protetto, opt-in, 13 timbri, TTS e trascrizione simulati, limiti, nessuna chiave esposta");
  } finally {
    globalThis.fetch = originalFetch;
    if (env.local === undefined) delete process.env.KB_LOCAL_DIR; else process.env.KB_LOCAL_DIR = env.local;
    if (env.key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = env.key;
    await save({ WEB_AUDIO_PROVIDER: before.source === "web" ? before.value : "" }, "test-restore");
  }
}
