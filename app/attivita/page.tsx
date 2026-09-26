import { Shell } from "@/app/components/Shell";
import { tasks } from "@/lib/workflows";
import TaskForm from "./TaskForm";
export const dynamic = "force-dynamic";
export default async function Activities() {
  let list: Awaited<ReturnType<typeof tasks>> = [], error = "";
  try { list = await tasks(); } catch { error = "Collega l’archivio Google per leggere e salvare attività."; }
  return <Shell><h1>Attività e rinnovi</h1><p className="sub">Pratiche, attese, manutenzioni e prossimi passi. Ogni modifica passa da «Da approvare».</p>{error && <p className="vuoto">{error}</p>}
    <details className="passo"><summary>Nuova attività o rinnovo</summary><TaskForm /></details>
    <div className="workflow-grid">{["open", "waiting", "done"].map(status => <section key={status}><h2>{{ open: "Da fare", waiting: "In attesa", done: "Completate" }[status]}</h2>
      {list.filter(t => t.status === status).map(t => <article className="passo" key={t.id}><h3>{t.title}</h3><p>{t.next || "Prossimo passo da definire"}</p><p className="aiuto">{t.owner || "Responsabile da assegnare"} · {t.date || "Senza data"}</p><details><summary>Aggiorna</summary><TaskForm initial={t} /></details></article>)}
    </section>)}</div>
  </Shell>;
}
