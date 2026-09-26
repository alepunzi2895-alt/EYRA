import { readText, writeText, index } from "./drive";

export type Turn = { role: "user" | "assistant"; text: string; at: string };
const path = (key: string) => `95-log/chat/${key.replace(/[^a-z0-9_-]/gi, "_")}.json`;

export async function loadHistory(key: string): Promise<Turn[]> {
  if (!(await index()).has(path(key))) return [];
  try { return JSON.parse(await readText(path(key))); } catch { return []; }
}

export async function appendHistory(key: string, turns: Turn[], keep = 30) {
  const all = [...(await loadHistory(key)), ...turns].slice(-keep);
  await writeText(path(key), JSON.stringify(all, null, 1), "application/json");
}
