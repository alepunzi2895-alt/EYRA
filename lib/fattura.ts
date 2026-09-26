/** Fatture elettroniche italiane (FatturaPA): .xml o .xml.p7m firmato. */

export function isFattura(name: string, mime: string) {
  return /\.xml(\.p7m)?$/i.test(name) || /\.p7m$/i.test(name) || /xml|pkcs7/.test(mime);
}

/** Estrae l'XML. Per .p7m (CAdES) il contenuto non è cifrato: si cerca il blocco XML nel binario. */
export function extractXml(data: Buffer): string | null {
  let s = data.toString("latin1");
  if (!s.includes("FatturaElettronica") && /^[A-Za-z0-9+/=\s]+$/.test(s.slice(0, 200))) {
    s = Buffer.from(s.replace(/\s/g, ""), "base64").toString("latin1"); // p7m in base64
  }
  const start = s.search(/<\?xml|<[\w:]*FatturaElettronica/);
  const endTag = s.match(/<\/[\w:]*FatturaElettronica>/);
  if (start < 0 || !endTag) return null;
  const end = s.indexOf(endTag[0], start) + endTag[0].length;
  // rimuove eventuali byte ASN.1 spuri inseriti dalla segmentazione OCTET STRING
  const xml = Buffer.from(s.slice(start, end), "latin1").toString("utf8").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  return xml;
}

const pick = (xml: string, tag: string) => [...xml.matchAll(new RegExp(`<(?:\\w+:)?${tag}>([^<]*)</(?:\\w+:)?${tag}>`, "g"))].map((m) => m[1].trim());
const block = (xml: string, tag: string) => xml.match(new RegExp(`<(?:\\w+:)?${tag}>([\\s\\S]*?)</(?:\\w+:)?${tag}>`))?.[1] ?? "";

export function summarize(xml: string): string {
  const ced = block(xml, "CedentePrestatore"), ces = block(xml, "CessionarioCommittente");
  const nome = (b: string) => pick(b, "Denominazione")[0] ?? [pick(b, "Nome")[0], pick(b, "Cognome")[0]].filter(Boolean).join(" ");
  const piva = (b: string) => pick(b, "IdCodice")[0] ?? pick(b, "CodiceFiscale")[0] ?? "";
  const righe = pick(xml, "Descrizione").slice(0, 10);
  return [
    "FATTURA ELETTRONICA (estratto automatico)",
    `Tipo documento: ${pick(xml, "TipoDocumento")[0] ?? "?"}`,
    `Numero: ${pick(xml, "Numero")[0] ?? "?"} — Data: ${pick(xml, "Data")[0] ?? "?"}`,
    `Fornitore: ${nome(ced)} (P.IVA/CF ${piva(ced)})`,
    `Cliente: ${nome(ces)} (P.IVA/CF ${piva(ces)})`,
    `Imponibile: ${pick(xml, "ImponibileImporto").join(" + ") || "?"} — IVA: ${pick(xml, "Imposta").join(" + ") || "?"} — Aliquote: ${[...new Set(pick(xml, "AliquotaIVA"))].join(", ")}`,
    `Totale documento: ${pick(xml, "ImportoTotaleDocumento")[0] ?? "?"}`,
    `Scadenze pagamento: ${pick(xml, "DataScadenzaPagamento").join(", ") || "—"} — Importi: ${pick(xml, "ImportoPagamento").join(", ") || "—"}`,
    `Righe: ${righe.join(" | ")}`,
  ].join("\n");
}
