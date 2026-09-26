import { Shell } from "@/app/components/Shell";
import Chat from "./Chat";
import { loadHistory } from "@/lib/history";

export const dynamic = "force-dynamic";

export default async function Page() {
  const history = await loadHistory("web").catch(() => []);
  return (
    <Shell>
      <h1>Chat</h1>
      <Chat initial={history.map((t) => ({ role: t.role, text: t.text }))} />
    </Shell>
  );
}
