import { Shell } from "@/app/components/Shell";
import { memories } from "@/lib/workflows";
import { forget } from "./actions";
import MemoryForm from "./MemoryForm";
export const dynamic = "force-dynamic";
export default async function MemoryPage() {
  let list: Awaited<ReturnType<typeof memories>> = [], error = "";
  try { list = await memories(); } catch { error = "Collega l’archivio per leggere le memorie approvate."; }
  return <Shell><h1>Memoria e apprendimento</h1><p className="sub">La cronologia conserva i dialoghi. Le memorie approvate rendono preferenze e correzioni disponibili nelle chat successive. Il modello non viene riaddestrato.</p>
    {error && <p className="vuoto">{error}</p>}<MemoryForm />
    <div className="workflow-grid">{list.map(d => <article className="passo" key={d.id}><p>{String(d.fm?.memory_text)}</p><small>Fonte: {String(d.fm?.memory_source || "titolare")}</small><form action={forget}><input type="hidden" name="id" value={d.id} /><button className="sec">Proponi di dimenticare</button></form></article>)}</div>
  </Shell>;
}
