import { Shell } from "@/app/components/Shell";
import Chat from "./Chat";
import { loadHistory } from "@/lib/history";
import { agentIssue } from "@/lib/availability";
import ConnectionNotice from "@/app/components/ConnectionNotice";

export const dynamic = "force-dynamic";

export default async function Page() {
  const issue = await agentIssue();
  const history = issue ? [] : await loadHistory("web").catch(() => []);
  return (
    <Shell>
      <h1>Chat</h1>
      {issue && <ConnectionNotice message={issue} />}
      <Chat disabled={!!issue} initial={history.map((t) => ({ role: t.role, text: t.text }))} />
    </Shell>
  );
}
