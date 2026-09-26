import { NextRequest, NextResponse, after } from "next/server";
import { verifyTelegramSecret, telegramAllowed, sendTelegramText, privateMessage } from "@/lib/telegram";
import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 300;

// Come per WhatsApp: dedup best effort per istanza, con memoria limitata.
const seen = new Set<number>();

export async function POST(req: NextRequest) {
  if (!verifyTelegramSecret(req.headers.get("x-telegram-bot-api-secret-token")))
    return new NextResponse("unauthorized", { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return new NextResponse("invalid JSON", { status: 400 }); }
  const update = privateMessage(body);
  if (!update || seen.has(update.id)) return NextResponse.json({ ok: true });
  const { message: m } = update;
  const start = /^\/(start|id)(?:@[a-z0-9_]+)?(?:\s|$)/i.test(m.text ?? "");
  // /start e /id mostrano solo l’ID della propria chat, mai dati dell’archivio.
  if (!start && !(await telegramAllowed(m.chat.id))) return NextResponse.json({ ok: true });
  seen.add(update.id);
  if (seen.size > 2000) seen.delete(seen.values().next().value!);
  after(async () => {
    try {
      if (start) {
        await sendTelegramText(m.chat.id, `Il tuo ID chat è ${m.chat.id}. Inseriscilo in Impostazioni → Telegram → ID chat autorizzati, poi salva. Puoi quindi scrivere all’assistente.`);
      } else if (!m.text) {
        await sendTelegramText(m.chat.id, "Telegram supporta per ora messaggi di testo. Carica documenti e immagini dal sito.");
      } else {
        const reply = await runAgent({ key: `tg-${m.chat.id}`, who: `telegram:${m.from.id}`, channel: "telegram", text: m.text });
        await sendTelegramText(m.chat.id, reply);
      }
    } catch {
      seen.delete(update.id);
      console.error("Elaborazione Telegram non riuscita.");
      await sendTelegramText(m.chat.id, "Non riesco a completare la richiesta. Verifica i collegamenti nelle Impostazioni e riprova.").catch(() => {});
    }
  });
  return NextResponse.json({ ok: true });
}
