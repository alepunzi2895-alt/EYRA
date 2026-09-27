"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import Eye3D from "./Eye3D";
import type { Planet } from "@/lib/entities";

const attentionNames = { unknown: "Da collegare", calm: "Regolare", watch: "Da verificare", urgent: "Priorità alta" };
export default function EntityOrbit({ name, planets, year, demo }: { name: string; planets: Planet[]; year: number; demo: boolean }) {
  const [selected, select] = useState<string | null>(null), [paused, pause] = useState(false), [visible, setVisible] = useState(true);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let onScreen = true;
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; setVisible(onScreen && !document.hidden); });
    if (host.current) observer.observe(host.current);
    const visibility = () => setVisible(onScreen && !document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  const current = planets.find(p => p.id === selected);
  return <div ref={host} className={`entity-universe${paused || !visible || selected ? " orbit-paused" : ""}`} onKeyDown={e => { if (e.key === "Escape") { select(null); host.current?.querySelector<HTMLButtonElement>(`[data-planet="${selected}"]`)?.focus(); } }}>
    <div className="universe-eye"><Eye3D name={name} /></div>
    <div className="orbit-system" aria-label="Centri di costo">
      <div className="orbit-track" aria-hidden="true" />
      {planets.map((p, i) => <div key={p.id} className="planet-orbit" style={{ "--phase": `${-i * 24}s`, "--planet-size": `${p.size}px` } as CSSProperties}>
        <div className="planet-upright"><button type="button" data-planet={p.id} className={`planet attention-${p.attention}`} aria-label={`${p.name}: ${attentionNames[p.attention]}. ${p.volume === null ? "Volume annuo non indicato" : `Volume annuo ${p.volume} euro, ${year}`}`} aria-expanded={selected === p.id} aria-controls="planet-detail" onClick={() => select(selected === p.id ? null : p.id)}>
          <span className="planet-sphere" aria-hidden="true" /><span className="planet-label">{p.name}</span>
        </button></div>
      </div>)}
    </div>
    <div className="orbit-caption"><span>{demo ? "Universo dimostrativo" : "Centri di costo"} · {year}</span><button type="button" aria-pressed={paused} onClick={() => pause(!paused)}>{paused ? "Riprendi orbite" : "Ferma orbite"}</button></div>
    {current && <section className="planet-detail" id="planet-detail" aria-label={`Dettagli ${current.name}`}>
      <button className="planet-close" aria-label="Chiudi dettagli" onClick={() => select(null)}>×</button>
      <span className={`planet-status attention-${current.attention}`}>{attentionNames[current.attention]}</span><h2>{current.name}</h2>
      <p className="planet-volume">{current.volume === null ? "Volume annuo da indicare" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(current.volume)} <small>· {year}</small></p>
      {current.notes && <p>{current.notes}</p>}<p>{current.reason}</p>
      <small>Dimensione relativa al volume annuo in EUR, con un diametro minimo per la leggibilità. Importi mancanti: dimensione neutra.</small>
      <div>{current.reference && <Link href={`/f/${encodeURIComponent(current.reference)}`}>Apri entità ↗</Link>}<Link href="/setup#entita">Configura pianeti ↗</Link></div>
    </section>}
  </div>;
}
