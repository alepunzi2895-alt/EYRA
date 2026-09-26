"use server";
import { requireSession } from "@/lib/web-session";
import { runJob, JOBS, brief, type Job } from "@/lib/automations";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
export async function executeJob(kind: string) {
  await requireSession();
  if (!Object.hasOwn(JOBS, kind)) return "Automatismo non valido.";
  try { const result = await runJob(kind as Job, `manual-${randomUUID()}`); revalidatePath("/automatismi"); return result; }
  catch { return "Esecuzione non riuscita. Controlla il database e i collegamenti."; }
}
export async function previewBrief(weekly: boolean) {
  await requireSession();
  try { return await brief(weekly); } catch { return "Collega l’archivio per preparare il riepilogo."; }
}
