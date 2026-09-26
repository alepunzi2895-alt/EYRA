import { NextRequest, NextResponse } from "next/server";
import { auth } from "@googleapis/drive";
import crypto from "node:crypto";

export const runtime = "nodejs";
const SCOPES = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/gmail.modify"];

export async function GET(req: NextRequest) {
  const redirect = `${req.nextUrl.origin}/api/setup/google/callback`;
  const client = new auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirect);
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: SCOPES, state }));
  res.cookies.set("oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
