import { NextRequest, NextResponse } from "next/server";
import { authToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!process.env.APP_PASSWORD || email !== (process.env.APP_EMAIL ?? "").toLowerCase() || form.get("password") !== process.env.APP_PASSWORD) return NextResponse.redirect(new URL("/login?e=1", req.url), 303);
  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set("auth", await authToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return res;
}
