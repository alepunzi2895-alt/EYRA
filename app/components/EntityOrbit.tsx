"use client";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Eye3D from "./Eye3D";
import type { Planet } from "@/lib/entities";

const attentionNames = { unknown: "Da collegare", calm: "Regolare", watch: "Da verificare", urgent: "Priorità alta" };
type Flight = { id: string; name: string; href: string; attention: Planet["attention"]; x: number; y: number; size: number; dx: number; dy: number };
export default function EntityOrbit({ name, planets, year, demo }: { name: string; planets: Planet[]; year: number; demo: boolean }) {
  const [flight, setFlight] = useState<Flight | null>(null), [visible, setVisible] = useState(true);
  const host = useRef<HTMLDivElement>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null), locked = useRef(false), navigated = useRef(false);
  const router = useRouter();
  useEffect(() => {
    let onScreen = true;
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; setVisible(onScreen && !document.hidden); });
    if (host.current) observer.observe(host.current);
    const fit = new ResizeObserver(() => {
      const orbit = host.current?.querySelector<HTMLElement>(".orbit-system");
      if (!host.current || !orbit?.offsetWidth) return;
      const flatten = Math.min(.9, host.current.clientHeight * .74 / orbit.offsetWidth);
      orbit.style.setProperty("--flatten", String(flatten));
      orbit.style.setProperty("--unflatten", String(1 / flatten));
    });
    if (host.current) fit.observe(host.current);
    const visibility = () => setVisible(onScreen && !document.hidden);
    const restore = () => { if (timer.current) clearTimeout(timer.current); locked.current = false; navigated.current = false; setFlight(null); };
    window.addEventListener("pageshow", restore);
    document.addEventListener("visibilitychange", visibility);
    return () => { observer.disconnect(); fit.disconnect(); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pageshow", restore); if (timer.current) clearTimeout(timer.current); };
  }, []);
  function navigate(href: string) {
    if (navigated.current) return;
    navigated.current = true;
    if (timer.current) clearTimeout(timer.current);
    router.push(href);
  }
  function absorb(event: MouseEvent<HTMLAnchorElement>, planet: Planet) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (locked.current) return;
    const href = '/entita/' + encodeURIComponent(planet.id);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { router.push(href); return; }
    const box = host.current?.getBoundingClientRect();
    const sphere = event.currentTarget.querySelector('.planet-sphere')?.getBoundingClientRect();
    const eye = host.current?.querySelector('.eye3d-stage')?.getBoundingClientRect();
    if (!box || !sphere || !eye) { router.push(href); return; }
    locked.current = true;
    setFlight({ id: planet.id, name: planet.name, href, attention: planet.attention, x: sphere.left - box.left, y: sphere.top - box.top, size: sphere.width, dx: eye.left + eye.width / 2 - sphere.left - sphere.width / 2, dy: eye.top + eye.height / 2 - sphere.top - sphere.height / 2 });
    // Complete navigation even if the browser suppresses animationend.
    timer.current = setTimeout(() => navigate(href), 1000);
  }
  return <div ref={host} className={'entity-universe' + (!visible || flight ? ' orbit-paused' : '') + (flight ? ' eye-absorbing' : '')}>
    <div className="universe-eye"><Eye3D name={name} controls={false} /></div>
    <div className="orbit-system" aria-label="Centri di costo">
      <div className="orbit-track" aria-hidden="true" />
      {planets.map((p, i) => <div key={p.id} className={'planet-orbit' + (flight?.id === p.id ? ' planet-selected' : '')} style={{ "--phase": `${-i * 24}s`, "--planet-size": `${p.size}px` } as CSSProperties}>
        <div className="planet-upright"><Link href={'/entita/' + encodeURIComponent(p.id)} className={'planet attention-' + p.attention} aria-label={p.name + ': ' + attentionNames[p.attention] + '. Apri andamento entità'} onClick={event => absorb(event, p)}>
          <span className="planet-sphere" aria-hidden="true" /><span className="planet-label">{p.name}</span>
        </Link></div>
      </div>)}
    </div>
    <div className="orbit-caption"><span>{demo ? "Universo dimostrativo" : "Centri di costo"} · {year}</span></div>
    {flight && <>
      <span className={'absorbed-planet planet-sphere attention-' + flight.attention} aria-hidden="true" style={{ left: flight.x, top: flight.y, width: flight.size, height: flight.size, "--flight-x": flight.dx + 'px', "--flight-y": flight.dy + 'px' } as CSSProperties} onAnimationEnd={event => { if (event.target === event.currentTarget) navigate(flight.href); }} />
      <div className="absorption-status" role="status">Apro {flight.name}… <Link href={flight.href}>Apri andamento ↗</Link></div>
    </>}
  </div>;
}
