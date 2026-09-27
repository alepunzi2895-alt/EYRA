"use client";

import { useEffect, useState } from "react";

export default function HomeContext({ approximateCity }: { approximateCity: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

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
        <span className="context-label">{approximateCity ? "Luogo approssimativo · IP" : "Luogo"}</span>
        <span>{approximateCity || "Non disponibile"}</span>
      </div>
    </div>
  );
}
