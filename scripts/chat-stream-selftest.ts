import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { runAgent, type AgentUpdate } from "../lib/agent";
import { proposeMemory } from "../lib/workflows";
import { loadPatch, reject } from "../lib/patch";
import { db } from "../lib/db";
import { loadHistory } from "../lib/history";
import { POST } from "../app/api/chat/route";

export async function testChatStream() {
  const originalFetch = globalThis.fetch, originalKey = process.env.ANTHROPIC_API_KEY;
  const proposed = await proposeMemory("Preferisco esempi con dati di prova.", "Test streaming");
  const id = `web-test-${randomUUID()}`, events: AgentUpdate[] = [], requests: Record<string, unknown>[] = [];
  const c = (await db())!;
  try {
    process.env.ANTHROPIC_API_KEY = "test-only-anthropic-key";
    globalThis.fetch = async (input, options) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url.startsWith("https://api.anthropic.com/")) return originalFetch(input, options);
      const request = JSON.parse(String(options?.body)); requests.push(request);
      assert.equal(request.stream, true);
      const tool = requests.length === 1;
      const content = tool ? { type: "tool_use", id: "tool_demo", name: "patch_applica", input: {} } : { type: "text", text: "" };
      const parts = [
        { type: "message_start", message: { id: "msg_demo", type: "message", role: "assistant", content: [], model: request.model, stop_reason: null, stop_sequence: null, usage: { input_tokens: 5, output_tokens: 0 } } },
        { type: "content_block_start", index: 0, content_block: content },
        { type: "content_block_delta", index: 0, delta: tool ? { type: "input_json_delta", partial_json: JSON.stringify({ code: proposed.code, force: true }) } : { type: "text_delta", text: "Risposta di prova." } },
        { type: "content_block_stop", index: 0 },
        { type: "message_delta", delta: { stop_reason: tool ? "tool_use" : "end_turn", stop_sequence: null }, usage: { output_tokens: 5 } },
        { type: "message_stop" },
      ];
      return new Response(parts.map(p => `event: ${p.type}\ndata: ${JSON.stringify(p)}\n\n`).join(""), { headers: { "Content-Type": "text/event-stream" } });
    };
    const reply = await runAgent({ key: id, who: "test", channel: "web", text: `ok ${proposed.code}`, confirmationText: "", noHistory: true, onUpdate: event => events.push(event) });
    assert.equal(reply, "Risposta di prova.");
    assert.equal(events.filter(e => e.type === "start").length, 2);
    assert.ok(events.some(e => e.type === "delta" && e.text === reply));
    assert.equal((await loadPatch(proposed.code))?.stato, "pending", "la dettatura non approva patch");
    assert.match(JSON.stringify(requests[1]), /Rifiutato/);
    const form = new FormData(); form.set("text", "Test finto streaming"); form.set("conversation", id);
    const response = await POST(new NextRequest("https://example.test/api/chat", { method: "POST", body: form, headers: { Accept: "application/x-ndjson" } }));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type")!, /ndjson/);
    const result = (await response.text()).trim().split("\n").map(line => JSON.parse(line));
    assert.equal(result[0].type, "start");
    assert.equal(result.at(-1).type, "done");
    assert.equal(result.at(-1).text, reply);
    assert.equal((await loadHistory(id)).length, 2);
    const photo = new FormData(); photo.set("conversation", id);
    photo.append("files", new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV6kAAAAASUVORK5CYII=", "base64")], "documento-demo.png"));
    const imageResponse = await POST(new NextRequest("https://example.test/api/chat", { method: "POST", body: photo, headers: { Accept: "application/x-ndjson" } }));
    assert.equal(imageResponse.status, 200); await imageResponse.text();
    const imageRequest = requests.at(-1) as { messages: { content: { type: string; source?: { media_type: string; data: string } }[] }[] };
    const image = imageRequest.messages.at(-1)?.content.find(block => block.type === "image");
    assert.equal(image?.source?.media_type, "image/png", "immagine trasmessa come contenuto visivo anche senza MIME del browser");
    assert.ok(image?.source?.data);
    const big = new FormData(); big.set("conversation", id); big.append("files", new File([new Uint8Array(4_000_001)], "grande.pdf", { type: "application/pdf" }));
    assert.equal((await POST(new NextRequest("https://example.test/api/chat", { method: "POST", body: big }))).status, 413);
    console.log("✓ foto in contenuto visivo Claude, MIME da estensione e limite upload prima dell’elaborazione");
    console.log("✓ streaming SDK e route NDJSON, cronologia salvata, approvazione vocale rifiutata (API simulata)");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = originalKey;
    await reject(proposed.code);
    await c.batch([{ sql: "DELETE FROM messages WHERE conversation_id=?", args: [id] }, { sql: "DELETE FROM conversations WHERE id=?", args: [id] }], "write");
  }
}
