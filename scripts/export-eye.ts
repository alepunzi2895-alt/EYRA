import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { createEyeModel } from "../lib/eye-model";

// GLTFExporter uses the browser FileReader API, supplied here for Node's Blob.
class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then(result => {
      this.result = `data:${blob.type};base64,${Buffer.from(result).toString("base64")}`;
      this.onloadend?.();
    });
  }
}
Object.defineProperty(globalThis, "FileReader", { value: NodeFileReader, configurable: true });

async function main() {
  const { root } = createEyeModel();
  const result = await new GLTFExporter().parseAsync(root, { binary: true });
  if (!(result instanceof ArrayBuffer)) throw new Error("Esportazione GLB non valida");
  const output = resolve("public/eyra-eye.glb");
  writeFileSync(output, Buffer.from(result));
  const file = readFileSync(output);
  if (file.toString("utf8", 0, 4) !== "glTF" || file.readUInt32LE(4) !== 2 || file.readUInt32LE(8) !== file.length) throw new Error("Header GLB non valido");
  const jsonLength = file.readUInt32LE(12);
  const doc = JSON.parse(file.toString("utf8", 20, 20 + jsonLength));
  if (doc.images?.length || doc.textures?.length) throw new Error("Il modello deve contenere geometria, senza immagini");
  if (!doc.meshes?.length || !doc.materials?.length) throw new Error("Geometrie o materiali mancanti");
  console.log(`Modello esportato e verificato: ${doc.meshes.length} mesh, ${doc.materials.length} materiali, nessuna texture, ${(file.length / 1024 / 1024).toFixed(2)} MB.`);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
