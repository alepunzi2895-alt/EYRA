/** Avoid retaining obvious credentials accidentally pasted into a conversation. */
export function redactSensitive(text: string): string {
  for (const [key, value] of Object.entries(process.env)) if (/(?:KEY|TOKEN|SECRET|PASSWORD)$/.test(key) && value && value.length >= 8) text = text.split(value).join("[segreto rimosso]");
  return text.replace(/\bsk-[A-Za-z0-9_-]{12,}/g, "[chiave rimossa]")
    .replace(/\b(?:\d{8,12}:[A-Za-z0-9_-]{30,}|ya29\.[A-Za-z0-9_.-]+)\b/g, "[token rimosso]")
    .replace(/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b/g, "[IBAN rimosso]")
    .replace(/((?:password|passwd|pin|client_secret|refresh_token|api[_ -]?key|spid|cl@ve)\s*[:=]\s*)[^\s,;]+/gi, "$1[rimosso]")
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, "[chiave privata rimossa]");
}
