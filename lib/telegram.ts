import { timingSafeEqual } from "node:crypto";
import { setting, list } from "./config";

export function verifyTelegramSecret(header: string | null): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(secret), actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function telegramAllowed(chatId: number): Promise<boolean> {
  return list(await setting("TELEGRAM_ALLOWED_CHAT_IDS")).includes(String(chatId));
}

async function call<T>(method: string, body: object = {}): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error("Imposta TELEGRAM_BOT_TOKEN nelle variabili d’ambiente.");
  // Non propagare errori fetch: possono includere l’URL contenente il token.
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15_000), cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error();
    return data.result as T;
  } catch {
    throw new Error("Telegram non raggiungibile o richiesta rifiutata. Verifica token, webhook e avvio della chat con il bot.");
  }
}

export async function sendTelegramText(chatId: number, text: string) {
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i += 4000)
    await call("sendMessage", { chat_id: chatId, text: chars.slice(i, i + 4000).join("") });
}

export async function telegramStatus(): Promise<string> {
  const bot = await call<{ username: string }>("getMe");
  const hook = await call<{ url: string; pending_update_count: number; last_error_date?: number }>("getWebhookInfo");
  return `Bot @${bot.username} raggiungibile. ${hook.url ? `Webhook: ${hook.url}.` : "Webhook da collegare."} Aggiornamenti in attesa: ${hook.pending_update_count}.${hook.last_error_date ? " Telegram segnala un precedente errore di consegna: controlla il deploy e ricollega il webhook." : ""}`;
}

export async function connectTelegram(origin: string): Promise<void> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !/^[A-Za-z0-9_-]{1,256}$/.test(secret))
    throw new Error("Imposta TELEGRAM_WEBHOOK_SECRET: stringa casuale con lettere, numeri, trattini o underscore (max 256 caratteri).");
  const url = new URL("/api/telegram", origin);
  if (url.protocol !== "https:") throw new Error("Il webhook richiede il sito pubblicato in HTTPS.");
  await call("setWebhook", { url: url.href, secret_token: secret, allowed_updates: ["message"], max_connections: 1 });
}

type TelegramFile = { file_id: string; file_size?: number; file_name?: string; mime_type?: string; duration?: number };
export type TelegramMessage = { chat: { id: number; type: "private" }; from: { id: number }; text?: string; caption?: string; document?: TelegramFile; voice?: TelegramFile; photo?: TelegramFile[] };
export function privateMessage(update: unknown): { id: number; message: TelegramMessage } | null {
  if (!update || typeof update !== "object") return null;
  const { update_id: id, message: m } = update as { update_id?: unknown; message?: TelegramMessage };
  if (!Number.isSafeInteger(id) || !m || m.chat?.type !== "private" || !Number.isSafeInteger(m.chat.id) || m.chat.id <= 0 || m.from?.id !== m.chat.id) return null;
  if (m.text !== undefined && typeof m.text !== "string") return null;
  if (m.caption !== undefined && typeof m.caption !== "string") return null;
  return { id: id as number, message: m };
}

export async function telegramAttachment(m: TelegramMessage) {
  const file = m.voice || m.document || (Array.isArray(m.photo) ? m.photo.at(-1) : undefined);
  if (!file) return null;
  if (typeof file.file_id !== "string" || (file.file_size ?? 0) > 15 * 1024 * 1024 || (m.voice?.duration ?? 0) > 600) throw new Error("Allegato troppo grande: massimo 15 MB; vocali fino a 10 minuti.");
  const name = m.voice ? "vocale.ogg" : m.photo ? "foto.jpg" : (file.file_name || "documento").replace(/[^\w.\-]/g, "_").slice(-120);
  if (!/\.(ogg|pdf|png|jpe?g|webp|xlsx?|csv|txt|md|xml|p7m)$/i.test(name)) throw new Error("Formato non supportato. Invia PDF, immagini, Excel, CSV, XML, testo o un messaggio vocale.");
  const meta = await call<{ file_path: string; file_size?: number }>("getFile", { file_id: file.file_id });
  if (typeof meta.file_path !== "string" || !/^[\w/.-]+$/.test(meta.file_path) || meta.file_path.split("/").includes("..") || (meta.file_size ?? 0) > 15 * 1024 * 1024) throw new Error("Allegato non valido o troppo grande.");
  try {
    const response = await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${meta.file_path}`, { signal: AbortSignal.timeout(30000), redirect: "error" });
    if (!response.ok || Number(response.headers.get("content-length")) > 15 * 1024 * 1024 || !response.body) throw new Error();
    const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
    while (true) { const r = await reader.read(); if (r.done) break; size += r.value.length; if (size > 15 * 1024 * 1024) { await reader.cancel(); throw new Error(); } chunks.push(r.value); }
    const mime = m.voice ? "audio/ogg" : m.photo ? "image/jpeg" : file.mime_type || "application/octet-stream";
    return { name, mime, data: Buffer.concat(chunks), voice: !!m.voice };
  } catch { throw new Error("Download Telegram non riuscito. Riprova con un file più piccolo."); }
}
