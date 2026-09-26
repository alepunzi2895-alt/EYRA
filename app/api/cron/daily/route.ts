import { NextRequest, NextResponse } from "next/server";
import { sendReminders, notify } from "@/lib/reminders";
import { importEmails } from "@/lib/gmail";
import { backup } from "@/lib/backup";
import { pendingPatches } from "@/lib/patch";
import { dailyCalendarSync } from "@/lib/calendar";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Un solo cron giornaliero: promemoria, Calendar, import email, backup la domenica. */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("unauthorized", { status: 401 });
  const out: Record<string, unknown> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try { out[name] = await fn(); } catch (e: any) { out[name] = `errore: ${e?.message ?? e}`; console.error(name, e); }
  };
  await step("promemoria", sendReminders);
  await step("calendar", dailyCalendarSync);
  await step("email", async () => {
    const r = await importEmails();
    if (r.length) {
      const n = (await pendingPatches()).length;
      await notify(`${r.length} email importate (${r.map((e) => e.oggetto).join("; ")}). ${n} modifiche da approvare.`);
    }
    return r.length;
  });
  const dow = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", weekday: "short" }).format(new Date());
  if (dow === "Sun") await step("backup", backup);
  return NextResponse.json(out);
}
