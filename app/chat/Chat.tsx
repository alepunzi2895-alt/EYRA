"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type M = { role: "user" | "assistant"; text: string };
const link = (t: string) => t.replace(/\[\[([^\]|#]+)\]\]/g, (_, id) => `[${id}](/f/${encodeURIComponent(id)})`);

export default function Chat({ initial }: { initial: M[] }) {
  const [msgs, setMsgs] = useState<M[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const files = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [msgs, busy]);

  async function send() {
    const f = files.current?.files;
    if (!text.trim() && !f?.length) return;
    const fd = new FormData();
    fd.set("text", text);
    for (const x of Array.from(f ?? [])) fd.append("files", x);
    const names = Array.from(f ?? []).map((x) => `[allegato: ${x.name}] `).join("");
    setMsgs((m) => [...m, { role: "user", text: names + text }]);
    setText(""); if (files.current) files.current.value = "";
    setBusy(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", body: fd });
      const j = await r.json();
      setMsgs((m) => [...m, { role: "assistant", text: j.reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Connessione persa. Riprova." }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="chat">
      <div className="flusso" aria-live="polite">
        {msgs.length === 0 && <p className="vuoto">Chiedi scadenze, incolla un'email del commercialista, allega PDF o Excel. Le modifiche all'archivio arrivano in «Da approvare».</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role === "user" ? "io" : "agente"}`}>
            {m.role === "user" ? m.text : <ReactMarkdown remarkPlugins={[remarkGfm]}>{link(m.text)}</ReactMarkdown>}
          </div>
        ))}
        {busy && <div className="msg agente">Sto lavorando…</div>}
        <div ref={end} />
      </div>
      <div className="composer">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Scrivi o incolla…" aria-label="Messaggio"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
        <button onClick={send} disabled={busy}>Invia</button>
        <label className="file">Allegati (PDF, immagini, Excel): <input ref={files} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.txt,.md" /></label>
      </div>
    </div>
  );
}
