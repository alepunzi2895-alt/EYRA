import Link from "next/link";
import { Shell } from "@/app/components/Shell";
import Setup from "@/app/components/Setup";
import { index, isFolder } from "@/lib/drive";
import { loadAll } from "@/lib/kb";

export const dynamic = "force-dynamic";

export default async function Cartella({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  const base = path.map(decodeURIComponent).join("/");
  let map, docs;
  try { [map, docs] = await Promise.all([index(), loadAll()]); }
  catch (e: any) { return <Shell><h1>Archivio</h1><Setup error={e.message} /></Shell>; }
  const titles = new Map(docs.map((d) => [d.path, d.fm?.titolo as string | undefined]));
  const kids = [...map.values()]
    .filter((n) => n.path && n.path.split("/").slice(0, -1).join("/") === base)
    .sort((a, b) => Number(isFolder(b)) - Number(isFolder(a)) || a.name.localeCompare(b.name));

  return (
    <Shell>
      <div className="briciole">
        <Link href="/cartella">Archivio</Link>
        {path.map((p, i) => <span key={i}> / <Link href={`/cartella/${path.slice(0, i + 1).join("/")}`}>{decodeURIComponent(p)}</Link></span>)}
      </div>
      <h1>{base ? decodeURIComponent(path.at(-1)!) : "Archivio"}</h1>
      <p className="sub">{kids.length} elementi</p>
      {kids.length === 0 ? <p className="vuoto">Cartella vuota.</p> : (
        <ul className="cartelle">
          {kids.map((n) => (
            <li key={n.id}>
              {isFolder(n)
                ? <Link href={`/cartella/${n.path.split("/").map(encodeURIComponent).join("/")}`}><span>{n.name}/</span><em>cartella</em></Link>
                : n.name.endsWith(".md")
                  ? <Link href={`/f/${encodeURIComponent(n.name.replace(/\.md$/, ""))}`}><span>{titles.get(n.path) ?? n.name}</span><em>{n.name.replace(/\.md$/, "")}</em></Link>
                  : <a href={`https://drive.google.com/file/d/${n.id}/view`} target="_blank" rel="noreferrer"><span>{n.name}</span><em>apri su Drive</em></a>}
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
