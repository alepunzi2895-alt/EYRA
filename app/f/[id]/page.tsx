import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/app/components/Shell";
import Md from "@/app/components/Md";
import { loadAll, iso } from "@/lib/kb";
import { index } from "@/lib/drive";
import { archiveIssue } from "@/lib/availability";
import ConnectionNotice from "@/app/components/ConnectionNotice";

export const dynamic = "force-dynamic";
const HIDE = new Set(["id", "titolo", "fonti_campi"]);

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (v instanceof Date) return iso(v)!;
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "object") return Object.entries(v as object).map(([k, x]) => `${k}: ${show(x)}`).join(" · ");
  if (typeof v === "boolean") return v ? "sì" : "no";
  return String(v);
}

export default async function File({ params }: { params: Promise<{ id: string }> }) {
  const issue = await archiveIssue();
  if (issue) return <Shell><h1>Documento</h1><ConnectionNotice message={issue} /></Shell>;
  const id = decodeURIComponent((await params).id);
  const docs = await loadAll();
  const d = docs.find((x) => x.id === id);
  if (!d) notFound();
  const node = (await index()).get(d.path);
  const fm = d.fm ?? {};
  const src: Record<string, string> = fm.fonti_campi ?? {};
  const folder = d.path.split("/").slice(0, -1).join("/");

  return (
    <Shell>
      <div className="briciole"><Link href="/cartella">Archivio</Link>{folder && <> / <Link href={`/cartella/${folder}`}>{folder}</Link></>}</div>
      <h1>{fm.titolo ?? d.id}</h1>
      <p className="sub">
        <span className={`stato ${fm.validato ? "ok" : "warn"}`}>{fm.validato ? "confermato" : "da confermare"}</span>{" "}
        aggiornato {show(fm.aggiornato)}
      </p>
      <div className="doc">
        <article className="prosa"><Md text={d.body} /></article>
        <aside className="scheda" aria-label="Dati strutturati">
          <dl>
            {Object.entries(fm).filter(([k]) => !HIDE.has(k)).map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}>
                <dt>{k.replace(/_/g, " ")}</dt>
                <dd>{k === "entita" && Array.isArray(v) ? v.map((e, i) => <span key={e}>{i > 0 && ", "}<Link href={`/f/${e}`}>{e}</Link></span>) : show(v)}</dd>
                {src[k] && <dd className="src">fonte: {src[k]}</dd>}
              </div>
            ))}
          </dl>
          {node && <p style={{ marginBottom: 0 }}><a href={`https://drive.google.com/file/d/${node.id}/view`} target="_blank" rel="noreferrer">Apri su Drive</a></p>}
        </aside>
      </div>
    </Shell>
  );
}
