"use client";

import { useEffect, useRef, useState } from "react";
import { SPECIALISTS, type SpecialistId } from "@/lib/dna";
import type { mountDna } from "./dna-scene";

function StaticDna({ selected }: { selected: SpecialistId }) {
  const strand = (phase: number) => Array.from({ length: 121 }, (_, i) => {
    const y = 40 + i * 3.5;
    return `${i ? "L" : "M"}${200 + Math.sin(i / 120 * Math.PI * 4 + phase) * 85},${y}`;
  }).join(" ");
  return <svg className="dna-static" viewBox="0 0 400 500" role="img" aria-label="Doppia elica: rappresentazione dei nove specialisti">
    <title>Doppia elica</title>
    <path d="M200 20V480" stroke="#284b3c" strokeDasharray="2 8" />
    {Array.from({ length: 33 }, (_, i) => {
      const x = Math.sin(i / 32 * Math.PI * 4) * 85;
      return <line key={i} x1={200 + x} x2={200 - x} y1={40 + i / 32 * 420} y2={40 + i / 32 * 420} stroke="#34d399" strokeOpacity=".3" />;
    })}
    <path d={strand(0)} stroke="#6ee7b7" fill="none" strokeWidth="3" />
    <path d={strand(Math.PI)} stroke="#10b981" fill="none" strokeWidth="3" />
    {SPECIALISTS.map((s, i) => <g key={s.id} transform={`translate(${200 + Math.sin((i + .5) / 9 * Math.PI * 4) * 85},${40 + (i + .5) / 9 * 420})`}>
      <circle r={s.id === selected ? 18 : 12} fill="#071c15" stroke={s.id === selected ? "#ecfdf5" : "#6ee7b7"} />
      <text textAnchor="middle" dy="4" fill="#ecfdf5" fontSize="11">{i + 1}</text>
    </g>)}
  </svg>;
}

export default function DnaScene({ selected, onSelect }: { selected: SpecialistId; onSelect: (id: SpecialistId) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof mountDna> | null>(null);
  const latest = useRef({ selected, onSelect });
  latest.current = { selected, onSelect };
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [paused, setPaused] = useState(false);
  const [staticView, setStaticView] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (staticView) return;
    let cancelled = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPaused(motion.matches);
    setStatus("loading");
    const preference = () => { setPaused(motion.matches); controller.current?.pause(motion.matches); };
    motion.addEventListener("change", preference);
    import("./dna-scene").then(({ mountDna }) => {
      if (cancelled || !host.current) return;
      controller.current = mountDna(host.current, motion.matches, latest.current.selected,
        id => latest.current.onSelect(id), () => { if (!cancelled) setStatus("error"); });
      setStatus("ready");
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => {
      cancelled = true;
      motion.removeEventListener("change", preference);
      controller.current?.dispose(); controller.current = null;
    };
  }, [staticView, attempt]);

  useEffect(() => { controller.current?.select(selected); }, [selected]);
  const ready = status === "ready" && !staticView;
  return <div className="dna-visual">
    <div className="dna-scene-wrap">
      <div ref={host} className={`dna-canvas${ready ? " is-ready" : ""}`} role="region" aria-label="Doppia elica interattiva"
        tabIndex={ready ? 0 : -1} aria-hidden={!ready} aria-describedby="dna-controls-help"
        onKeyDown={e => {
          if (e.target !== e.currentTarget || !ready) return;
          const rotations: Record<string, [number, number]> = { ArrowLeft: [-.18, 0], ArrowRight: [.18, 0], ArrowUp: [0, -.1], ArrowDown: [0, .1] };
          if (rotations[e.key]) { e.preventDefault(); controller.current?.rotate(...rotations[e.key]); }
          if (e.key === "Home") { e.preventDefault(); controller.current?.reset(); }
        }}>
        {SPECIALISTS.map((s, i) => <button className="dna-node" key={s.id} data-node={s.id}
          type="button" aria-label={`Seleziona ${s.name}`} aria-pressed={selected === s.id} aria-controls="dna-detail"
          tabIndex={ready ? 0 : -1} title={s.name} onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()}
          onClick={() => onSelect(s.id)}>{String(i + 1).padStart(2, "0")}</button>)}
      </div>
      {!ready && <div className="dna-fallback"><StaticDna selected={selected} />
        <p role="status">{staticView ? "Vista statica · esplora gli specialisti qui sotto" : status === "loading" ? "Il DNA prende forma…" : "Vista 3D non disponibile. Tutte le competenze restano esplorabili."}</p>
      </div>}
      <div className="dna-scene-label" aria-hidden="true"><span>{String(SPECIALISTS.findIndex(s => s.id === selected) + 1).padStart(2, "0")}</span><div>Connessione selezionata<strong>{SPECIALISTS.find(s => s.id === selected)!.name}</strong></div></div>
    </div>
    <div className="dna-controls">
      <span id="dna-controls-help">{ready ? "Trascina o usa le frecce · Home per centrare" : "Una mappa, nove prospettive"}</span>
      <div>{ready && <>
        <button type="button" aria-pressed={paused} onClick={() => { controller.current?.pause(!paused); setPaused(!paused); }}>{paused ? "Riprendi" : "Pausa"}</button>
        <button type="button" onClick={() => controller.current?.reset()}>Centra</button>
      </>}
        <button type="button" onClick={() => {
          if (staticView) { setStatus("loading"); setStaticView(false); }
          else if (status === "error") setAttempt(n => n + 1);
          else setStaticView(true);
        }}>{staticView ? "Attiva vista 3D" : status === "error" ? "Riprova 3D" : "Vista statica"}</button>
      </div>
    </div>
  </div>;
}
