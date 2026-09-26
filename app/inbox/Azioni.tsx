"use client";
import { useState, useTransition } from "react";
import { applica, rifiuta } from "./actions";

export default function Azioni({ code, conflitti }: { code: string; conflitti: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<any>) => start(async () => {
    const r = await fn();
    if (r?.error) setMsg(r.error);
    else if (r?.ok) setMsg(r.ok + (r.validazione?.length ? ` · ${r.validazione.length} avvisi struttura` : ""));
  });
  return (
    <div>
      <div className="azioni">
        <button disabled={pending} onClick={() => run(() => applica(code, false))}>{conflitti ? "Applica senza conflitti" : "Applica"}</button>
        {conflitti > 0 && <button className="rischio" disabled={pending} onClick={() => confirm("Sovrascrivere i valori esistenti con quelli nuovi?") && run(() => applica(code, true))}>Applica e sovrascrivi</button>}
        <button className="sec" disabled={pending} onClick={() => run(() => rifiuta(code))}>Rifiuta</button>
      </div>
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}
