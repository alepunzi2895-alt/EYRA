import { backup } from "@/lib/backup";
import { page, esc } from "@/lib/html";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  return page("Backup eseguito", `<p>${esc(await backup())}</p>`);
}
