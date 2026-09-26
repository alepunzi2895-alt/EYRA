export const WEB_ATTACHMENT_LIMIT = 4_000_000;
export const WEB_ATTACHMENT_COUNT = 8;
export function attachmentMime(name: string, mime: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const types: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", pdf: "application/pdf", txt: "text/plain", md: "text/markdown", csv: "text/csv", xml: "application/xml", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", p7m: "application/pkcs7-mime" };
  return types[ext] || mime || "application/octet-stream";
}
export function supportedAttachment(name: string, mime: string) {
  return /^(image\/(jpeg|png|webp|gif)|application\/pdf|text\/)/.test(attachmentMime(name, mime)) || /\.(xlsx?|xml|p7m)$/i.test(name);
}
