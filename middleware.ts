import { NextRequest, NextResponse } from "next/server";
import { authToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  // Public branding must also load on the unauthenticated login screen.
  if (["/eyra-wordmark.svg", "/eyra-wordmark.png", "/eyra-cosmos.png"].includes(req.nextUrl.pathname)) return NextResponse.next();
  if (req.cookies.get("auth")?.value === (await authToken())) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return new NextResponse("unauthorized", { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!login|api/login|api/whatsapp|api/cron|_next|favicon).*)"] };
