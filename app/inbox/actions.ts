"use server";
import { revalidatePath } from "next/cache";
import { apply, loadPatch, reject } from "@/lib/patch";

export async function applica(code: string, force: boolean) {
  const p = await loadPatch(code);
  if (!p || p.stato !== "pending") return { error: "Patch non trovata o già gestita." };
  const r = await apply(p, force);
  revalidatePath("/inbox"); revalidatePath("/");
  return r.errors.length ? { error: r.errors.join("; ") } : { ok: `Applicata: ${r.files.length} file`, validazione: r.validazione };
}

export async function rifiuta(code: string) {
  await reject(code);
  revalidatePath("/inbox");
}
