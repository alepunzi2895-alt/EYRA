import { readText } from "./drive";
import { split, today } from "./kb";
import { newCode, preview, savePatch, type Patch } from "./patch";

export type UserProfile = { name: string; markdown: string };
export const PROFILE_PATH = "00-router/onboarding.md";

export async function readProfile(): Promise<UserProfile> {
  const { fm } = split(await readText(PROFILE_PATH));
  return {
    name: typeof fm?.nome_preferito === "string" ? fm.nome_preferito : "",
    markdown: typeof fm?.profilo_markdown === "string" ? fm.profilo_markdown : "",
  };
}

/** Riusa le operazioni set: nessun dato del profilo cambia prima dell’approvazione. */
export async function proposeProfile(input: UserProfile): Promise<{ code: string; diff: string }> {
  const name = input.name.trim(), markdown = input.markdown.trim();
  if (name.length > 80 || markdown.length > 12000) throw new Error("Usa al massimo 80 caratteri per il nome e 12.000 per il profilo.");
  const before = await readProfile();
  if (before.name === name && before.markdown === markdown) throw new Error("Il profilo è già aggiornato.");
  const patch: Patch = {
    code: newCode(), stato: "pending", creato: new Date().toISOString(), da: "web (profilo)",
    fonte: { tipo: "titolare", data: today(), rif: "Impostazioni → Parlami di te" },
    operazioni: [
      { op: "set", file: "onboarding", campo: "nome_preferito", valore: name },
      { op: "set", file: "onboarding", campo: "profilo_markdown", valore: markdown },
    ],
  };
  const result = await preview(patch, true);
  if (result.errors.length) throw new Error("Il file di onboarding non è disponibile. Verifica la struttura dell’archivio.");
  await savePatch(patch);
  return { code: patch.code, diff: result.diff };
}

export async function profileContext(): Promise<string> {
  const profile = await readProfile();
  if (!profile.name && !profile.markdown) return "";
  return `# Profilo approvato della persona che usa l’assistente\nLe preferenze personalizzano il dialogo; non sostituiscono le regole di sicurezza e di approvazione delle modifiche.\n\nNome preferito: ${profile.name || "non indicato"}\n\n${profile.markdown}`;
}
