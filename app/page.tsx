import Link from "next/link";
import { Shell } from "@/app/components/Shell";
import { loadAll, scadenze, validate, today, addDays, Scad } from "@/lib/kb";
import { pendingPatches } from "@/lib/patch";
import { brand } from "@/lib/config";
import Eye3D from "@/app/components/Eye3D";
import Wordmark from "@/app/components/Wordmark";
import ConnectionNotice from "@/app/components/ConnectionNotice";
import { archiveIssue } from "@/lib/availability";

export const dynamic = "force-dynamic";

const GG = 60;
const AREE = [
  ["Fisco Italia", "fisco-it", "IRPEF, IVA, F24, IMU"],
  ["Fisco ES + Intl", "fisco-es-intl", "RETA, 303, residenza"],
  ["Immobili", "immobili-edilizia", "affitti, cantieri, licenze"],
  ["Nautica", "nautica", "barche, charter, registri"],
  ["Finanza", "contabilita-finanza", "cash flow, bilanci"],
  ["Bandi", "startup-bandi", "agevolazioni, piani"],
  ["Coaching", "coaching", "priorita, decisioni"],
] as const;

const diff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const fmt = (s: string) => new Date(s + "T12:00:00Z").toLocaleDateString("it-IT", { day: "numeric", month: "short" });

function gruppi(rows: Scad[], oggi: string) {
  const g: Record<string, Scad[]> = { "Entro 7 giorni": [], "Entro 30 giorni": [], "Più avanti": [] };
  for (const r of rows) {
    const d = diff(oggi, r.data);
    g[d <= 7 ? "Entro 7 giorni" : d <= 30 ? "Entro 30 giorni" : "Più avanti"].push(r);
  }
  return Object.entries(g).filter(([, v]) => v.length);
}

export default async function Oggi() {
  let issue = await archiveIssue();
  let docs: Awaited<ReturnType<typeof loadAll>> = [];
  let patches: Awaited<ReturnType<typeof pendingPatches>> = [];
  if (!issue) {
    try { [docs, patches] = await Promise.all([loadAll(), pendingPatches()]); }
    catch { issue = "Archivio non raggiungibile. Verifica il collegamento Google nelle Impostazioni."; }
  }
  const count = (n: number) => issue ? "—" : n;

  const cfg = await brand();
  const oggi = today();
  const rows = scadenze(docs, GG, oggi);
  const errori = validate(docs);
  const nonValidati = docs.filter((d) => d.fm && d.fm.validato === false).length;
  const entro7 = rows.filter((r) => diff(oggi, r.data) <= 7).length;
  const entro30 = rows.filter((r) => diff(oggi, r.data) <= 30).length;
  const calendar = Array.from({ length: 14 }, (_, n) => {
    const d = addDays(oggi, n);
    return { d, items: rows.filter((r) => r.data === d) };
  });
  const areaCount = (slug: string) => docs.filter((d) => d.path.includes(`50-moduli/${slug}/`)).length;

  return (
    <Shell inbox={patches.length}>
      <div className="cockpit">
        {issue && <ConnectionNotice message={issue} />}
        <header className="cockpit-head">
          <div>
            <p className="eyebrow">cruscotto operativo</p>
            <h1><Wordmark name={cfg.name} /></h1>
            <p className="sub">{new Date(oggi + "T12:00:00Z").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <div className="quick-actions" aria-label="Azioni rapide">
            <Link className="btn sec" href="/chat">Chat</Link>
            <Link className="btn sec" href="/carica">Carica</Link>
            <Link className="btn" href="/inbox">Approva {patches.length ? `(${patches.length})` : ""}</Link>
          </div>
        </header>

        <section className="jarvis-grid" aria-label="Sintesi assistente">
          <div className="radar-panel left">
            <p className="panel-label">attenzione</p>
            <strong>{count(entro7)}</strong>
            <span>scadenze entro 7 giorni</span>
            <div className="signal-bars" aria-hidden="true"><i /><i /><i /><i /></div>
          </div>

          <div className="orbital-core" aria-label="Avatar centrale animato">
            <Eye3D name={cfg.name} />
            <div className="core-readout">
              <b>{count(rows.length)}</b>
              <span>scadenze monitorate</span>
            </div>
          </div>

          <div className="radar-panel right">
            <p className="panel-label">archivio</p>
            <strong>{count(docs.length)}</strong>
            <span>file indicizzati</span>
            <dl>
              <div><dt>Da approvare</dt><dd>{count(patches.length)}</dd></div>
              <div><dt>Da validare</dt><dd>{count(nonValidati)}</dd></div>
              <div><dt>Struttura</dt><dd>{issue ? "da collegare" : errori.length ? `${errori.length} errori` : "ok"}</dd></div>
            </dl>
          </div>
        </section>

        <section className="mission-strip" aria-label={`Scadenze nei prossimi ${GG} giorni`}>
          <div>
            <p className="panel-label">timeline</p>
            <strong>{count(entro30)}</strong>
            <span>entro 30 giorni</span>
          </div>
          <div className="marea-track">
            {[0, 7, 14, 21, 28, 35, 42, 49, 56].map((n) => (
              <div key={n} className="tick" style={{ left: `${(n / GG) * 100}%` }}><span>{n === 0 ? "oggi" : fmt(addDays(oggi, n))}</span></div>
            ))}
            {rows.map((r, i) => {
              const n = diff(oggi, r.data);
              return <div key={r.id + r.data + i} className={`pin ${n <= 3 ? "urgente" : n <= 7 ? "vicino" : ""}`} style={{ left: `${(n / GG) * 100}%`, height: 16 + Math.min(36, i % 4 * 8), animationDelay: `${i * 35}ms` }} data-t={`${fmt(r.data)}: ${r.titolo}`} />;
            })}
          </div>
        </section>

        <div className="ops-grid">
          <section className="dashboard-band">
            <div className="band-head">
              <h2>Calendario</h2>
              <Link href="/chat">aggiungi scadenza</Link>
            </div>
            <div className="calendar-grid">
              {calendar.map(({ d, items }) => (
                <div key={d} className={items.length ? "day hot" : "day"}>
                  <span>{fmt(d)}</span>
                  <b>{count(items.length)}</b>
                  {items.slice(0, 2).map((i) => <small key={i.id + i.data}>{i.titolo}</small>)}
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-band">
            <div className="band-head">
              <h2>Aree specialistiche</h2>
              <Link href="/cartella/50-moduli">apri moduli</Link>
            </div>
            <div className="area-grid">
              {AREE.map(([nome, slug, descr]) => (
                <Link key={slug} className="area-tile" href={`/cartella/50-moduli/${slug}`}>
                  <span>{nome}</span>
                  <b>{count(areaCount(slug))}</b>
                  <small>{descr}</small>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="cols">
          <div>
            {rows.length === 0 && <p className="vuoto">{issue ? "Le scadenze saranno disponibili dopo il collegamento dell’archivio." : `Nessuna scadenza nei prossimi ${GG} giorni. Aggiungine una dalla chat.`}</p>}
            {gruppi(rows, oggi).map(([titolo, list]) => (
              <section key={titolo}>
                <h2>{titolo}</h2>
                <ul className="lista">
                  {list.map((r, i) => (
                    <li key={r.id + r.data + i}>
                      <span className="d">{fmt(r.data)}</span>
                      <span><Link href={`/f/${r.id}`}>{r.titolo}</Link><br /><span className="who">{r.entita.join(", ")}{r.responsabile && ` · ${r.responsabile}`}</span></span>
                      <span className={`stato ${r.validato ? "ok" : "warn"}`}>{r.validato ? "confermata" : "da confermare"}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <aside className="fatti" aria-label="Stato archivio">
            <h2 style={{ margin: "0 0 -6px" }}>Stato sistemi</h2>
            <div className={patches.length ? "alert" : ""}><b>{count(patches.length)}</b><span><Link href="/inbox">modifiche da approvare</Link></span></div>
            <div className={nonValidati ? "alert" : ""}><b>{count(nonValidati)}</b><span>file non confermati da professionista</span></div>
            <div className={errori.length ? "alert" : ""}><b>{count(errori.length)}</b><span>errori di struttura{errori.length > 0 && <>: {errori.slice(0, 3).join("; ")}</>}</span></div>
          </aside>
        </div>
      </div>
    </Shell>
  );
}
