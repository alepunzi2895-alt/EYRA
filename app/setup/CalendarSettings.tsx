"use client";

import { useState, useTransition } from "react";
import { Campi, type Campo } from "./Campi";
import { calendariDisponibili } from "./actions";

export default function CalendarSettings({ campi, bloccato }: { campi: Campo[]; bloccato: boolean }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof calendariDisponibili>>>();
  const [pending, start] = useTransition();
  return <>
    <div className="azioni">
      <button type="button" className="sec" disabled={pending} onClick={() => start(async () => setResult(await calendariDisponibili()))}>
        {pending ? "Leggo i calendari…" : "Carica i miei calendari"}
      </button>
    </div>
    {result?.error && <p role="status" className="conflitto">{result.error}</p>}
    {result?.calendars && <p role="status" className="aiuto">{result.calendars.length} calendari disponibili nel campo Calendario.</p>}
    <datalist id="google-calendars">
      <option value="primary">Calendario principale</option>
      {result?.calendars?.map(c => <option value={c.id} key={c.id}>{c.summary} · {["writer", "owner"].includes(c.accessRole) ? "modificabile" : "sola lettura"}</option>)}
    </datalist>
    <Campi campi={campi} bloccato={bloccato} />
  </>;
}
