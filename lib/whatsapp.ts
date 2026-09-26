import crypto from "node:crypto";
import { setting, list } from "./config";

const API = "https://graph.facebook.com/v21.0";
const token = () => process.env.WA_ACCESS_TOKEN!;

export function verifySignature(raw: string, header: string | null): boolean {
  const secret = process.env.WA_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const got = header.slice(7);
  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export const allowed = async (from: string) => list(await setting("WA_ALLOWED_NUMBERS")).includes(from);

async function post(body: object): Promise<string | null> {
  const r = await fetch(`${API}/${process.env.WA_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });
  if (r.ok) return null;
  const err = `${r.status} ${await r.text()}`;
  console.error("WA send", err);
  return err;
}

/** Testo libero (solo entro 24h dall'ultimo messaggio dell'utente). Spezza oltre 4000 caratteri. */
export async function sendText(to: string, text: string) {
  for (let i = 0; i < text.length; i += 4000) await post({ to, type: "text", text: { body: text.slice(i, i + 4000) } });
}

/** Restituisce null se inviato, altrimenti l'errore di Meta. */
export async function sendTemplate(to: string, name: string, params: string[]) {
  return post({
    to, type: "template",
    template: { name, language: { code: await setting("WA_TEMPLATE_LANG") }, components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] },
  });
}

export async function markRead(id: string) {
  await post({ status: "read", message_id: id });
}

export async function downloadMedia(id: string): Promise<{ data: Buffer; mime: string }> {
  const meta = await (await fetch(`${API}/${id}`, { headers: { Authorization: `Bearer ${token()}` } })).json();
  const r = await fetch(meta.url, { headers: { Authorization: `Bearer ${token()}` } });
  return { data: Buffer.from(await r.arrayBuffer()), mime: meta.mime_type };
}

/** WhatsApp non rende tabelle markdown né ## titoli: semplifica. */
export function toWhatsApp(md: string): string {
  return md
    .replace(/^#{1,6}\s+(.*)$/gm, "*$1*")
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/^\|?\s*-{3,}.*$/gm, "")
    .replace(/^\|(.*)\|$/gm, (_, row: string) => row.split("|").map((c) => c.trim()).join(" · "))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Per Setup: verifica token e ID numero senza inviare messaggi. */
export async function waStatus(): Promise<string> {
  const r = await fetch(`${API}/${process.env.WA_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name`, { headers: { Authorization: `Bearer ${token()}` } });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message ?? `HTTP ${r.status}`);
  return `Numero ${j.display_phone_number} (${j.verified_name}) collegato.`;
}
