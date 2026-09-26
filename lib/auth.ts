export async function authToken(): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("ok:" + (process.env.APP_EMAIL ?? "") + ":" + (process.env.APP_PASSWORD ?? "")));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
