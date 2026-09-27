import { headers } from "next/headers";
import { Shell } from "@/app/components/Shell";
import Wordmark from "@/app/components/Wordmark";
import { APP_NAME, detail, DEFS, SECRETS, Key, Group } from "@/lib/config";
import { dbKind } from "@/lib/db";
import { Campi, Campo, Verifica, Copia } from "./Campi";
import Profile from "./Profile";
import VoiceSettings from "./VoiceSettings";
import EntitySettings from "./EntitySettings";
import { emptyEntities, parseEntities } from "@/lib/entities";
import CalendarSettings from "./CalendarSettings";
import { readProfile, type UserProfile } from "@/lib/profile";
import { archiveIssue } from "@/lib/availability";

export const dynamic = "force-dynamic";

const MODELLI = ["claude-sonnet-5", "claude-opus-5-5", "claude-haiku-4-5-20251001", "claude-fable-5-1"];
const DB_TESTO = {
  turso: "Collegato a Turso. Le impostazioni qui sotto si salvano nel database.",
  assente: "Nessun database: imposta TURSO_DATABASE_URL e TURSO_AUTH_TOKEN in .env, poi riavvia l'app.",
};
const SEZIONI = [["generale", "Generale"], ["entita", "Pianeti e centri di costo"], ["profilo", "Parlami di te"], ["database", "Database"], ["claude", "Claude"], ["voce", "Voce"], ["google", "Google"], ["calendar", "Calendar"], ["whatsapp", "WhatsApp"], ["telegram", "Telegram"], ["automatismi", "Automatismi"], ["accesso", "Accesso"]];

function Segreti({ group, nonServe = [] }: { group: string; nonServe?: string[] }) {
  return (
    <ul className="check">
      {SECRETS.filter((s) => s.group === group).map((s) => {
        const on = !!process.env[s.key], skip = !on && nonServe.includes(s.key);
        return <li key={s.key}><span>{s.label} <code className="k">{s.key}</code></span><span className={`stato ${on ? "ok" : skip ? "" : "ko"}`}>{on ? "impostata" : skip ? "non serve" : "mancante"}</span></li>;
      })}
    </ul>
  );
}

export default async function Setup() {
  const [d, h] = await Promise.all([detail().catch(() => null), headers()]);
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const kind = dbKind();
  const bloccato = kind === "assente" || !d;
  const val = (k: Key) => d?.[k].value ?? DEFS[k].def;
  const campi = (g: Group, extra: Partial<Record<Key, Partial<Campo>>> = {}): Campo[] =>
    (Object.keys(DEFS) as Key[]).filter((k) => DEFS[k].group === g).map((k) => ({
      key: k, label: DEFS[k].label, help: (DEFS[k] as { help?: string }).help,
      value: val(k), source: d?.[k].source ?? "default", ...extra[k],
    }));
  let entities = emptyEntities();
  try { if (val("HOME_ENTITIES")) entities = parseEntities(val("HOME_ENTITIES")); } catch { /* editor can repair invalid configuration */ }
  const nome = APP_NAME;
  const etichetta = val("GMAIL_LABEL") || nome;
  const cartella = val("KB_ROOT_FOLDER_ID");
  const has = (k: string) => !!process.env[k];
  let profileIssue = await archiveIssue();
  let profile: UserProfile = { name: "", markdown: "" };
  if (!profileIssue) {
    try { profile = await readProfile(); }
    catch { profileIssue = "Profilo non raggiungibile. Verifica il collegamento Google e il file di onboarding nell’archivio."; }
  }

  return (
    <Shell>
      <div className="settings-page">
      <h1>Impostazioni</h1>
      <p className="sub">Puoi completare i collegamenti in momenti diversi. Le chiavi si impostano nelle variabili d’ambiente su Vercel (in locale, in .env): qui vedi solo il loro stato.</p>

      <nav className="indice" aria-label="Sezioni">
        {SEZIONI.map(([id, l]) => <a key={id} href={`#${id}`}>{l}</a>)}
      </nav>

      <section className="passo" id="generale">
        <h2>Generale</h2>
        <p>Il nome dell&apos;assistente è <Wordmark name={nome} inline /> e non è modificabile. Il sottotitolo è facoltativo.</p>
        <Campi campi={campi("generale", { LEARNING_ENABLED: { options: [{ value: "on", label: "Proponi memorie da approvare" }, { value: "off", label: "Non proporre memorie automaticamente" }] } })} bloccato={bloccato} />
      </section>

      <section className="passo" id="entita">
        <h2>Pianeti e centri di costo</h2>
        <p>Ogni pianeta rappresenta un centro distinto. Usa volumi economici annui in EUR riferiti allo stesso anno e con lo stesso criterio: gli importi mancanti restano neutri. Questi valori configurano la visualizzazione e non modificano l’archivio contabile.</p>
        <p>Collega l’ID esatto della scheda entità: rosso per scadenze attive arretrate negli ultimi 90 giorni o entro 3 giorni, ambra entro 14 giorni o documenti da confermare, verde senza segnali nella finestra controllata, grigio se non valutabile. Segna come concluse nell’archivio le scadenze già gestite, tramite proposta approvata.</p>
        <EntitySettings initial={entities} disabled={bloccato} />
      </section>

      <section className="passo" id="voce">
        <h2>Voce e dettatura</h2>
        <p>Per timbri diversi su iPhone e Android, aggiungi <code>OPENAI_API_KEY</code> nelle variabili Vercel, fai Redeploy e attiva Audio AI. Claude continua a preparare le risposte; OpenAI genera la voce e trascrive le registrazioni, a consumo. La voce è generata dall’AI.</p>
        <Segreti group="voce" />
        <Campi campi={campi("voce", { WEB_AUDIO_PROVIDER: { options: [{ value: "off", label: "Solo servizi del dispositivo" }, { value: "openai", label: "Abilita voci e trascrizione OpenAI" }] } })} bloccato={bloccato} />
        <p className="aiuto">In demo i servizi audio a pagamento sono disattivati. Safari richiede HTTPS e il permesso microfono. Qui puoi scegliere la voce, ascoltare l’anteprima e impostare il metodo di dettatura per questo browser.</p>
        <VoiceSettings />
      </section>

      <section className="passo profile-section" id="profilo">
        <h2>Parlami di te</h2>
        <p>Racconta chi sei, di cosa ti occupi e come preferisci essere aiutata o aiutato. <Wordmark name={nome} inline /> userà il profilo approvato nelle conversazioni sul sito, su WhatsApp e su Telegram.</p>
        <Profile initial={profile} issue={profileIssue} />
      </section>

      <section className="passo" id="database">
        <h2>Database <span className={`stato ${kind === "assente" ? "ko" : "ok"}`}>{kind}</span></h2>
        <p>{DB_TESTO[kind]}{!d && kind !== "assente" && " Database non raggiungibile: controlla URL e token."}</p>
        <Segreti group="database" />
        <Verifica kind="db" />
      </section>

      <section className="passo" id="claude">
        <h2>Claude</h2>
        <p>Chiave da console.anthropic.com. Imposta un limite di spesa mensile nel Billing.</p>
        <Segreti group="claude" />
        <datalist id="modelli">{MODELLI.map((m) => <option key={m} value={m} />)}</datalist>
        <Campi campi={campi("claude", { ANTHROPIC_MODEL: { list: "modelli" } })} bloccato={bloccato} />
        <Verifica kind="claude" />
      </section>

      <section className="passo" id="google">
        <h2>Google Drive, Gmail e Calendar</h2>
        <p>URI di reindirizzamento da registrare nel client OAuth su Google Cloud:</p>
        <Copia testo={`${origin}/api/setup/google/callback`} />
        <Segreti group="google" />
        <div className="azioni">
          {has("GOOGLE_CLIENT_ID") && has("GOOGLE_CLIENT_SECRET")
            ? <a className="btn" href="/api/setup/google">{has("GOOGLE_REFRESH_TOKEN") ? "Ricollega Google" : "1. Collega Google"}</a>
            : <p className="conflitto">Prima imposta GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET in .env.</p>}
          {cartella
            ? <a className="btn sec" href={`https://drive.google.com/drive/folders/${cartella}`} target="_blank" rel="noreferrer">Apri archivio su Drive</a>
            : <form method="post" action="/api/setup/seed"><button disabled={!has("GOOGLE_REFRESH_TOKEN")}>2. Crea archivio «<Wordmark name={nome} inline />»</button></form>}
        </div>
        <Campi campi={campi("google", { GMAIL_LABEL: { placeholder: nome } })} bloccato={bloccato} />
        <div className="azioni"><Verifica kind="drive" label="Verifica Drive" /><Verifica kind="gmail" label="Verifica Gmail" /></div>
      </section>

      <section className="passo" id="calendar">
        <h2>Google Calendar</h2>
        <p>Consulta gli appuntamenti e porta sul calendario le scadenze confermate di <Wordmark name={nome} inline />.</p>
        <ol>
          <li>Abilita <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noreferrer">Google Calendar API</a> nello stesso progetto Google Cloud.</li>
          <li>Premi «Ricollega Google» nella sezione Google e autorizza anche Calendar. Sostituisci <code>GOOGLE_REFRESH_TOKEN</code> su Vercel e fai Redeploy.</li>
          <li>Carica i calendari, scegli la destinazione e salva la modalità desiderata. Per le scadenze puoi usare un calendario dedicato, creato da Google Calendar.</li>
        </ol>
        <CalendarSettings campi={campi("calendar", {
          GOOGLE_CALENDAR_ID: { list: "google-calendars" },
          GOOGLE_CALENDAR_MODE: { options: [{ value: "off", label: "Disattivato" }, { value: "read", label: "Solo lettura" }, { value: "sync", label: "Lettura e sincronizzazione" }] },
        })} bloccato={bloccato} />
        <p className="aiuto">Sincronizzazione a senso unico: archivio → Google, ogni giorno o con il pulsante qui sotto. Solo scadenze attive e confermate, entro 90 giorni, come eventi di un giorno intero. Non vengono creati inviti. Le scadenze rimosse dall’archivio vengono rimosse anche dal calendario; gli altri appuntamenti restano intatti. Gli eventi passati si conservano. Cambiando calendario, quelli già esportati restano nella destinazione precedente.</p>
        <div className="azioni">
          <Verifica kind="calendar" label="Verifica Calendar" />
          <Verifica kind="calendar-sync" label="Sincronizza ora" />
          <a href="/calendario" className="btn sec">Apri appuntamenti</a>
        </div>
      </section>

      <section className="passo" id="whatsapp">
        <h2>WhatsApp</h2>
        <p>URL del webhook da inserire su Meta (WhatsApp → Configurazione). Sottoscrivi <b>messages</b>.</p>
        <Copia testo={`${origin}/api/whatsapp`} />
        <Segreti group="whatsapp" />
        <Campi campi={campi("whatsapp")} bloccato={bloccato} />
        <div className="azioni">
          <Verifica kind="whatsapp" />
          <Verifica kind="whatsapp-invio" label="Invia avviso di prova" conferma="Inviare un messaggio WhatsApp di prova ai numeri dei promemoria?" />
        </div>
      </section>

      <section className="passo" id="telegram">
        <h2>Telegram</h2>
        <p>Collega un bot e autorizza la tua chat privata. Non serve un numero dedicato: qui si usa l’ID chat Telegram.</p>
        <ol>
          <li>Apri <a href="https://t.me/BotFather" target="_blank" rel="noreferrer">@BotFather</a>, invia <code>/newbot</code> e scegli nome e username del bot.</li>
          <li>Salva il token come <code>TELEGRAM_BOT_TOKEN</code> nelle variabili d’ambiente su Vercel. Aggiungi <code>TELEGRAM_WEBHOOK_SECRET</code> con una stringa casuale lunga di lettere, numeri, trattini o underscore. Poi fai Redeploy.</li>
          <li>Premi «Collega Telegram», apri la chat con il tuo bot e invia <code>/start</code>.</li>
          <li>Copia l’ID restituito nel campo qui sotto e salva. Solo le chat autorizzate possono parlare con l’assistente.</li>
        </ol>
        <Copia testo={`${origin}/api/telegram`} />
        <Segreti group="telegram" />
        <Campi campi={campi("telegram", { TRANSCRIPTION_PROVIDER: { options: [{ value: "off", label: "Vocali disattivati" }, { value: "openai", label: "Trascrivi con OpenAI" }] } })} bloccato={bloccato} />
        {bloccato && <p className="aiuto">Per salvare gli ID qui, collega il database. Puoi anche impostare TELEGRAM_ALLOWED_CHAT_IDS nelle variabili d’ambiente.</p>}
        <div className="azioni">
          <Verifica kind="telegram" label="Verifica bot" />
          <Verifica kind="telegram-collega" label="Collega Telegram" />
        </div>
        <p className="aiuto">Testo, foto e documenti fino a 15 MB. Vocali fino a 10 minuti con la trascrizione configurata; la trascrizione viene mostrata prima della risposta. Le approvazioni con «ok CODICE» vanno inviate come testo.</p>
      </section>

      <section className="passo" id="automatismi">
        <h2>Automatismi</h2>
        <p>Il <a href="/automatismi">Centro automatismi</a> raccoglie interruttori, anteprime, esiti e invii. Controllo giornaliero alle 06 UTC: 08 in estate e 07 in inverno a Roma e Madrid. Importa le email con etichetta «{etichetta}».</p>
        <Segreti group="automatismi" />
        <p><a className="btn sec" href="/automatismi">Apri centro automatismi</a></p>
        <div className="azioni">
          <form method="post" action="/api/gmail/import"><button className="sec" disabled={!cartella}>Importa email ora</button></form>
          <form method="post" action="/api/setup/backup"><button className="sec" disabled={!cartella}>Backup ora</button></form>
        </div>
      </section>

      <section className="passo" id="accesso">
        <h2>Accesso</h2>
        <p>Credenziali per entrare in questo sito. Per cambiarle modifica .env e riavvia l'app: le sessioni aperte si chiudono.</p>
        <Segreti group="accesso" />
      </section>
      </div>
    </Shell>
  );
}
