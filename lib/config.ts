import { db, dbConfigured } from "./db";

/** Identità fissa del progetto: non è un'impostazione né una variabile d'ambiente. */
export const APP_NAME = "EYRA" as const;

/**
 * Configurazione non segreta, modificabile da /setup.
 * Precedenza: valore salvato nel DB (Turso) > variabile d'ambiente > default.
 * I segreti NON passano da qui: restano solo in .env (vedi SECRETS).
 */
export type Group = "generale" | "claude" | "google" | "calendar" | "whatsapp" | "telegram" | "automatismi";
type Def = { label: string; group: Group; def: string; help?: string; norm?: (v: string) => string; check?: RegExp; err?: string };

const csv = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean).join(",");
const phones = (v: string) => v.split(",").map((s) => s.replace(/[\s+\-().]/g, "")).filter(Boolean).join(",");
const line = (v: string) => v.replace(/\s+/g, " ").trim();

export const DEFS = {
  AUTO_BRIEFING: { label: "Briefing del mattino", group: "automatismi", def: "off", check: /^(on|off)$/, err: "on oppure off" },
  AUTO_WEEKLY: { label: "Riepilogo settimanale (domenica)", group: "automatismi", def: "off", check: /^(on|off)$/, err: "on oppure off" },
  AUTO_REMINDERS: { label: "Promemoria scadenze e attività", group: "automatismi", def: "on", check: /^(on|off)$/, err: "on oppure off" },
  AUTO_EMAIL: { label: "Import Gmail giornaliero", group: "automatismi", def: "on", check: /^(on|off)$/, err: "on oppure off" },
  AUTO_BACKUP: { label: "Backup completo settimanale", group: "automatismi", def: "on", check: /^(on|off)$/, err: "on oppure off" },
  AUTO_CHANNEL: { label: "Canale degli avvisi", group: "automatismi", def: "whatsapp", check: /^(whatsapp|telegram|both)$/, err: "whatsapp, telegram o both" },
  AUTO_TIMEZONE: { label: "Fuso degli automatismi", group: "automatismi", def: "Europe/Rome", norm: line, help: "Esempio: Europe/Rome, Europe/Madrid. Il cron Vercel parte alle 06 UTC; l’orario locale cambia con l’ora legale." },
  QUIET_START: { label: "Inizio fascia silenziosa", group: "automatismi", def: "22", check: /^(\d|1\d|2[0-3])$/, err: "ora da 0 a 23" },
  QUIET_END: { label: "Fine fascia silenziosa", group: "automatismi", def: "7", check: /^(\d|1\d|2[0-3])$/, err: "ora da 0 a 23", help: "Stessa ora di inizio = nessuna fascia silenziosa. Gli avvisi in attesa partono alla prossima esecuzione fuori fascia." },
  TELEGRAM_DIGEST_CHAT_IDS: { label: "Chat Telegram per i riepiloghi", group: "telegram", def: "", norm: csv, check: /^(\d{1,16}(,\d{1,16})*)?$/, err: "ID chat private separati da virgola", help: "Vuoto = tutte le chat autorizzate. Gli ID devono essere anche nella lista autorizzata." },
  TRANSCRIPTION_PROVIDER: { label: "Trascrizione vocali Telegram", group: "telegram", def: "off", check: /^(off|openai)$/, err: "off oppure openai", help: "openai richiede OPENAI_API_KEY nelle variabili d’ambiente. L’audio viene inviato al servizio di trascrizione." },
  LEARNING_ENABLED: { label: "Proposte di apprendimento dalle chat", group: "generale", def: "on", check: /^(on|off)$/, err: "on oppure off", help: "Le preferenze apprese restano proposte finché non le approvi. Puoi rivederle nella pagina Memoria." },
  APP_TAGLINE: { label: "Sottotitolo", group: "generale", def: "", norm: line, check: /^.{0,60}$/, err: "max 60 caratteri",
    help: "Facoltativo. Nessun sottotitolo predefinito." },
  ANTHROPIC_MODEL: { label: "Modello Claude", group: "claude", def: "claude-sonnet-5", norm: line, check: /^[a-z0-9][a-z0-9.\-]{2,80}$/, err: "ID modello non valido",
    help: "Sonnet: equilibrio costo/qualità. Opus: più accurato e più caro. Haiku: veloce ed economico." },
  KB_ROOT_FOLDER_ID: { label: "ID cartella archivio su Drive", group: "google", def: "", norm: line, check: /^([\w-]{10,})?$/, err: "ID cartella non valido",
    help: "Si imposta da solo con «Crea archivio». È la parte finale dell'URL della cartella su Drive." },
  GMAIL_LABEL: { label: "Etichetta Gmail da importare", group: "google", def: "", norm: line, check: /^.{0,60}$/, err: "max 60 caratteri",
    help: "Vuoto = usa il nome dell'assistente. Se la cambi, rinomina anche l'etichetta in Gmail." },
  GOOGLE_CALENDAR_ID: { label: "Calendario", group: "calendar", def: "primary", norm: line, check: /^[^\s\x00-\x1f]{1,1024}$/, err: "ID calendario non valido",
    help: "primary = calendario principale. Puoi scegliere un calendario dall’elenco oppure copiare l’ID da Google Calendar → Impostazioni → Integra calendario." },
  GOOGLE_CALENDAR_MODE: { label: "Modalità Calendar", group: "calendar", def: "off", check: /^(off|read|sync)$/, err: "scegli una modalità valida",
    help: "La sincronizzazione invia le scadenze attive e confermate dei prossimi 90 giorni. Le modifiche su Google non cambiano l’archivio." },
  WA_ALLOWED_NUMBERS: { label: "Numeri autorizzati", group: "whatsapp", def: "", norm: phones, check: /^(\d{8,15}(,\d{8,15})*)?$/, err: "numeri con prefisso, solo cifre, separati da virgola",
    help: "Solo questi numeri possono scrivere all'assistente. Es. 393400000000,34600000000" },
  WA_DIGEST_NUMBERS: { label: "Numeri che ricevono i promemoria", group: "whatsapp", def: "", norm: phones, check: /^(\d{8,15}(,\d{8,15})*)?$/, err: "numeri con prefisso, solo cifre, separati da virgola",
    help: "Vuoto = tutti i numeri autorizzati." },
  TELEGRAM_ALLOWED_CHAT_IDS: { label: "ID chat Telegram autorizzati", group: "telegram", def: "", norm: csv, check: /^(\d{1,16}(,\d{1,16})*)?$/, err: "ID numerici delle chat private, separati da virgola",
    help: "Invia /start al tuo bot per conoscere l’ID, poi incollalo qui. Telegram usa l’ID chat, non il numero di telefono. Vuoto = nessun accesso all’assistente." },
  WA_TEMPLATE_DIGEST: { label: "Template promemoria", group: "whatsapp", def: "eyra_scadenze", norm: line, check: /^[a-z0-9_]{1,512}$/, err: "minuscole, cifre e _" },
  WA_TEMPLATE_AVVISO: { label: "Template avviso", group: "whatsapp", def: "eyra_avviso", norm: line, check: /^[a-z0-9_]{1,512}$/, err: "minuscole, cifre e _" },
  WA_TEMPLATE_LANG: { label: "Lingua template", group: "whatsapp", def: "it", norm: line, check: /^[a-z]{2}(_[A-Z]{2})?$/, err: "es. it o it_IT" },
  REMINDER_DAYS: { label: "Giorni di preavviso promemoria", group: "automatismi", def: "7,2,0", norm: csv, check: /^(\d{1,2}(,\d{1,2})*)?$/, err: "numeri da 0 a 99 separati da virgola",
    help: "Ogni mattina avvisa delle scadenze che cadono tra questi giorni. 0 = oggi." },
} satisfies Record<string, Def>;

export type Key = keyof typeof DEFS;
export const KEYS = Object.keys(DEFS) as Key[];

/** Solo .env. Da web si mostra se sono impostati, mai il valore. */
export const SECRETS: { key: string; label: string; group: Group | "accesso" | "database" }[] = [
  { key: "APP_EMAIL", label: "Email di accesso", group: "accesso" },
  { key: "APP_PASSWORD", label: "Password di accesso", group: "accesso" },
  { key: "AUTH_SECRET", label: "Firma sessione", group: "accesso" },
  { key: "TURSO_DATABASE_URL", label: "URL database", group: "database" },
  { key: "TURSO_AUTH_TOKEN", label: "Token database", group: "database" },
  { key: "ANTHROPIC_API_KEY", label: "Chiave API", group: "claude" },
  { key: "GOOGLE_CLIENT_ID", label: "Client ID OAuth", group: "google" },
  { key: "GOOGLE_CLIENT_SECRET", label: "Client secret OAuth", group: "google" },
  { key: "GOOGLE_REFRESH_TOKEN", label: "Accesso Drive, Gmail e Calendar", group: "google" },
  { key: "WA_PHONE_NUMBER_ID", label: "ID numero", group: "whatsapp" },
  { key: "WA_ACCESS_TOKEN", label: "Token di accesso", group: "whatsapp" },
  { key: "WA_APP_SECRET", label: "Chiave segreta app", group: "whatsapp" },
  { key: "WA_VERIFY_TOKEN", label: "Token verifica webhook", group: "whatsapp" },
  { key: "TELEGRAM_BOT_TOKEN", label: "Token bot Telegram", group: "telegram" },
  { key: "TELEGRAM_WEBHOOK_SECRET", label: "Segreto webhook Telegram", group: "telegram" },
  { key: "CRON_SECRET", label: "Segreto cron", group: "automatismi" },
  { key: "OPENAI_API_KEY", label: "Chiave trascrizione vocali", group: "telegram" },
  { key: "BACKUP_MIRROR_URL", label: "Endpoint HTTPS per copia backup separata", group: "automatismi" },
  { key: "BACKUP_MIRROR_TOKEN", label: "Token copia backup separata", group: "automatismi" },
];

export type Source = "web" | "env" | "default";
export type Settings = Record<Key, string> & { readonly APP_NAME: typeof APP_NAME };

let cache: { at: number; rows: Map<string, string> } | null = null;
const TTL = 30_000;

async function stored(): Promise<Map<string, string>> {
  if (cache && Date.now() - cache.at < TTL) return cache.rows;
  const c = await db();
  const rows = new Map<string, string>();
  if (c) for (const r of (await c.execute("SELECT key, value FROM settings")).rows) rows.set(String(r.key), String(r.value));
  cache = { at: Date.now(), rows };
  return rows;
}

export async function detail(): Promise<Record<Key, { value: string; source: Source }>> {
  const rows = await stored();
  return Object.fromEntries(KEYS.map((k) => {
    if (rows.has(k)) return [k, { value: rows.get(k)!, source: "web" as Source }];
    const env = process.env[k];
    if (env) return [k, { value: env, source: "env" as Source }];
    return [k, { value: DEFS[k].def, source: "default" as Source }];
  })) as Record<Key, { value: string; source: Source }>;
}

export async function settings(): Promise<Settings> {
  const d = await detail();
  return { ...Object.fromEntries(KEYS.map((k) => [k, d[k].value])), APP_NAME } as Settings;
}

export const setting = async (k: Key) => (await settings())[k];
export const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

/** Nome e sottotitolo per l'interfaccia. Non blocca mai il rendering: se il DB non risponde usa env/default. */
export async function brand(): Promise<{ name: string; tagline: string }> {
  try { const s = await settings(); return { name: s.APP_NAME, tagline: s.APP_TAGLINE }; }
  catch { return { name: APP_NAME, tagline: process.env.APP_TAGLINE ?? DEFS.APP_TAGLINE.def }; }
}

export const gmailLabel = (s: Settings) => s.GMAIL_LABEL || s.APP_NAME;

/** Valida e salva. Stringa vuota = rimuove dal DB (torna a env o default). */
export async function save(values: Partial<Record<Key, string>>, who: string): Promise<{ ok: boolean; errors: Partial<Record<Key, string>> }> {
  const c = await db();
  if (!c) return { ok: false, errors: { APP_TAGLINE: "Database non configurato: imposta TURSO_DATABASE_URL e TURSO_AUTH_TOKEN in .env." } };
  const errors: Partial<Record<Key, string>> = {};
  const clean: [Key, string][] = [];
  for (const [k, raw] of Object.entries(values) as [Key, string][]) {
    if (!KEYS.includes(k)) continue;
    const d: Def = DEFS[k];
    if (!d) continue;
    const v = d.norm ? d.norm(raw ?? "") : (raw ?? "").trim();
    if (v && d.check && !d.check.test(v)) { errors[k] = d.err ?? "valore non valido"; continue; }
    if (k === "REMINDER_DAYS" && v && list(v).some((n) => +n > 90)) { errors[k] = "max 90 giorni"; continue; }
    if (k === "AUTO_TIMEZONE" && v) { try { new Intl.DateTimeFormat("it", { timeZone: v }); } catch { errors[k] = "Fuso orario non valido"; continue; } }
    clean.push([k, v]);
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  if (!clean.length) return { ok: true, errors: {} };
  const now = new Date().toISOString();
  await c.batch(clean.map(([k, v]) => v
    ? { sql: "INSERT INTO settings (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by", args: [k, v, now, who] }
    : { sql: "DELETE FROM settings WHERE key = ?", args: [k] }), "write");
  cache = null;
  return { ok: true, errors: {} };
}

export { dbConfigured };
