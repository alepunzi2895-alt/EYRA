"use client";
import { useState, useTransition } from "react";
import { executeJob, previewBrief } from "./actions";
export default function Controls({ kind, label }: { kind: string; label: string }) {
  const [result, setResult] = useState("");
  const [busy, start] = useTransition();
  return <div className="automation-controls">
    <button className="sec" disabled={busy} onClick={() => start(async () => setResult(await executeJob(kind)))}>{busy ? "Eseguo…" : label}</button>
    {["briefing", "weekly"].includes(kind) && <button className="sec" disabled={busy} onClick={() => start(async () => setResult(await previewBrief(kind === "weekly")))}>Anteprima senza invio</button>}
    {result && <pre className="automation-result" role="status">{result}</pre>}
  </div>;
}
