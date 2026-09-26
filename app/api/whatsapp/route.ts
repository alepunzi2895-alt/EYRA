import { NextRequest, NextResponse, after } from "next/server";
import { verifySignature, allowed, sendText, markRead, downloadMedia, toWhatsApp } from "@/lib/whatsapp";
import { runAgent, Attachment } from "@/lib/agent";
import { writeBinary } from "@/lib/drive";
import { today } from "@/lib/kb";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WA_VERIFY_TOKEN)
    return new NextResponse(p.get("hub.challenge"), { status: 200 });
  return new NextResponse("forbidden", { status: 403 });
}

const seen = new Set<string>(); // dedup retry Meta (best effort per istanza)

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) return new NextResponse("bad signature", { status: 401 });
  const body = JSON.parse(raw);
  const msgs = (body.entry ?? []).flatMap((e: any) => (e.changes ?? []).flatMap((c: any) => c.value?.messages ?? []));

  for (const m of msgs) {
    if (seen.has(m.id) || !(await allowed(m.from))) continue;
    seen.add(m.id);
    after(() => handle(m).catch(async (e) => {
      console.error(e);
      await sendText(m.from, `Errore: ${e?.message ?? e}. Riprova.`);
    }));
  }
  return NextResponse.json({ ok: true });
}

async function handle(m: any) {
  await markRead(m.id);
  let text = "";
  const attachments: Attachment[] = [];
  if (m.type === "text") text = m.text.body;
  else if (["image", "document"].includes(m.type)) {
    const media = m[m.type];
    const { data, mime } = await downloadMedia(media.id);
    const name = media.filename ?? `${m.type}-${m.id.slice(-6)}.${mime.split("/")[1]?.split(";")[0] ?? "bin"}`;
    const link = await writeBinary(`90-inbox/allegati/${today()}-${name}`, data, mime);
    attachments.push({ name, mime, data });
    text = `${media.caption ?? ""}\n[File salvato su Drive: ${link}]`.trim();
  } else if (m.type === "audio") {
    await sendText(m.from, "Vocali non supportati. Scrivi testo o invia documento.");
    return;
  } else return;

  const reply = await runAgent({ key: `wa-${m.from}`, who: `+${m.from}`, channel: "whatsapp", text, attachments });
  await sendText(m.from, toWhatsApp(reply));
}
