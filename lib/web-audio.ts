import { setting } from "./config";
import { AUDIO_MAX_BYTES, isAiVoice, recordingFormat } from "./audio-catalog";
import { redactSensitive } from "./privacy";

export async function webAudioStatus() {
  if (process.env.KB_LOCAL_DIR) return { enabled: false, reason: "Audio AI disattivato in demo. Usa le voci del dispositivo." };
  if (await setting("WEB_AUDIO_PROVIDER") !== "openai") return { enabled: false, reason: "Per altri timbri e la registrazione audio, attiva Audio AI in Impostazioni → Voce." };
  if (!process.env.OPENAI_API_KEY?.trim()) return { enabled: false, reason: "Aggiungi OPENAI_API_KEY nelle variabili Vercel e fai Redeploy per attivare Audio AI." };
  return { enabled: true, reason: "Voci generate dall’AI. Testo e registrazioni sono elaborati da OpenAI, a consumo." };
}
async function ready() { const status = await webAudioStatus(); if (!status.enabled) throw new Error(status.reason); }
export async function synthesize(text: string, voice: string, signal?: AbortSignal) {
  if (!text.trim() || text.length > 2000 || !isAiVoice(voice)) throw new Error("Testo o voce non validi (massimo 2.000 caratteri)." );
  await ready();
  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input: redactSensitive(text), instructions: "Parla in italiano, con pronuncia chiara, ritmo naturale e tono conversazionale. Leggi soltanto il testo ricevuto.", response_format: "mp3" }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000) });
    if (!response.ok) throw new Error();
    return response;
  } catch { throw new Error("Voce AI non disponibile. Controlla chiave e credito OpenAI, oppure scegli una voce del dispositivo."); }
}
export async function transcribeWeb(file: File) {
  if (!file.size || file.size > AUDIO_MAX_BYTES || !recordingFormat(file.type)) throw new Error("Registrazione non valida: MP4 o WebM, massimo 4 MB.");
  await ready();
  const form = new FormData();
  form.set("model", "gpt-4o-mini-transcribe"); form.set("language", "it"); form.set("response_format", "json");
  form.set("file", file, `registrazione.${recordingFormat(file.type)}`);
  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error();
    const result = await response.json();
    if (typeof result.text !== "string" || !result.text.trim()) throw new Error();
    return redactSensitive(result.text).slice(0, 20000);
  } catch { throw new Error("Trascrizione non riuscita. Controlla chiave e credito OpenAI o riprova con una registrazione più breve."); }
}
