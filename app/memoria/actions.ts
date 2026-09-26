"use server";
import { requireSession } from "@/lib/web-session";
import { proposeMemory, proposeOperations, memories } from "@/lib/workflows";
export async function remember(fd: FormData) {
  await requireSession();
  try { return await proposeMemory(String(fd.get("text") ?? ""), String(fd.get("source") ?? "Preferenza indicata dal sito")); }
  catch(e) { return { error: e instanceof Error ? e.message : "Proposta non riuscita." }; }
}
export async function forget(fd: FormData) {
  await requireSession();
  const id = String(fd.get("id"));
  if (!(await memories()).some(d => d.id === id)) throw new Error("Memoria non trovata.");
  await proposeOperations([{ op: "set", file: id, campo: "stato", valore: "archiviato" }], "Richiesta di dimenticare una preferenza");
  const { redirect } = await import("next/navigation"); redirect("/inbox");
}
