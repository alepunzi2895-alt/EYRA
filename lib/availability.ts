import { setting } from "./config";

/** Controlla i prerequisiti senza chiamare Google e senza inventare dati. */
export async function archiveIssue(): Promise<string | null> {
  if (process.env.KB_LOCAL_DIR) return null;
  if (!["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"].every((key) => process.env[key]?.trim()))
    return "Google non è ancora collegato. Puoi esplorare l’interfaccia; collega Google nelle Impostazioni per attivare l’archivio.";
  try {
    if (!(await setting("KB_ROOT_FOLDER_ID"))) return "Google configurato. Crea o collega la cartella archivio nelle Impostazioni per iniziare.";
  } catch {
    return "Impostazioni non raggiungibili. Verifica il collegamento al database nelle Impostazioni.";
  }
  return null;
}

export async function agentIssue(): Promise<string | null> {
  const issue = await archiveIssue();
  if (issue) return issue;
  if (!process.env.ANTHROPIC_API_KEY?.trim()) return "Claude non è ancora collegato. Aggiungi la chiave Anthropic per attivare chat e analisi dei documenti.";
  return null;
}
