import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { authToken } from "../lib/auth";
import { middleware } from "../middleware";
import { POST } from "../app/api/login/route";

export async function testAuth() {
  const names = ["AUTH_SECRET", "APP_EMAIL", "APP_PASSWORD"] as const;
  const before = names.map((name) => process.env[name]);
  const request = (path: string, cookie?: string) => new NextRequest(`https://example.test${path}`, {
    headers: cookie ? { cookie: `auth=${cookie}` } : {},
  });
  try {
    process.env.AUTH_SECRET = "test-only-secret";
    process.env.APP_EMAIL = "demo@example.test";
    process.env.APP_PASSWORD = "test-only-password";
    const token = await authToken();
    assert.equal(token, createHmac("sha256", "test-only-secret").update("ok:demo@example.test:test-only-password").digest("hex"));
    assert.equal((await middleware(request("/", token!))).headers.get("x-middleware-next"), "1");
    assert.equal((await middleware(request("/", "invalid"))).headers.get("location"), "https://example.test/login");
    for (const name of names) {
      const saved = process.env[name];
      for (const value of [undefined, "", "   "]) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
        assert.equal(await authToken(), null);
        assert.equal((await middleware(request("/"))).headers.get("location"), "https://example.test/login");
        assert.equal((await middleware(request("/", token!))).headers.get("location"), "https://example.test/login");
        assert.equal((await middleware(request("/api/chat", token!))).status, 401);
        assert.equal((await middleware(request("/eyra-wordmark.svg"))).status, 200);
        const response = await POST(new NextRequest("https://example.test/api/login", { method: "POST" }));
        assert.equal(response.headers.get("location"), "https://example.test/login?e=config");
        assert.equal(response.cookies.get("auth"), undefined);
      }
      process.env[name] = saved;
    }
    console.log("✓ autenticazione: sessioni valide, cookie errati e configurazione mancante");
  } finally {
    names.forEach((name, index) => {
      if (before[index] === undefined) delete process.env[name];
      else process.env[name] = before[index];
    });
  }
}
