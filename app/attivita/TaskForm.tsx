"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { taskProposal } from "./actions";
import type { TaskInput } from "@/lib/workflows";
export default function TaskForm({ initial }: { initial?: TaskInput }) {
  const [kind, setKind] = useState(initial?.kind ?? "task");
  const [result, setResult] = useState<Awaited<ReturnType<typeof taskProposal>>>();
  const [busy, start] = useTransition();
  return <form className="workflow-form" action={fd => start(async () => setResult(await taskProposal(fd)))}>
    {initial?.id && <input type="hidden" name="id" value={initial.id} />}
    <label>Tipo<select name="kind" value={kind} onChange={e => setKind(e.target.value)}>{(initial ? [initial.kind] : ["task", "renewal"]).map(k => <option key={k} value={k}>{k === "task" ? "Pratica / attività" : "Rinnovo / manutenzione"}</option>)}</select></label>
    <label>Titolo<input name="title" required maxLength={160} defaultValue={initial?.title} /></label>
    <label>Responsabile<input name="owner" maxLength={120} defaultValue={initial?.owner} /></label>
    <label>Prossimo passo<textarea name="next" maxLength={2000} defaultValue={initial?.next} /></label>
    <label>{kind === "renewal" ? "Data scadenza" : "Ricontrolla il"}<input type="date" name="date" required={kind === "renewal"} defaultValue={initial?.date} /></label>
    <label>Stato<select name="status" defaultValue={initial?.status ?? "open"}><option value="open">Da fare</option><option value="waiting">In attesa</option><option value="done">Completata</option></select></label>
    {kind === "renewal" && <><label>Ricorrenza<select name="recurrence" defaultValue={initial?.recurrence ?? "none"}><option value="none">Una volta</option><option value="monthly">Mensile</option><option value="yearly">Annuale</option></select></label><label>Preavviso in giorni<input name="notice" type="number" min="0" max="365" defaultValue={initial?.notice ?? "7"} /></label></>}
    <button disabled={busy}>{busy ? "Preparo…" : "Proponi modifica"}</button>
    {result && <p role="status">{"error" in result ? result.error : <><Link href="/inbox">Approva la proposta {result.code}</Link>. Nessuna modifica è ancora applicata.</>}</p>}
  </form>;
}
