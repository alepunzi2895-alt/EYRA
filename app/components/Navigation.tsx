"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Wordmark from "./Wordmark";

export default function Navigation({ name, tagline, inbox }: { name: string; tagline: string; inbox: number }) {
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => drawer.current?.close();
  useEffect(() => { drawer.current?.close(); setOpen(false); }, [pathname]);

  const links = [
    { href: "/", label: "Home" },
    { href: "/calendario", label: "Calendario" },
    { href: "/attivita", label: "Attività e rinnovi" },
    { href: "/automatismi", label: "Automatismi" },
    { href: "/memoria", label: "Memoria" },
    { href: "/cartella", label: "Archivio" },
    { href: "/carica", label: "Carica" },
    { href: "/inbox", label: "Da approvare" },
    { href: "/chat", label: "Cronologia conversazioni" },
    { href: "/dna", label: "DNA" },
    { href: "/setup", label: "Impostazioni" },
  ];
  const active = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/") || (href === "/cartella" && pathname.startsWith("/f/"));
  const current = links.find((link) => active(link.href))?.label;

  return <>
    <a href="#contenuto" className="skip-link">Vai al contenuto</a>
    <header className="app-bar">
      <button type="button" className="menu-toggle" aria-label="Apri menu" aria-expanded={open} aria-controls="menu-principale"
        onClick={() => { drawer.current?.showModal(); setOpen(true); }}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h12" /></svg>
        <span>Menu</span>
      </button>
      <span className="app-location">{current}</span>
      <Link href="/#prompt" className="btn sec">Parla con l’assistente</Link>
    </header>
    <dialog id="menu-principale" className="navigation-drawer" ref={drawer} aria-labelledby="menu-titolo"
      onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="drawer-content">
        <div className="drawer-heading">
          <h2 id="menu-titolo">Menu</h2>
          <button type="button" className="menu-close" aria-label="Chiudi menu" onClick={close} autoFocus>×</button>
        </div>
        <div className="drawer-brand"><Wordmark name={name} />{tagline && <p>{tagline}</p>}</div>
        <nav aria-label="Principale">
          {links.map(({ href, label }) => <Link key={href} href={href} onClick={close} aria-current={active(href) ? "page" : undefined}>
            <span>{label === "DNA" ? <>DNA di <Wordmark name={name} inline /></> : label}</span>
            {href === "/inbox" && inbox > 0 ? <span className="badge">{inbox}</span> : <span aria-hidden="true">↗</span>}
          </Link>)}
        </nav>
      </div>
    </dialog>
  </>;
}
