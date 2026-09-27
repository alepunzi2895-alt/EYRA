import Link from "next/link";
import { headers } from "next/headers";
import { Shell } from "@/app/components/Shell";
import { loadAll, scadenze, today, addDays } from "@/lib/kb";
import { pendingPatches } from "@/lib/patch";
import { brand, setting } from "@/lib/config";
import Wordmark from "@/app/components/Wordmark";
import { archiveIssue, chatIssue } from "@/lib/availability";
import HomeContext from "@/app/components/HomeContext";
import EntityOrbit from "@/app/components/EntityOrbit";
import { parseEntities, emptyEntities, demoEntities, entityPlanets } from "@/lib/entities";
import Chat from "@/app/chat/Chat";

export const dynamic = "force-dynamic";

export default async function Home() {
  const promptIssue = await chatIssue();
  let issue = await archiveIssue();
  let docs: Awaited<ReturnType<typeof loadAll>> = [];
  let patches: Awaited<ReturnType<typeof pendingPatches>> = [];
  if (!issue) {
    try { [docs, patches] = await Promise.all([loadAll(), pendingPatches()]); }
    catch { issue = "Archivio non raggiungibile: lo stato dei pianeti non è disponibile."; }
  }
  const cfg = await brand();
  const requestHeaders = await headers();
  let approximateCity = "";
  if (process.env.VERCEL === "1") {
    const city = requestHeaders.get("x-vercel-ip-city");
    if (city) { try { approximateCity = decodeURIComponent(city).slice(0, 120); } catch { /* unavailable */ } }
  }
  const demo = !!process.env.KB_LOCAL_DIR;
  let entities = demo ? demoEntities() : emptyEntities();
  let configIssue = "";
  if (!demo) { try { const raw = await setting("HOME_ENTITIES"); if (raw) entities = parseEntities(raw); } catch { configIssue = "Configurazione dei pianeti non disponibile. Verifica le Impostazioni."; } }
  const date = today();
  const planets = entityPlanets(entities, docs, scadenze(docs, 104, addDays(date, -90)), !issue, date);
  return <Shell inbox={patches.length}>
    <div className="cockpit cosmos-home">
      <section className="home-hero" aria-label="Universo dei centri di costo">
        <h1 className="home-wordmark"><Wordmark name={cfg.name} /></h1>
        <HomeContext approximateCity={approximateCity} />
        <EntityOrbit name={cfg.name} planets={planets} year={entities.year} demo={demo} />
        {(issue || configIssue) && <p className="cosmos-notice">{configIssue || issue} <Link href="/setup#entita">Impostazioni ↗</Link></p>}
      </section>
      <div className="home-prompt" id="prompt">
        <Chat initial={[]} inline disabled={!!promptIssue} />
        {promptIssue && <Link className="prompt-setup" href="/setup">Configura la chat ↗</Link>}
      </div>
    </div>
  </Shell>;
}
