"use server";
import { requireSession } from "@/lib/web-session";
import { proposeTask } from "@/lib/workflows";
export async function taskProposal(fd: FormData) {
  await requireSession();
  try { return await proposeTask({ id: String(fd.get("id") || "") || undefined, kind: String(fd.get("kind")), title: String(fd.get("title")), owner: String(fd.get("owner")), next: String(fd.get("next")), date: String(fd.get("date")), status: String(fd.get("status")), recurrence: String(fd.get("recurrence") || "none"), notice: String(fd.get("notice") || "7") }); }
  catch (e) { return { error: e instanceof Error ? e.message : "Proposta non riuscita." }; }
}
