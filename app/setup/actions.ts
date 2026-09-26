"use server";
import { revalidatePath } from "next/cache";
import { save, settings, KEYS, Key } from "@/lib/config";
import { db, dbKind } from "@/lib/db";
import { headers } from "next/headers";

export type Esito = { ok?: string; error?: string; errors?: Partial<Record<Key, string>> };

export async function salva(fd: FormData): Promise<Esito> {
  const values: Partial<Record<Key, string>> = {};
  for (const k of KEYS) if (fd.has(k)) values[k] = String(fd.get(k) ?? "");
  const before = (await settings()).KB_ROOT_FOLDER_ID;
  const r = await save(values, "web");
  if (!r.ok) return { error: "Controlla i campi evidenziati.", errors: r.errors };
  if ("KB_ROOT_FOLDER_ID" in values && values.KB_ROOT_FOLDER_ID?.trim() !== before) {
    const { invalidate } = await import("@/lib/drive");
    const { invalidateDocs } = await import("@/lib/kb");
    invalidate(); invalidateDocs();
  }
  revalidatePath("/", "layout");
  return { ok: "Salvato. Le altre istanze si aggiornano entro 30 secondi." };
}

export type Prova = "db" | "claude" | "drive" | "gmail" | "whatsapp" | "whatsapp-invio" | "telegram" | "telegram-collega";

const need = (...keys: string[]) => {
  const miss = keys.filter((k) => !process.env[k]);
  if (miss.length) throw new Error(`Mancano in .env: ${miss.join(", ")}`);
};

export async function prova(kind: Prova): Promise<Esito> {
  try {
    switch (kind) {
      case "telegram": {
        need("TELEGRAM_BOT_TOKEN");
        return { ok: await (await import("@/lib/telegram")).telegramStatus() };
      }
      case "telegram-collega": {
        need("TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET");
        const h = await headers();
        const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
        await (await import("@/lib/telegram")).connectTelegram(origin);
        return { ok: "Webhook collegato. Invia /start al bot, copia il tuo ID chat qui sotto e salva." };
      }
      case "db": {
        const c = await db();
        if (!c) return { error: "Nessun database: imposta TURSO_DATABASE_URL e TURSO_AUTH_TOKEN in .env, poi riavvia l'app." };
        const n = (await c.execute("SELECT count(*) AS n FROM settings")).rows[0].n;
        return { ok: `Database ${dbKind()} raggiungibile · ${n} ${n === 1 ? "impostazione salvata" : "impostazioni salvate"}.` };
      }
      case "claude": {
        need("ANTHROPIC_API_KEY");
        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const m = await new Anthropic().models.retrieve((await settings()).ANTHROPIC_MODEL);
        return { ok: `Chiave valida · modello ${m.display_name} (${m.id}) disponibile.` };
      }
      case "drive": {
        need("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN");
        const { index } = await import("@/lib/drive");
        return { ok: `Drive raggiungibile · ${(await index(true)).size - 1} elementi in archivio.` };
      }
      case "gmail": {
        need("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN");
        const { gmailStatus } = await import("@/lib/gmail");
        return { ok: await gmailStatus() };
      }
      case "whatsapp": {
        need("WA_PHONE_NUMBER_ID", "WA_ACCESS_TOKEN");
        const { waStatus } = await import("@/lib/whatsapp");
        return { ok: await waStatus() };
      }
      case "whatsapp-invio": {
        need("WA_PHONE_NUMBER_ID", "WA_ACCESS_TOKEN");
        const { notify, digestNumbers } = await import("@/lib/reminders");
        const nums = await digestNumbers();
        if (!nums.length) return { error: "Nessun numero: imposta i numeri autorizzati." };
        const errs = await notify(`messaggio di prova da ${(await settings()).APP_NAME}. Se lo leggi, i promemoria funzionano.`);
        return errs.length ? { error: `Invio non riuscito: ${errs.join(" · ")}` } : { ok: `Avviso inviato a ${nums.map((n) => "+" + n).join(", ")}.` };
      }
    }
  } catch (e: any) {
    return { error: e?.message ?? String(e) };
  }
}
