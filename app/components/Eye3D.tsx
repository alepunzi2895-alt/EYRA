"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { mountEye } from "./eye-scene";

export default function Eye3D({ name, expanded = false, controls = true }: { name: string; expanded?: boolean; controls?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof mountEye> | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPaused(motion.matches);
    const preference = () => { setPaused(motion.matches); controller.current?.pause(motion.matches); };
    motion.addEventListener("change", preference);
    import("./eye-scene").then(({ mountEye }) => {
      if (cancelled || !host.current) return;
      controller.current = mountEye(host.current, motion.matches, () => setStatus("error"));
      setStatus("ready");
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; motion.removeEventListener("change", preference); controller.current?.dispose(); controller.current = null; };
  }, []);
  const toggle = () => { const next = !paused; setPaused(next); controller.current?.pause(next); };
  return <div className={`eye3d${expanded ? " eye3d-expanded" : ""}`}>
    <div className="eye3d-stage" ref={host} role="region" aria-roledescription="modello 3D interattivo"
      aria-label={`Occhio di ${name}. Trascina o usa i tasti freccia per ruotare. Premi Home per centrare.`}
      tabIndex={status === "ready" ? 0 : -1}
      onKeyDown={(e) => {
        const rotations: Record<string, [number, number]> = { ArrowLeft: [-.15, 0], ArrowRight: [.15, 0], ArrowUp: [0, -.1], ArrowDown: [0, .1] };
        if (rotations[e.key]) { e.preventDefault(); controller.current?.rotate(...rotations[e.key]); }
        if (e.key === "Home") { e.preventDefault(); controller.current?.reset(); }
      }} />
    {status !== "ready" && <div className="eye3d-status" role="status">
      {status === "loading" ? "L’occhio prende forma…" : "La vista 3D non è disponibile in questo browser."}
      {status === "error" && <a href="/eyra-eye.glb" download>Scarica il modello 3D</a>}
    </div>}
    {status === "ready" && controls && <div className="eye3d-controls" aria-label="Controlli occhio">
      <span className="eye3d-hint">trascina per esplorare</span>
      <button type="button" onClick={toggle} aria-pressed={paused}>{paused ? "Riprendi" : "Pausa"}</button>
      <button type="button" onClick={() => controller.current?.reset()}>Centra</button>
      {!expanded && <Link href="/occhio">Espandi ↗</Link>}
    </div>}
  </div>;
}
