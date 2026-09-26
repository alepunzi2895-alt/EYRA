export async function authToken(): Promise<string | null> {
  const secret = process.env.AUTH_SECRET;
  // Una configurazione incompleta non deve causare crash né creare sessioni.
  if (!secret?.trim() || !process.env.APP_EMAIL?.trim() || !process.env.APP_PASSWORD?.trim()) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("ok:" + (process.env.APP_EMAIL ?? "") + ":" + (process.env.APP_PASSWORD ?? "")));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
