import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { archiveIssue, agentIssue } from "../lib/availability";
import { verifyTelegramSecret, privateMessage, connectTelegram, sendTelegramText, telegramStatus } from "../lib/telegram";
import { POST as chat } from "../app/api/chat/route";
import { POST as upload } from "../app/api/upload/route";
import { POST as telegram } from "../app/api/telegram/route";
import { middleware } from "../middleware";

export async function testConnections() {
  const keys = ["KB_LOCAL_DIR", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "ANTHROPIC_API_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"];
  const before = keys.map((k) => process.env[k]);
  const originalFetch = globalThis.fetch;
  try {
    for (const key of keys) delete process.env[key];
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw new Error("unexpected network"); };
    assert.match((await archiveIssue())!, /Google/);
    assert.match((await agentIssue())!, /Google/);
    for (const handler of [chat, upload]) {
      const res = await handler(new NextRequest("https://example.test/api/test", { method: "POST" }));
      assert.equal(res.status, 503);
      assert.match((await res.json()).reply, /Google|Claude/);
    }
    assert.equal(calls, 0, "nessuna chiamata esterna senza Google");
    process.env.KB_LOCAL_DIR = "kb-demo";
    assert.equal(await archiveIssue(), null);
    assert.match((await agentIssue())!, /Claude/);
    process.env.ANTHROPIC_API_KEY = "test-only";
    assert.equal(await agentIssue(), null);

    assert.equal(verifyTelegramSecret(null), false);
    process.env.TELEGRAM_WEBHOOK_SECRET = "test-only-secret";
    assert.equal(verifyTelegramSecret("test-only-secret"), true);
    assert.equal(verifyTelegramSecret("test-only-secrex"), false);
    assert.equal(verifyTelegramSecret("x"), false);
    assert.equal((await telegram(new NextRequest("https://example.test/api/telegram", { method: "POST" }))).status, 401);
    assert.equal((await middleware(new NextRequest("https://example.test/api/telegram"))).headers.get("x-middleware-next"), "1");
    assert.equal((await middleware(new NextRequest("https://example.test/api/telegram-private"))).status, 401);
    const msg = { chat: { id: 123, type: "private" }, from: { id: 123 }, text: "ok ABC12" };
    assert.equal(privateMessage({ update_id: 1, message: msg })?.message.text, "ok ABC12");
    for (const bad of [null, {}, { update_id: 1, message: { ...msg, chat: { id: 123, type: "group" } } }, { update_id: 1, message: { ...msg, from: { id: 456 } } }])
      assert.equal(privateMessage(bad), null);

    process.env.TELEGRAM_BOT_TOKEN = "test-only-token";
    const sent: { method: string; body: Record<string, unknown> }[] = [];
    globalThis.fetch = async (url, options) => {
      const method = String(url).split("/").at(-1)!;
      sent.push({ method, body: JSON.parse(String(options?.body)) });
      return Response.json({ ok: true, result: method === "getMe" ? { username: "test_bot" } : method === "getWebhookInfo" ? { url: "", pending_update_count: 0 } : true });
    };
    await assert.rejects(() => connectTelegram("http://localhost:3000"), /HTTPS/);
    await connectTelegram("https://example.test");
    assert.equal(sent[0].body.url, "https://example.test/api/telegram");
    assert.equal(sent[0].body.secret_token, "test-only-secret");
    assert.deepEqual(sent[0].body.allowed_updates, ["message"]);
    await sendTelegramText(123, "a".repeat(4100));
    assert.deepEqual(sent.filter((s) => s.method === "sendMessage").map((s) => String(s.body.text).length), [4000, 100]);
    assert.match(await telegramStatus(), /@test_bot/);
    globalThis.fetch = async () => { throw new Error("https://api.telegram.org/bottest-only-token/sendMessage"); };
    await assert.rejects(() => sendTelegramText(123, "test"), (e: Error) => !e.message.includes("test-only-token") && /Telegram/.test(e.message));
    console.log("✓ collegamenti: Google assente, API protette, webhook Telegram, gruppi esclusi e token non esposti");
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((k, i) => { if (before[i] === undefined) delete process.env[k]; else process.env[k] = before[i]; });
  }
}
