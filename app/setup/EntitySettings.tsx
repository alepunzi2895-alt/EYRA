"use client";
import { useState, useTransition } from "react";
import type { EntityConfig } from "@/lib/entities";
import { salvaPianeti } from "./actions";

export default function EntitySettings({ initial, disabled }: { initial: EntityConfig; disabled: boolean }) {
  const [config, setConfig] = useState(initial), [pending, start] = useTransition(), [message, setMessage] = useState("");
  return <form onSubmit={e => { e.preventDefault(); start(async () => { try { const result = await salvaPianeti(JSON.stringify(config)); setMessage(result.error || result.ok || ""); } catch { setMessage("Salvataggio non riuscito. Riprova."); } }); }}>
    <fieldset disabled={disabled || pending} className="entity-fields">
      <label>Anno di riferimento<input type="number" min="2000" max="2100" required value={config.year} onChange={e => setConfig({ ...config, year: Number(e.target.value) })} /></label>
      <div className="entity-settings-grid">{config.entities.map((entity, i) => {
        const change = (key: string, value: string | number | null | (number | null)[]) => setConfig(c => ({ ...c, entities: c.entities.map((item, index) => index === i ? { ...item, [key]: value } : item) }));
        return <fieldset key={entity.id}><legend>Pianeta {i + 1}</legend>
          <label>Nome del centro di costo<input required maxLength={90} value={entity.name} onChange={e => change("name", e.target.value)} /></label>
          <label>Volume economico annuo · EUR<input type="number" min="0" max="1000000000000000" step="0.01" placeholder="Non ancora disponibile" value={entity.volume ?? ""} onChange={e => change("volume", e.target.value === "" ? null : Number(e.target.value))} /></label>
          <label>ID entità nell’archivio<input maxLength={100} pattern="[a-zA-Z0-9_-]*" value={entity.reference} onChange={e => change("reference", e.target.value)} placeholder="ID esatto della scheda entità" /></label>
          <label>Peculiarità<textarea rows={3} maxLength={500} value={entity.notes} onChange={e => change("notes", e.target.value)} placeholder="Attività, paese, priorità specifiche…" /></label>
          <details className="monthly-editor"><summary>Andamento mensile · {config.year}</summary><p>Volumi mensili in EUR, con lo stesso criterio del dato annuo. Vuoto significa non disponibile; zero è un valore noto. Il totale annuo resta indipendente.</p><div>{["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"].map((month, index) => <label key={month}>{month}<input type="number" min="0" max="1000000000000000" step="0.01" placeholder="Non disponibile" value={entity.monthly?.[index] ?? ""} onChange={e => { const values = [...(entity.monthly ?? Array<number | null>(12).fill(null))]; values[index] = e.target.value === "" ? null : Number(e.target.value); change("monthly", values); }} /></label>)}</div></details>
        </fieldset>;
      })}</div><button disabled={pending}>{pending ? "Salvo…" : "Salva pianeti"}</button>
    </fieldset><p role="status">{message}</p>
  </form>;
}
