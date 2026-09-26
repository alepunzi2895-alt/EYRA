import { setting } from "./config";
import { redactSensitive } from "./privacy";
export async function transcribe(data: Buffer, name: string, mime: string) {
  if (process.env.KB_LOCAL_DIR) throw new Error("Trascrizione disattivata in demo.");
  if (await setting("TRANSCRIPTION_PROVIDER") !== "openai" || !process.env.OPENAI_API_KEY) throw new Error("Per i vocali, attiva la trascrizione Telegram e imposta OPENAI_API_KEY nelle variabili d’ambiente.");
  if (data.length > 15 * 1024 * 1024) throw new Error("Vocale troppo grande (max 15 MB).");
  const form = new FormData();
  form.set("model", "gpt-4o-mini-transcribe"); form.set("response_format", "json");
  form.set("file", new Blob([new Uint8Array(data)], { type: mime }), name);
  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form, signal: AbortSignal.timeout(90000) });
    if (!response.ok) throw new Error();
    const result = await response.json();
    if (typeof result.text !== "string" || !result.text.trim()) throw new Error();
    return redactSensitive(result.text).slice(0, 20000);
  } catch { throw new Error("Trascrizione non riuscita. Verifica chiave, credito e formato audio; puoi inviare il testo."); }
}
