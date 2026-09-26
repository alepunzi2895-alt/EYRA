import { NextRequest, NextResponse } from "next/server";
import { runAgent, Attachment } from "@/lib/agent";
import { writeBinary } from "@/lib/drive";
import { today } from "@/lib/kb";
import { agentIssue } from "@/lib/availability";

export const runtime = "nodejs";
export const maxDuration = 300;
const TIPI = ["estratto-conto", "fattura", "contratto", "fiscale", "barca", "altro"];

export async function POST(req: NextRequest) {
  const issue = await agentIssue();
  if (issue) return NextResponse.json({ reply: issue }, { status: 503 });
  const form = await req.formData();
  const tipo = TIPI.includes(String(form.get("tipo"))) ? String(form.get("tipo")) : "altro";
  const entita = String(form.get("entita") ?? "");
  const nota = String(form.get("nota") ?? "");
  const attachments: Attachment[] = []; const saved: string[] = [];
  for (const f of form.getAll("files")) {
    if (!(f instanceof File) || !f.size) continue;
    const data = Buffer.from(await f.arrayBuffer());
    const mime = f.type || "application/octet-stream";
    const p = `80-documenti/${tipo}/${today()}-${f.name}`;
    await writeBinary(p, data, mime);
    saved.push(p); attachments.push({ name: f.name, mime, data });
  }
  if (!attachments.length) return NextResponse.json({ reply: "Nessun file ricevuto." }, { status: 400 });
  try {
    const reply = await runAgent({
      key: "upload", who: "titolare (pagina Carica)", channel: "upload", noHistory: true, attachments,
      text: `Documenti caricati. Tipo: ${tipo}. Entità: ${entita || "non indicata"}. Nota: ${nota || "—"}.\nSalvati in: ${saved.join(", ")}\n` +
        `Crea per ciascuno una scheda in 80-documenti/ (template documento, link_drive = percorso) e proponi gli aggiornamenti che ne derivano${tipo === "estratto-conto" ? " (saldo, entrate/uscite principali, spese ricorrenti, anomalie)" : tipo === "fattura" ? " (scadenza di pagamento, fornitore, importi)" : ""}.`,
    });
    return NextResponse.json({ reply, saved });
  } catch (e: any) {
    return NextResponse.json({ reply: `File salvati, analisi non riuscita: ${e?.message ?? e}`, saved }, { status: 500 });
  }
}
