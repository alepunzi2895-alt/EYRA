import { NextRequest, NextResponse } from "next/server";
import { runAgent, Attachment } from "@/lib/agent";
import { writeBinary } from "@/lib/drive";
import { randomUUID } from "node:crypto";
import { chatIssue, archiveIssue } from "@/lib/availability";
import { redactSensitive } from "@/lib/privacy";
import { validConversation } from "@/lib/history";
import { attachmentMime, supportedAttachment, WEB_ATTACHMENT_LIMIT, WEB_ATTACHMENT_COUNT } from "@/lib/attachment-types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const issue = await chatIssue();
  if (issue) return NextResponse.json({ reply: issue }, { status: 503 });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ reply: "Messaggio o allegati non validi." }, { status: 400 }); }
  const text = String(form.get("text") ?? "");
  if (text.length > 30000) return NextResponse.json({ reply: "Messaggio troppo lungo (massimo 30.000 caratteri)." }, { status: 400 });
  const key = String(form.get("conversation") ?? "web");
  if (!validConversation(key) || !key.startsWith("web")) return NextResponse.json({ reply: "Conversazione non valida." }, { status: 400 });
  const attachments: Attachment[] = [];
  const archiveReady = !await archiveIssue();
  const uploads = form.getAll("files").filter((f): f is File => f instanceof File && !!f.size);
  if (!text.trim() && !uploads.length) return NextResponse.json({ reply: "Scrivi un messaggio o allega un documento." }, { status: 400 });
  if (uploads.length > WEB_ATTACHMENT_COUNT || uploads.reduce((n, f) => n + f.size, 0) > WEB_ATTACHMENT_LIMIT) return NextResponse.json({ reply: "Massimo 8 allegati e 4 MB complessivi." }, { status: 413 });
  if (uploads.some(f => !supportedAttachment(f.name, f.type))) return NextResponse.json({ reply: "Formato non supportato. Usa JPG, PNG, WebP, PDF, Excel o testo." }, { status: 400 });
  try {
  for (const f of uploads) {
    const data = Buffer.from(await f.arrayBuffer());
    const mime = attachmentMime(f.name, f.type);
    if (archiveReady) await writeBinary(`90-inbox/allegati/${randomUUID()}-${f.name.replace(/[^\w.\-]/g, "_").slice(-120)}`, data, mime);
    attachments.push({ name: f.name, mime, data });
  }
  } catch { return NextResponse.json({ reply: "Allegato non elaborato: verifica il collegamento all’archivio e riprova." }, { status: 503 }); }
  const confirmationText = form.get("dictated") === "true" ? "" : text;
  if (req.headers.get("accept") === "application/x-ndjson") {
    const encoder = new TextEncoder();
    let closed = false;
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (event: unknown) => { if (!closed) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n")); };
        try {
          const reply = await runAgent({ key, who: "web", channel: "web", text, confirmationText, attachments, onUpdate: emit });
          emit({ type: "done", text: reply });
        } catch (e) { emit({ type: "error", text: `Errore: ${redactSensitive(e instanceof Error ? e.message : "Richiesta non riuscita")}` }); }
        finally { if (!closed) { closed = true; controller.close(); } }
      },
      cancel() { closed = true; },
    });
    return new Response(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
  }
  try {
    const reply = await runAgent({ key, who: "web", channel: "web", text, confirmationText, attachments });
    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json({ reply: `Errore: ${redactSensitive(String(e?.message ?? "Richiesta non riuscita"))}` }, { status: 500 });
  }
}
