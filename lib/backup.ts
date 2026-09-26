import { zipSync, strToU8 } from "fflate";
import { index, isFolder, readText, writeBinary, trash } from "./drive";
import { today } from "./kb";

const KEEP = 8;

/** Zip di tutti i file testo della KB (md, json) su _backup/. Mantiene gli ultimi 8. */
export async function backup(): Promise<string> {
  const map = await index(true);
  const files: Record<string, Uint8Array> = {};
  for (const n of map.values()) {
    if (isFolder(n) || n.path.startsWith("_backup/") || n.path.startsWith("90-inbox/allegati/")) continue;
    if (!/\.(md|json)$/.test(n.name)) continue;
    files[n.path] = strToU8(await readText(n.path));
  }
  const path = `_backup/eyra-kb-${today()}.zip`;
  await writeBinary(path, Buffer.from(zipSync(files, { level: 6 })), "application/zip");
  const old = [...(await index(true)).keys()].filter((k) => /^_backup\/eyra-kb-.*\.zip$/.test(k)).sort().slice(0, -KEEP);
  for (const k of old) await trash(k);
  return `${path} (${Object.keys(files).length} file)`;
}
