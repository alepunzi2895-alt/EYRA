/** Short, complete phrases can be spoken while the rest is still streaming. */
export function speechChunk(buffer: string, flush = false): { text: string; rest: string } {
  const end = buffer.search(/[.!?](?:\s|$)|\n/);
  const boundary = end >= 0 ? end + 1 : buffer.length > 220 ? buffer.lastIndexOf(" ", 220) : flush ? buffer.length : 0;
  if (boundary <= 0) return { text: "", rest: buffer };
  return { text: buffer.slice(0, boundary), rest: buffer.slice(boundary) };
}
export function spokenText(text: string) {
  return text.replace(/```[\s\S]*?```/g, " Blocco di codice disponibile nel testo. ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#`>|]/g, "").replace(/\s+/g, " ").trim();
}
