import { Shell } from "@/app/components/Shell";
import Carica from "./Carica";
import { loadAll } from "@/lib/kb";
import { brand } from "@/lib/config";
import Wordmark from "@/app/components/Wordmark";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { name } = await brand();
  const entita = (await loadAll().catch(() => [])).filter((d) => d.fm?.tipo === "entita").map((d) => ({ id: d.id, titolo: String(d.fm?.titolo ?? d.id) }));
  return (
    <Shell>
      <h1>Carica</h1>
      <p className="sub">Estratti conto, fatture (PDF o XML, anche .p7m), contratti, documenti. <Wordmark name={name} inline /> li archivia e propone gli aggiornamenti.</p>
      <Carica entita={entita} />
    </Shell>
  );
}
