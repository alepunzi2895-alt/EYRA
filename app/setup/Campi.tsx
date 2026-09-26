"use client";
import { useState, useTransition } from "react";
import { salva, prova, Esito, Prova } from "./actions";

export type Campo = { key: string; label: string; help?: string; value: string; source: "web" | "env" | "default"; placeholder?: string; list?: string; options?: { value: string; label: string }[] };

const ORIGINE = { web: "salvato qui", env: "da .env", default: "predefinito" };

export function Campi({ campi, bloccato }: { campi: Campo[]; bloccato: boolean }) {
  const [pending, start] = useTransition();
  const [esito, setEsito] = useState<Esito | null>(null);
  const err = (k: string) => (esito?.errors as Record<string, string> | undefined)?.[k];
  return (
    <form action={(fd) => start(async () => setEsito(await salva(fd)))}>
      {campi.map((c) => (
        <div className="campo" key={c.key}>
          <label htmlFor={c.key}>{c.label} <span className="origine">{ORIGINE[c.source]}</span></label>
          {c.options ? <select id={c.key} name={c.key} defaultValue={c.value} disabled={bloccato} aria-invalid={!!err(c.key)} aria-describedby={c.help ? `${c.key}-h` : undefined}>
            {c.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select> : <input id={c.key} name={c.key} type="text" defaultValue={c.source === "default" ? "" : c.value} placeholder={c.placeholder ?? c.value}
            list={c.list} disabled={bloccato} aria-invalid={!!err(c.key)} aria-describedby={c.help ? `${c.key}-h` : undefined} />}
          {err(c.key) && <span className="conflitto">{err(c.key)}</span>}
          {c.help && <span id={`${c.key}-h`} className="aiuto">{c.help}</span>}
        </div>
      ))}
      {!bloccato && <button disabled={pending}>{pending ? "Salvo…" : "Salva"}</button>}
      <Messaggio esito={esito} />
    </form>
  );
}

export function Verifica({ kind, label = "Verifica collegamento", conferma }: { kind: Prova; label?: string; conferma?: string }) {
  const [pending, start] = useTransition();
  const [esito, setEsito] = useState<Esito | null>(null);
  return (
    <div className="verifica">
      <button type="button" className="sec" disabled={pending}
        onClick={() => (!conferma || confirm(conferma)) && start(async () => setEsito(await prova(kind)))}>
        {pending ? "Verifico…" : label}
      </button>
      <Messaggio esito={esito} />
    </div>
  );
}

function Messaggio({ esito }: { esito: Esito | null }) {
  if (!esito) return null;
  return <p role="status" className={esito.error ? "conflitto" : "riuscito"}>{esito.error ?? esito.ok}</p>;
}

export function Copia({ testo }: { testo: string }) {
  const [fatto, setFatto] = useState(false);
  return (
    <span className="copia">
      <code>{testo}</code>
      <button type="button" className="sec" onClick={() => navigator.clipboard.writeText(testo).then(() => { setFatto(true); setTimeout(() => setFatto(false), 1500); })}>
        {fatto ? "Copiato" : "Copia"}
      </button>
    </span>
  );
}
