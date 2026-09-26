import { NextRequest } from "next/server";
import { auth } from "@googleapis/drive";
import { page, esc } from "@/lib/html";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code || req.nextUrl.searchParams.get("state") !== req.cookies.get("oauth_state")?.value)
    return page("Collegamento Google non riuscito", "<p>Richiesta non valida o scaduta. Riprova dal setup.</p>");
  const client = new auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, `${req.nextUrl.origin}/api/setup/google/callback`);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) return page("Token non ricevuto", "<p>Google non ha restituito il refresh token. Rimuovi l'accesso dell'app da myaccount.google.com → Sicurezza → App di terze parti e riprova.</p>");
  return page("Google collegato", `<p>Copia questo valore in Vercel → Settings → Environment Variables come <b>GOOGLE_REFRESH_TOKEN</b>, poi fai Redeploy. Non viene salvato da nessuna parte: chiudi la pagina dopo averlo copiato.</p>
<textarea readonly rows="4" style="width:100%;font:14px monospace;padding:10px" onclick="this.select()">${esc(tokens.refresh_token)}</textarea>`);
}
