"use client";

import Link from "next/link";
import { useState } from "react";
import { SPECIALISTS, type SpecialistId } from "@/lib/dna";
import DnaScene from "./DnaScene";
import Wordmark from "@/app/components/Wordmark";

const VIEWS = [
  { id: "available", label: "Disponibile" },
  { id: "learns", label: "Conoscenze acquisibili" },
  { id: "future", label: "Sviluppo futuro" },
] as const;
type View = typeof VIEWS[number]["id"];

export default function DnaExplorer({ name }: { name: string }) {
  const [selected, setSelected] = useState<SpecialistId>("tax");
  const [view, setView] = useState<View>("available");
  const specialist = SPECIALISTS.find(s => s.id === selected)!;
  const index = SPECIALISTS.indexOf(specialist);
  const select = (id: SpecialistId) => { setSelected(id); };

  return <div className="dna-page">
    <header className="dna-header">
      <div><p className="eyebrow">Atlante delle competenze / 01</p>
        <h1>DNA di <Wordmark name={name} inline /><span aria-hidden="true">.</span></h1>
        <p className="dna-intro">Nove specialisti. Una visione d’insieme.<br />La conoscenza prende forma nelle connessioni.</p>
      </div>
      <div className="dna-header-note"><span>Patrimonio di conoscenza</span><strong>9 <i>/</i> 1</strong><span>Aree collegate / intelligenza</span></div>
    </header>

    <div className="dna-workspace">
      <section className="dna-map" aria-label="Mappa delle competenze">
        <div className="dna-map-caption"><span>Esplora il DNA</span><span>Modello concettuale</span></div>
        <DnaScene selected={selected} onSelect={select} />
        <div className="dna-index-head"><span>Seleziona uno specialista</span><span>01 — 09</span></div>
        <nav className="dna-index" aria-label="Specialisti">
          {SPECIALISTS.map((s, i) => <button key={s.id} type="button" aria-pressed={s.id === selected}
            aria-controls="dna-detail" onClick={() => select(s.id)}>
            <span className="dna-number">{String(i + 1).padStart(2, "0")}</span><span>{s.name}</span><span className="dna-index-dot" aria-hidden="true" />
          </button>)}
        </nav>
      </section>

      <section className="dna-detail" id="dna-detail" aria-labelledby="dna-specialist-title">
        <div className="dna-detail-heading" aria-live="polite" aria-atomic="true">
          <p className="eyebrow">Specialista {String(index + 1).padStart(2, "0")} / 09</p>
          <h2 id="dna-specialist-title">{specialist.name}</h2>
          <p className="dna-subject">{specialist.subject}</p>
          <p className="dna-description">{specialist.description}</p>
        </div>
        <div className="dna-views" role="group" aria-label="Tipo di capacità">
          {VIEWS.map(v => <button key={v.id} type="button" aria-pressed={view === v.id} aria-controls="dna-capabilities" onClick={() => setView(v.id)}>{v.label}</button>)}
        </div>
        <div className="dna-capabilities" id="dna-capabilities" aria-live="polite">
          <p className="dna-state">{view === "available" ? "Supporto in chat e nell’archivio" : view === "learns" ? "Conoscenza aggiunta con la tua approvazione" : "Possibili evoluzioni · non attive"}</p>
          <ul>{specialist[view].map(item => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className="dna-documents"><h3>Da quali informazioni parte</h3><p>{specialist.documents}</p></div>
        <figure className="dna-example"><figcaption>Esempio illustrativo</figcaption><blockquote>{specialist.example}</blockquote></figure>
        <div className="dna-connections"><h3>Connesso a</h3><div>{specialist.connections.map(id => {
          const related = SPECIALISTS.find(s => s.id === id)!;
          return <button key={id} type="button" onClick={() => select(id)} aria-controls="dna-detail">{related.name}<span aria-hidden="true">↗</span></button>;
        })}</div></div>
      </section>
    </div>

    <section className="dna-learning" aria-labelledby="dna-learning-title">
      <div><p className="eyebrow">Un patrimonio che si costruisce</p><h2 id="dna-learning-title">Impara il tuo contesto.<br /><em>Con la tua approvazione.</em></h2></div>
      <div><p><Wordmark name={name} inline /> acquisisce informazioni, procedure e correzioni dai documenti e dalle conversazioni. Propone una modifica all’archivio, mostra cosa cambia e la applica soltanto dopo la tua approvazione.</p>
        <p>Questo arricchisce il contesto delle risposte: non addestra il modello, non modifica il codice e non attiva nuove integrazioni.</p>
        <div className="dna-links"><Link href="/carica">Carica un documento ↗</Link><Link href="/chat">Apri la chat ↗</Link></div>
      </div>
    </section>
    <p className="dna-availability">Le capacità descrivono il supporto previsto dall’app, non lo stato dei collegamenti. Chat e analisi richiedono il servizio AI configurato; l’archivio usa Drive, mentre email e promemoria richiedono Gmail e WhatsApp. Le regole specialistiche si completano con fonti e procedure verificate. <Link href="/setup">Verifica le impostazioni</Link>.</p>
    <footer className="dna-philosophy" aria-label="Metodo"><span>osservare</span><b aria-hidden="true">→</b><span>connettere</span><b aria-hidden="true">→</b><span>comprendere</span><b aria-hidden="true">→</b><span>anticipare</span><b aria-hidden="true">→</b><span>agire</span></footer>
  </div>;
}
