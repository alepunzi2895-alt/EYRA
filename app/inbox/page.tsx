import { Shell } from "@/app/components/Shell";
import Setup from "@/app/components/Setup";
import { pendingPatches, preview, Patch, Preview } from "@/lib/patch";
import Azioni from "./Azioni";

export const dynamic = "force-dynamic";

function Diff({ text }: { text: string }) {
  return (
    <div className="diff" role="region" aria-label="Differenze">
      {text.split("\n").filter((l) => !l.startsWith("===") && !l.startsWith("Index:")).map((l, i) => (
        <div key={i} className={l.startsWith("+") && !l.startsWith("+++") ? "add" : l.startsWith("-") && !l.startsWith("---") ? "del" : l.startsWith("@@") ? "hunk" : ""}>{l || " "}</div>
      ))}
    </div>
  );
}

export default async function Inbox() {
  let items: { p: Patch; pv: Preview }[];
  try {
    const patches = await pendingPatches();
    items = await Promise.all(patches.map(async (p) => ({ p, pv: await preview(p) })));
  } catch (e: any) { return <Shell><h1>Da approvare</h1><Setup error={e.message} /></Shell>; }

  return (
    <Shell inbox={items.length}>
      <h1>Da approvare</h1>
      <p className="sub">Modifiche proposte dall'agente. Niente viene scritto finché non approvi, qui o su WhatsApp con «ok CODICE».</p>
      {items.length === 0 && <p className="vuoto">Nessuna modifica in attesa. Inoltra in chat un messaggio del commercialista per crearne una.</p>}
      {items.map(({ p, pv }) => (
        <article className="patch" key={p.code}>
          <header>
            <span className="codice">{p.code}</span>
            <span>{p.fonte.tipo}{p.fonte.nome && ` · ${p.fonte.nome}`} · {new Date(p.creato).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })} · da {p.da}</span>
          </header>
          {p.fonte.rif && <p style={{ margin: "8px 0 0" }}>{p.fonte.rif}</p>}
          <p style={{ margin: "8px 0 0", color: "var(--fondale)" }}>{p.operazioni.length} operazioni su {pv.files.length} file: {pv.files.join(", ")}</p>
          {pv.errors.map((e) => <p key={e} className="conflitto">Errore: {e}</p>)}
          {pv.conflicts.map((c) => <p key={c} className="conflitto">Conflitto {c}</p>)}
          <Diff text={pv.diff} />
          <Azioni code={p.code} conflitti={pv.conflicts.length} />
        </article>
      ))}
    </Shell>
  );
}
