import { NextRequest, NextResponse } from "next/server";
import { runDaily } from "@/lib/automations";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Un solo cron giornaliero: promemoria, Calendar, import email, backup la domenica. */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("unauthorized", { status: 401 });
  return NextResponse.json(await runDaily());
}
