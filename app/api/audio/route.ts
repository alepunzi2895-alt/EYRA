import { NextRequest, NextResponse } from "next/server";
import { synthesize, webAudioStatus } from "@/lib/web-audio";
import { AI_VOICES, isAiVoice } from "@/lib/audio-catalog";
export const runtime = "nodejs";
export const maxDuration = 60;
// Tutte le route /api/audio sono protette dal middleware di sessione.
export async function GET() {
  try { return NextResponse.json({ ...await webAudioStatus(), voices: AI_VOICES }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ enabled: false, reason: "Configurazione audio non raggiungibile.", voices: AI_VOICES }, { status: 503 }); }
}
export async function POST(req: NextRequest) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 }); }
  if (!body || typeof body.text !== "string" || !body.text.trim() || body.text.length > 2000 || typeof body.voice !== "string" || !isAiVoice(body.voice)) return NextResponse.json({ error: "Testo o voce non validi." }, { status: 400 });
  try {
    const audio = await synthesize(body.text, body.voice, req.signal);
    return new Response(audio.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store, no-transform" } });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Voce non disponibile." }, { status: 503 }); }
}
