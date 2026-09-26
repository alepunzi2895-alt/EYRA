import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { drive } from "./drive";

const FOLDER = "application/vnd.google-apps.folder";
const MIME: Record<string, string> = { ".md": "text/markdown", ".json": "application/json" };

/** Crea la cartella (col nome dell'assistente) nel Drive della titolare e carica il template KB incluso nell'app. */
export async function seedDrive(name: string): Promise<{ id: string; files: number }> {
  const src = path.join(process.cwd(), "kb");
  const root = (await drive().files.create({ requestBody: { name, mimeType: FOLDER }, fields: "id" })).data.id!;
  let files = 0;
  const up = async (dir: string, parent: string): Promise<void> => {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        const id = (await drive().files.create({ requestBody: { name: e.name, mimeType: FOLDER, parents: [parent] }, fields: "id" })).data.id!;
        await up(p, id);
      } else {
        const mimeType = MIME[path.extname(e.name)] ?? "text/plain";
        await drive().files.create({ requestBody: { name: e.name, parents: [parent] }, media: { mimeType, body: Readable.from([await fs.readFile(p)]) }, fields: "id" });
        files++;
      }
    }
  };
  await up(src, root);
  return { id: root, files };
}
