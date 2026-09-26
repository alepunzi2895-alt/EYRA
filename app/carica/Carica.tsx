"use client";
import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TIPI = [["estratto-conto", "Estratto conto"], ["fattura", "Fattura"], ["contratto", "Contratto"], ["fiscale", "Documento fiscale"], ["barca", "Documento barca"], ["altro", "Altro"]];

export default function Carica({ entita }: { entita: { id: string; titolo: string }[] }) {
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true); setReply(null);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: new FormData(form) });
      setReply((await r.json()).reply);
      form.reset();
    } catch { setReply("Caricamento non riuscito. Controlla la connessione e riprova."); }
    finally { setBusy(false); }
  }

  return (
    <>
      <form className="upload-form" onSubmit={submit}>
        <div className="campo"><label htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" defaultValue="estratto-conto">{TIPI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="campo"><label htmlFor="entita">Soggetto</label>
          <select id="entita" name="entita" defaultValue=""><option value="">Non so / più soggetti</option>{entita.map((e) => <option key={e.id} value={e.id}>{e.titolo}</option>)}</select></div>
        <div className="campo"><label htmlFor="files">File</label>
          <input id="files" name="files" type="file" multiple required accept=".pdf,.xml,.p7m,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.txt" /></div>
        <div className="campo"><label htmlFor="nota">Nota (facoltativa)</label>
          <textarea id="nota" name="nota" rows={2} placeholder="es. conto BBVA autónomo, settembre" /></div>
        <button disabled={busy}>{busy ? "Analisi in corso…" : "Carica e analizza"}</button>
      </form>
      {reply && (
        <section className="passo" style={{ marginTop: 24 }} aria-live="polite">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{reply}</ReactMarkdown>
          <p style={{ marginBottom: 0 }}><Link href="/inbox">Vai a Da approvare</Link></p>
        </section>
      )}
    </>
  );
}
