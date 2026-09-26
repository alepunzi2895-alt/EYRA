import { NextRequest, NextResponse, after } from "next/server";
import { verifyTelegramSecret, telegramAllowed, sendTelegramText, privateMessage, telegramAttachment } from "@/lib/telegram";
import { runAgent } from "@/lib/agent";
import { claimWebhook, finishWebhook } from "@/lib/webhook-state";
import { transcribe } from "@/lib/transcription";
import { writeBinary } from "@/lib/drive";
import { randomUUID } from "node:crypto";
import { chatIssue, archiveIssue } from "@/lib/availability";

export const runtime = "nodejs";
export const maxDuration = 300;

// Fast path per istanza; gli aggiornamenti autorizzati sono deduplicati anche su Turso.
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
  const key = `telegram-${update.id}`;
  if (!start) {
    try { if (!(await claimWebhook(key))) return NextResponse.json({ ok: true }); }
    catch { return new NextResponse("storage unavailable", { status: 503 }); }
  }
  seen.add(update.id);
  if (seen.size > 2000) seen.delete(seen.values().next().value!);
  after(async () => {
    try {
      if (start) {
        await sendTelegramText(m.chat.id, `Il tuo ID chat è ${m.chat.id}. Inseriscilo in Impostazioni → Telegram → ID chat autorizzati, poi salva. Puoi quindi scrivere all’assistente.`);
      } else {
        const issue = await chatIssue(); if (issue) { await sendTelegramText(m.chat.id, issue); await finishWebhook(key, "done"); return; }
        const attachment = await telegramAttachment(m);
        let text = m.text || m.caption || "Analizza l’allegato e proponi le informazioni da conservare.";
        if (attachment?.voice) {
          text = await transcribe(attachment.data, attachment.name, attachment.mime);
          await sendTelegramText(m.chat.id, `Ho trascritto: ${text}\n\nPer approvare modifiche invia il codice come messaggio di testo.`);
        } else if (attachment) {
          if (!await archiveIssue()) await writeBinary(`90-inbox/allegati/${randomUUID()}-${attachment.name}`, attachment.data, attachment.mime);
        }
        else if (!m.text) { await sendTelegramText(m.chat.id, "Invia un testo, una foto, un documento o un vocale."); await finishWebhook(key, "done"); return; }
        const reply = await runAgent({ key: `tg-${m.chat.id}`, who: `telegram:${m.from.id}`, channel: "telegram", text, confirmationText: m.text || "", attachments: attachment && !attachment.voice ? [attachment] : [] });
        await sendTelegramText(m.chat.id, reply);
        await finishWebhook(key, "done");
      }
    } catch (e) {
      seen.delete(update.id);
      if (!start) await finishWebhook(key, "error").catch(() => {});
      console.error("Elaborazione Telegram non riuscita.");
      await sendTelegramText(m.chat.id, e instanceof Error && /trascrizione|vocal|Allegato|Formato|Download/i.test(e.message) ? e.message : "Non riesco a completare la richiesta. Verifica i collegamenti nelle Impostazioni e invia di nuovo il messaggio.").catch(() => {});
    }
  });
  return NextResponse.json({ ok: true });
}
