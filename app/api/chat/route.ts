import { NextRequest, NextResponse } from "next/server";
import { runAgent, Attachment } from "@/lib/agent";
import { writeBinary } from "@/lib/drive";
import { today } from "@/lib/kb";
import { agentIssue } from "@/lib/availability";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const issue = await agentIssue();
  if (issue) return NextResponse.json({ reply: issue }, { status: 503 });
  const form = await req.formData();
  const text = String(form.get("text") ?? "");
  const attachments: Attachment[] = [];
  for (const f of form.getAll("files")) {
    if (!(f instanceof File) || !f.size) continue;
    const data = Buffer.from(await f.arrayBuffer());
    const mime = f.type || "application/octet-stream";
    await writeBinary(`90-inbox/allegati/${today()}-${f.name}`, data, mime);
    attachments.push({ name: f.name, mime, data });
  }
  try {
    const reply = await runAgent({ key: "web", who: "web", channel: "web", text, attachments });
    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json({ reply: `Errore: ${e?.message ?? e}` }, { status: 500 });
  }
}
