import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/app/components/Shell";
import { entityConfig } from "@/lib/entity-config";
import { entityPlanets, entityTrend } from "@/lib/entities";
import { archiveIssue } from "@/lib/availability";
import { addDays, loadAll, scadenze, today } from "@/lib/kb";

export const dynamic = "force-dynamic";
const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const money = (value: number | null) => value === null ? "Non disponibile" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value);

export default async function EntityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { config, demo, issue: configIssue } = await entityConfig();
  if (configIssue) return <Shell><div className="entity-page"><Link href="/">← Torna all’universo</Link><h1>Entità non disponibile</h1><p>{configIssue}</p><Link href="/setup#entita">Verifica configurazione</Link></div></Shell>;
  const entity = config.entities.find(e => e.id === id);
  if (!entity) notFound();
  let issue = await archiveIssue();
  let docs: Awaited<ReturnType<typeof loadAll>> = [];
  if (!issue) { try { docs = await loadAll(); } catch { issue = "Archivio non raggiungibile. Riprova più tardi."; } }
  const date = today();
  const rows = scadenze(docs, 180, addDays(date, -90));
  const planet = entityPlanets(config, docs, rows, !issue, date).find(p => p.id === id)!;
  const related = entity.reference ? docs.filter(d => d.id === entity.reference || (Array.isArray(d.fm?.entita) && d.fm.entita.includes(entity.reference))) : [];
  const linked = related.some(d => d.id === entity.reference && d.fm?.tipo === "entita");
  const deadlines = linked ? rows.filter(r => Array.isArray(r.entita) && r.entita.includes(entity.reference) && r.data <= addDays(date, 90)) : [];
  const trend = entityTrend(entity);
  const delta = trend.complete && trend.total !== null && entity.volume !== null ? trend.total - entity.volume : null;
  return <Shell><div className="entity-page">
    <Link className="entity-back" href="/">← Torna all’universo</Link>
    <header className="entity-heading"><span className={`entity-emblem planet-sphere attention-${planet.attention}`} aria-hidden="true" /><div><p className="entity-eyebrow">{demo ? "Dati dimostrativi" : "Centro di costo"} · {config.year}</p><h1>{entity.name}</h1>{entity.notes && <p>{entity.notes}</p>}</div></header>
    <div className="entity-metrics">
      <div><span>Volume annuo dichiarato</span><strong>{money(entity.volume)}</strong><small>{config.year} · EUR</small></div>
      <div><span>{trend.complete ? "Totale dei 12 mesi" : "Totale parziale dei mesi inseriti"}</span><strong>{money(trend.total)}</strong><small>{trend.count} mesi su 12 disponibili</small></div>
      <div><span>Attenzione</span><strong className={`planet-status attention-${planet.attention}`}>{({ unknown: "Non valutabile", calm: "Regolare", watch: "Da verificare", urgent: "Priorità alta" })[planet.attention]}</strong><small>{planet.reason}</small></div>
    </div>
    <section className="entity-trend" aria-labelledby="trend-title"><div className="entity-section-title"><h2 id="trend-title">Andamento mensile</h2><Link href="/setup#entita">Aggiorna importi ↗</Link></div>
      <p>Volume economico in EUR · {config.year}. Importi inseriti nelle Impostazioni; i mesi senza dati non valgono zero.</p>
      <div className="trend-scroll"><div className="trend-chart" role="img" aria-label={`Andamento mensile di ${entity.name}, ${config.year}. ${trend.count} mesi disponibili. Valori nella tabella seguente.`}>{trend.monthly.map((value, i) => <div className="trend-column" key={i} title={`${MONTHS[i]}: ${money(value)}`}><div className="trend-track"><span className={value === null ? "trend-missing" : "trend-bar"} style={value === null ? undefined : { height: `${trend.max ? value / trend.max * 100 : 0}%` }} /></div><span>{MONTHS[i]}</span></div>)}</div></div>
      {!trend.count && <p className="entity-empty">Non ci sono ancora valori mensili. Aggiungili nelle Impostazioni per visualizzare l’andamento.</p>}
      {delta !== null && Math.abs(delta) > .01 && <p className="entity-discrepancy">Il totale mensile differisce dal volume annuo dichiarato di {money(delta)}. Verifica periodo e criterio degli importi.</p>}
      <details className="trend-values"><summary>Leggi i valori mensili</summary><table><caption>Volumi mensili · {config.year} · EUR</caption><thead><tr><th scope="col">Mese</th><th scope="col">Volume</th></tr></thead><tbody>{trend.monthly.map((value, i) => <tr key={i}><th scope="row">{MONTHS[i]}</th><td>{money(value)}</td></tr>)}</tbody></table></details>
    </section>
    <div className="entity-records"><section><h2>Scadenze dell’entità</h2><p className="aiuto">Attive negli ultimi 90 giorni e nei prossimi 90; verifica nell’archivio quelle già gestite.</p>{issue || !linked ? <p>{issue || "Collega la scheda entità nelle Impostazioni per leggere le sue scadenze."}</p> : !deadlines.length ? <p>Nessuna scadenza nella finestra controllata.</p> : <ul>{deadlines.map(r => <li key={`${r.id}-${r.data}`}><time dateTime={r.data}>{new Date(r.data + "T12:00:00Z").toLocaleDateString("it-IT")}</time><Link href={`/f/${encodeURIComponent(r.id)}`}>{r.titolo}</Link><small>{r.data < date ? "Arretrata da verificare" : r.validato ? "Confermata" : "Da confermare"}</small></li>)}</ul>}</section>
      <section><h2>Documenti collegati</h2>{!linked || issue ? <p>I documenti appariranno quando l’archivio e l’ID dell’entità saranno collegati.</p> : <><p>{related.length} documenti collegati.</p><ul>{related.slice(0, 12).map(d => <li key={d.id}><Link href={`/f/${encodeURIComponent(d.id)}`}>{d.fm?.titolo || d.id}</Link><small>{d.fm?.tipo}</small></li>)}</ul>{entity.reference && <Link href={`/f/${encodeURIComponent(entity.reference)}`}>Apri scheda entità ↗</Link>}</>}</section></div>
  </div></Shell>;
}
