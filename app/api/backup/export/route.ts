import { buildBackup } from "@/lib/backup";
import { requireSession } from "@/lib/web-session";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET() {
  await requireSession();
  try {
    const { data, name } = await buildBackup();
    if (process.env.VERCEL && data.length > 4_000_000) return new Response("Copia oltre il limite di download dal sito. Esegui Backup completo nel centro Automatismi e scarica lo ZIP dalla cartella _backup su Drive, oppure configura la copia separata.", { status: 413 });
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });
  } catch { return new Response("Backup non disponibile. Controlla archivio e database nel centro Automatismi.", { status: 503 }); }
}
