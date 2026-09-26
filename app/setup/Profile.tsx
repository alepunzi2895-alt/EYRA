"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { proponiProfilo } from "./actions";
import type { UserProfile } from "@/lib/profile";

const example = `## Chi sono\nLavoro, paesi in cui vivo e attività che seguo.\n\n## I miei obiettivi\nPriorità, progetti e ciò su cui voglio aiuto.\n\n## Come preferisco le risposte\nLingua, tono, livello di dettaglio e come rivolgerti a me.\n\n## Cosa tenere presente\nAbitudini, vincoli e informazioni utili.`;

export default function Profile({ initial, issue }: { initial: UserProfile; issue: string | null }) {
  const [name, setName] = useState(initial.name);
  const [markdown, setMarkdown] = useState(initial.markdown);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ code?: string; diff?: string; error?: string } | null>(null);
  return <form className="profile-form" action={(fd) => start(async () => setResult(await proponiProfilo(fd)))}>
    <div className="campo"><label htmlFor="profile-name">Come vuoi essere chiamata o chiamato?</label>
      <input type="text" id="profile-name" name="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome o soprannome preferito" disabled={pending} />
    </div>
    <div className="profile-editor">
      <div className="campo"><label htmlFor="profile-markdown">Parlami di te · Markdown</label>
        <textarea id="profile-markdown" name="markdown" rows={16} maxLength={12000} value={markdown} onChange={(e) => setMarkdown(e.target.value)} placeholder={example} disabled={pending} aria-describedby="profile-help" />
        <span className="aiuto" id="profile-help">Titoli con ##, elenchi con - e **grassetto**. {markdown.length.toLocaleString("it-IT")} / 12.000 caratteri. Non inserire password, PIN, token o IBAN completi.</span>
      </div>
      <div className="profile-preview"><h3>Anteprima</h3>
        {name && <p>Nome preferito: <strong>{name}</strong></p>}
        {markdown ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: ({ alt }) => <span>{alt || "Immagine"}</span> }}>{markdown}</ReactMarkdown> : <p className="aiuto">Il tuo profilo formattato apparirà qui mentre scrivi.</p>}
      </div>
    </div>
    {issue && <p className="aiuto">{issue} Puoi provare l’editor: il testo non viene salvato se lasci questa pagina.</p>}
    <button disabled={pending || !!issue}>{pending ? "Preparo la proposta…" : "Proponi aggiornamento del profilo"}</button>
    <p className="aiuto">Il profilo diventa attivo dopo l’approvazione in «Da approvare». Per sostituire informazioni già presenti, conferma anche i conflitti mostrati.</p>
    {result?.error && <p role="alert" className="conflitto">{result.error}</p>}
    {result?.code && <div role="status"><p className="riuscito">Proposta {result.code} creata. Il profilo attivo non è ancora cambiato.</p>
      <Link className="btn sec" href="/inbox">Rivedi e approva</Link>
      <details><summary>Mostra le modifiche proposte</summary><pre className="diff">{result.diff}</pre></details>
    </div>}
  </form>;
}
