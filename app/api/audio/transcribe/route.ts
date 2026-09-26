import { NextRequest, NextResponse } from "next/server";
import { transcribeWeb } from "@/lib/web-audio";
import { AUDIO_MAX_BYTES, recordingFormat } from "@/lib/audio-catalog";
export const runtime = "nodejs";
export const maxDuration = 90;
export async function POST(req: NextRequest) {
  let form;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Registrazione non valida." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || !file.size || file.size > AUDIO_MAX_BYTES || !recordingFormat(file.type)) return NextResponse.json({ error: "Usa MP4 o WebM, massimo 4 MB." }, { status: 400 });
  try { return NextResponse.json({ text: await transcribeWeb(file) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Trascrizione non disponibile." }, { status: 503 }); }
}
