"use client";

import { useEffect, useRef, useState } from "react";

export default function HomeContext({ approximateCity }: { approximateCity: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const [coordinates, setCoordinates] = useState("");
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState("");
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => { mounted.current = false; window.clearInterval(timer); };
  }, []);

  function locate() {
    if (!navigator.geolocation) {
      setMessage("Questo browser non supporta il rilevamento della posizione.");
      return;
    }
    setLocating(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!mounted.current) return;
        const lat = `${Math.abs(coords.latitude).toFixed(3)}° ${coords.latitude < 0 ? "S" : "N"}`;
        const lon = `${Math.abs(coords.longitude).toFixed(3)}° ${coords.longitude < 0 ? "O" : "E"}`;
        setCoordinates(`${lat} · ${lon}`);
        setLocating(false);
      },
      (error) => {
        if (!mounted.current) return;
        setMessage(error.code === 1
          ? "Posizione non autorizzata. Puoi abilitarla nelle impostazioni del browser."
          : "Posizione non disponibile al momento. Puoi riprovare.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <div className="home-context" aria-label="Data, ora e luogo">
      <div className="home-date">
        <span className="context-label">Oggi</span>
        <time dateTime={now?.toISOString()}>
          {now ? now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Data locale…"}
        </time>
      </div>
      <div className="home-clock">
        <span className="context-label">Ora locale</span>
        <time dateTime={now?.toISOString()}>
          {now ? now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—:—:—"}
        </time>
      </div>
      <div className="home-place">
        <span className="context-label">{coordinates ? "Coordinate rilevate" : approximateCity ? "Luogo approssimativo · IP" : "Luogo"}</span>
        <span>{coordinates || approximateCity || "Posizione non rilevata"}</span>
        <button type="button" onClick={locate} disabled={locating} aria-describedby="location-feedback">
          {locating ? "Rilevamento…" : coordinates ? "Aggiorna posizione" : "Rileva posizione"}
        </button>
        <small id="location-feedback" role="status">{message || (coordinates ? "Coordinate visibili solo in questa pagina." : "")}</small>
      </div>
    </div>
  );
}
