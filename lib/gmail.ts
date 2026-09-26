import { gmail as gmailApi, gmail_v1 } from "@googleapis/gmail";
import { googleAuth, writeText, writeBinary } from "./drive";
import { runAgent, Attachment } from "./agent";
import { today } from "./kb";
import { settings, gmailLabel } from "./config";

const MAX_ATT = 15 * 1024 * 1024;

let client: gmail_v1.Gmail | null = null;
const gm = () => (client ??= gmailApi({ version: "v1", auth: googleAuth() }));

async function labelId(name: string): Promise<string> {
  const r = await gm().users.labels.list({ userId: "me" });
  const found = r.data.labels?.find((l) => l.name === name);
  if (found) return found.id!;
  const c = await gm().users.labels.create({ userId: "me", requestBody: { name, labelListVisibility: "labelShow", messageListVisibility: "show" } });
  return c.data.id!;
}

const b64 = (s?: string | null) => Buffer.from((s ?? "").replace(/-/g, "+").replace(/_/g, "/"), "base64");
const header = (m: gmail_v1.Schema$Message, n: string) => m.payload?.headers?.find((h) => h.name?.toLowerCase() === n)?.value ?? "";
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 50) || "email";

function walk(p: gmail_v1.Schema$MessagePart | undefined, out: gmail_v1.Schema$MessagePart[] = []) {
  if (!p) return out;
  out.push(p);
  (p.parts ?? []).forEach((c) => walk(c, out));
  return out;
}

function bodyText(parts: gmail_v1.Schema$MessagePart[]): string {
  const plain = parts.find((p) => p.mimeType === "text/plain" && !p.filename && p.body?.data);
  if (plain) return b64(plain.body!.data).toString("utf8");
  const html = parts.find((p) => p.mimeType === "text/html" && !p.filename && p.body?.data);
  if (!html) return "";
  return b64(html.body!.data).toString("utf8")
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
}

export type Imported = { oggetto: string; da: string; riepilogo: string };

/** Importa email con etichetta GMAIL_LABEL non ancora elaborate. PEC: inoltrarla a Gmail con filtro che applica l'etichetta. */
export async function importEmails(max = 8): Promise<Imported[]> {
  if (process.env.KB_LOCAL_DIR) return [];
  const label = gmailLabel(await settings()), doneName = `${label}-importato`;
  const [lab, done] = await Promise.all([labelId(label), labelId(doneName)]);
  const list = await gm().users.messages.list({ userId: "me", labelIds: [lab], q: `-label:${doneName.replace(/\s+/g, "-")}`, maxResults: max });
  const out: Imported[] = [];
  for (const { id } of list.data.messages ?? []) {
    const m = (await gm().users.messages.get({ userId: "me", id: id!, format: "full" })).data;
    const parts = walk(m.payload);
    const da = header(m, "from"), oggetto = header(m, "subject"), data = header(m, "date");
    const text = bodyText(parts);
    const base = `${today()}-${slug(oggetto)}-${id!.slice(-5)}`;
    await writeText(`90-inbox/email/${base}.md`, `# ${oggetto}\n\nDa: ${da}\nData: ${data}\nGmail id: ${id}\n\n${text}\n`);

    const attachments: Attachment[] = [];
    for (const p of parts.filter((x) => x.filename && x.body?.attachmentId)) {
      if ((p.body?.size ?? 0) > MAX_ATT) continue;
      const a = await gm().users.messages.attachments.get({ userId: "me", messageId: id!, id: p.body!.attachmentId! });
      const buf = b64(a.data.data);
      await writeBinary(`90-inbox/allegati/${base}-${p.filename}`, buf, p.mimeType ?? "application/octet-stream");
      attachments.push({ name: p.filename!, mime: p.mimeType ?? "application/octet-stream", data: buf });
    }

    const riepilogo = await runAgent({
      key: "email", who: da, channel: "email", noHistory: true, attachments,
      text: `Email importata da Gmail.\nDa: ${da}\nOggetto: ${oggetto}\nData: ${data}\nSalvata in 90-inbox/email/${base}.md\n\n${text.slice(0, 20_000)}`,
    });
    await gm().users.messages.modify({ userId: "me", id: id!, requestBody: { addLabelIds: [done] } });
    out.push({ oggetto, da, riepilogo });
  }
  return out;
}

/** Per Setup: verifica accesso Gmail e presenza dell'etichetta, senza crearla. */
export async function gmailStatus(): Promise<string> {
  const label = gmailLabel(await settings());
  const [profile, labels] = await Promise.all([gm().users.getProfile({ userId: "me" }), gm().users.labels.list({ userId: "me" })]);
  const found = labels.data.labels?.some((l) => l.name === label);
  return `Gmail ${profile.data.emailAddress} raggiungibile. Etichetta «${label}» ${found ? "presente" : "non ancora creata: creala in Gmail o verrà creata al primo import"}.`;
}
