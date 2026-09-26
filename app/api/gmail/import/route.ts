import { importEmails } from "@/lib/gmail";
import { page, esc } from "@/lib/html";
import { settings, gmailLabel } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  const r = await importEmails();
  const body = r.length
    ? r.map((e) => `<h3>${esc(e.oggetto)}</h3><p style="color:#5b7a89">${esc(e.da)}</p><p style="white-space:pre-wrap">${esc(e.riepilogo)}</p>`).join("") + `<p><a href="/inbox">Vai a Da approvare</a></p>`
    : `<p>Nessuna email nuova con etichetta <b>${esc(gmailLabel(await settings()))}</b>.</p>`;
  return page(`Email importate: ${r.length}`, body);
}
