import { seedDrive } from "@/lib/seed";
import { page, esc } from "@/lib/html";
import { settings, save, dbConfigured } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  const s = await settings();
  if (s.KB_ROOT_FOLDER_ID) return page("Archivio già presente", "<p>La cartella archivio è già impostata. Per crearne una nuova svuota prima il campo in Setup.</p>");
  if (!process.env.GOOGLE_REFRESH_TOKEN) return page("Prima collega Google", "<p>Manca GOOGLE_REFRESH_TOKEN.</p>");
  const { id, files } = await seedDrive(s.APP_NAME);
  const link = `<p><a href="https://drive.google.com/drive/folders/${id}" target="_blank" rel="noreferrer">Apri su Drive</a></p>`;
  if (dbConfigured() && (await save({ KB_ROOT_FOLDER_ID: id }, "setup")).ok)
    return page("Archivio creato", `<p>Creata cartella <b>${esc(s.APP_NAME)}</b> nel tuo Drive con ${files} file. Collegata automaticamente: non serve fare altro.</p>${link}`);
  return page("Archivio creato", `<p>Creata cartella <b>${esc(s.APP_NAME)}</b> nel tuo Drive con ${files} file.</p>
<p>Database non configurato: copia in Vercel come <b>KB_ROOT_FOLDER_ID</b>, poi Redeploy:</p>
<textarea readonly rows="2" style="width:100%;font:14px monospace;padding:10px" onclick="this.select()">${id}</textarea>${link}`);
}
