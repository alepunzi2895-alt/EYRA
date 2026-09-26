"use client";
import { useEffect, useRef, useState } from "react";
import { attachmentMime, supportedAttachment, WEB_ATTACHMENT_LIMIT, WEB_ATTACHMENT_COUNT } from "@/lib/attachment-types";

async function prepare(file: File): Promise<File> {
  const mime = attachmentMime(file.name, file.type);
  if (!mime.startsWith("image/") && !/\.hei[cf]$/i.test(file.name)) {
    if (!supportedAttachment(file.name, mime)) throw new Error("Formato non supportato. Usa foto JPG/PNG/WebP, PDF, Excel o testo.");
    return file;
  }
  if (file.size > 20_000_000) throw new Error("Foto oltre 20 MB: scegli una versione più piccola.");
  if (mime === "image/gif") return file;
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("Foto non leggibile dal browser. Esportala in JPG o PNG e riprova."); }
  try {
    if (Math.max(bitmap.width, bitmap.height) <= 2400 && file.size < 900_000 && supportedAttachment(file.name, mime)) return file;
    const ratio = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
    const context = canvas.getContext("2d"); if (!context) throw new Error("Impossibile preparare la foto.");
    context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Impossibile preparare la foto.")), "image/jpeg", .9));
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally { bitmap.close(); }
}
function Preview({ file, remove, disabled }: { file: File; remove: () => void; disabled: boolean }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!attachmentMime(file.name, file.type).startsWith("image/")) return;
    const object = URL.createObjectURL(file); setUrl(object); return () => URL.revokeObjectURL(object);
  }, [file]);
  return <div className="attachment-preview">{url && <a href={url} target="_blank" rel="noreferrer" aria-label={`Apri anteprima ${file.name}`}><img src={url} alt={`Anteprima ${file.name}`} /></a>}<span>{file.name}<small>{Math.ceil(file.size / 1000)} KB</small></span><button type="button" className="sec" disabled={disabled} onClick={remove} aria-label={`Rimuovi ${file.name}`}>×</button></div>;
}
export default function AttachmentPicker({ files, onChange, disabled, onProcessing }: { files: File[]; onChange: (files: File[]) => void; disabled: boolean; onProcessing: (busy: boolean) => void }) {
  const upload = useRef<HTMLInputElement>(null), camera = useRef<HTMLInputElement>(null), lock = useRef(false);
  const [error, setError] = useState(""), [preparing, setPreparing] = useState(false);
  async function add(incoming: File[]) {
    if (lock.current || disabled || !incoming.length) return;
    lock.current = true; setPreparing(true); onProcessing(true); setError("");
    try {
      if (files.length + incoming.length > WEB_ATTACHMENT_COUNT) throw new Error("Allega al massimo 8 file per messaggio.");
      const prepared: File[] = [];
      for (const file of incoming) prepared.push(await prepare(file));
      const all = [...files, ...prepared];
      if (all.reduce((total, file) => total + file.size, 0) > WEB_ATTACHMENT_LIMIT) throw new Error("Superati 4 MB complessivi: invia meno pagine alla volta o un PDF più leggero.");
      onChange(all);
    } catch(e) { setError(e instanceof Error ? e.message : "Allegato non leggibile."); }
    finally { lock.current = false; setPreparing(false); onProcessing(false); }
  }
  return <div className="attachment-picker">
    <div className="attachment-actions"><button type="button" className="sec" disabled={disabled || preparing} onClick={() => upload.current?.click()}>Allega foto o documento</button><button type="button" className="sec" disabled={disabled || preparing} onClick={() => camera.current?.click()}>Scatta foto</button><small>{preparing ? "Preparo le foto…" : "Foto, PDF, Excel · fino a 8 file / 4 MB"}</small></div>
    <input hidden ref={upload} aria-label="Scegli foto o documenti" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif,.xlsx,.xls,.csv,.txt,.md,.xml,.p7m" onChange={e => { void add(Array.from(e.target.files || [])); e.target.value = ""; }} />
    <input hidden ref={camera} aria-label="Fotografa documento" type="file" accept="image/*" capture="environment" onChange={e => { void add(Array.from(e.target.files || [])); e.target.value = ""; }} />
    {error && <p role="alert">{error}</p>}
    {!!files.length && <><div className="attachment-previews">{files.map((file, i) => <Preview key={`${file.name}-${i}`} file={file} disabled={disabled || preparing} remove={() => onChange(files.filter((_, index) => index !== i))} />)}</div><small>Controlla che i dettagli siano leggibili. Le foto grandi vengono ottimizzate per l’invio; puoi aprire l’anteprima.</small></>}
  </div>;
}
