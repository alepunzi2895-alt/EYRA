import { Shell } from "@/app/components/Shell";
import Chat from "./Chat";
import { loadHistory, conversations, validConversation } from "@/lib/history";
import Link from "next/link";
import { newChat, archiveChat } from "./actions";
import { chatIssue } from "@/lib/availability";
import ConnectionNotice from "@/app/components/ConnectionNotice";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string; q?: string; archived?: string; before?: string }> }) {
  const params = await searchParams;
  const id = params.id && validConversation(params.id) ? params.id : "web";
  const issue = await chatIssue();
  const history = await loadHistory(id, 100, Number(params.before) || undefined).catch(() => []);
  const list = await conversations(params.q, params.archived === "1").catch(() => []);
  const readOnly = !id.startsWith("web");
  return (
    <Shell>
      <h1>Chat</h1>
      {issue && <ConnectionNotice message={issue} />}
      <div className="conversation-layout">
        <aside className="conversation-list">
          <form action={newChat}><button>Nuova chat</button></form>
          <form><input name="q" aria-label="Cerca nelle conversazioni" placeholder="Cerca nelle chat…" defaultValue={params.q} /><button className="sec">Cerca</button></form>
          <Link href={params.archived === "1" ? "/chat" : "/chat?archived=1"}>{params.archived === "1" ? "Conversazioni attive" : "Archiviate"}</Link>
          {list.map(c => <article key={c.id}>
            <Link href={`/chat?id=${encodeURIComponent(c.id)}`} aria-current={c.id === id ? "page" : undefined}>{c.title}</Link>
            <small>{c.channel} · {new Date(c.updated_at).toLocaleDateString("it-IT")}</small>
            <form action={archiveChat}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="archived" value={c.archived ? "0" : "1"} /><button className="sec">{c.archived ? "Ripristina" : "Archivia"}</button></form>
          </article>)}
        </aside>
        <div>
          {readOnly && <p className="aiuto">Cronologia del canale esterno. Per continuare dal sito, apri una nuova chat.</p>}
          {history.length === 100 && <Link href={`/chat?id=${encodeURIComponent(id)}&before=${history[0].id}`}>Messaggi precedenti</Link>}
          {params.before && <p><Link href={`/chat?id=${encodeURIComponent(id)}`}>Torna ai messaggi recenti</Link></p>}
          <Chat key={`${id}-${params.before ?? ""}`} conversationId={id} disabled={!!issue || readOnly || !!params.before} initial={history.map(t => ({ role: t.role, text: t.text }))} />
        </div>
      </div>
    </Shell>
  );
}
