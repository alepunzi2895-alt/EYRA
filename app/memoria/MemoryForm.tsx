"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { remember } from "./actions";
export default function MemoryForm() {
  const [result, setResult] = useState<Awaited<ReturnType<typeof remember>>>();
  const [busy, start] = useTransition();
  return <form className="workflow-form" action={fd => start(async () => setResult(await remember(fd)))}>
    <label>Cosa vuoi che ricordi?<textarea name="text" required maxLength={1500} placeholder="Preferisco risposte brevi, con il prossimo passo in evidenza." /></label>
    <button disabled={busy}>{busy ? "Preparo…" : "Proponi memoria"}</button>
    {result && <p role="status">{"error" in result ? result.error : <Link href="/inbox">Rivedi e approva la memoria {result.code}</Link>}</p>}
  </form>;
}
