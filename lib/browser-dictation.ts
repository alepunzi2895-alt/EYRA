export type RecognitionResult = { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
export type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((event: RecognitionResult) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null; onstart: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
/** One user-controlled session, possibly spanning several short Safari recognitions. */
export class BrowserDictation {
  private current: Recognition | null = null;
  private wanted = false;
  private latest = "";
  private idleRestarts = 0;
  private restart?: ReturnType<typeof setTimeout>;
  private deadline?: ReturnType<typeof setTimeout>;
  private stopping?: ReturnType<typeof setTimeout>;
  private progress?: ReturnType<typeof setTimeout>;
  constructor(private create: () => Recognition, private update: (text: string) => void, private state: (listening: boolean, message: string, failed?: boolean) => void, private idleTimeout = 15000) {}
  private fail(message: string) { this.dispose(); this.state(false, message, true); }
  private awaitWords() {
    clearTimeout(this.progress);
    this.progress = setTimeout(() => this.fail("Non arrivano parole dal browser. Usa il microfono della tastiera oppure Registra e trascrivi. Il testo già scritto resta qui."), this.idleTimeout);
  }
  start(initial: string) {
    this.dispose(); this.latest = initial.trim(); this.wanted = true; this.idleRestarts = 0;
    this.deadline = setTimeout(() => this.stop(), 90_000);
    this.awaitWords();
    this.launch();
  }
  private launch() {
    if (!this.wanted) return;
    let r: Recognition;
    try { r = this.create(); } catch { this.fail("Il riconoscimento vocale non è disponibile. Usa il microfono della tastiera o Registra e trascrivi."); return; }
    const prefix = this.latest, segments: string[] = [];
    this.current = r; r.lang = "it-IT"; r.interimResults = true; r.continuous = true;
    this.state(true, "Avvio microfono…");
    r.onstart = () => { if (this.current === r) this.state(true, "Riconoscimento avviato. Parla: il testo apparirà qui sotto."); };
    r.onresult = event => {
      if (this.current !== r) return;
      segments.length = event.results.length;
      for (let i = 0; i < event.results.length; i++) segments[i] = event.results[i][0]?.transcript || "";
      const next = [prefix, segments.join(" ").trim()].filter(Boolean).join(" ");
      if (next !== this.latest) { this.idleRestarts = 0; this.awaitWords(); this.state(true, "Ricevo il testo. Premi Termina quando hai finito."); }
      this.latest = next; this.update(next);
    };
    r.onerror = ({ error }) => {
      if (this.current !== r || (!this.wanted && error === "aborted")) return;
      const message = error === "not-allowed" ? "Consenti il microfono nelle impostazioni del sito in Safari. Controlla anche che Siri e Dettatura siano abilitati su iPhone, oppure usa il microfono della tastiera." : error === "service-not-allowed" ? "Safari non consente il servizio di riconoscimento. Controlla Siri e Dettatura nelle impostazioni iPhone, oppure usa il microfono della tastiera." : error === "no-speech" ? "Non ho ricevuto parole. Il testo resta qui: usa il microfono della tastiera o riprova." : error === "audio-capture" ? "Microfono non disponibile: chiudi altre registrazioni e riprova." : "La dettatura del browser si è interrotta. Il testo resta qui; puoi usare il microfono della tastiera o Registra e trascrivi.";
      this.fail(message);
    };
    r.onend = () => {
      if (this.current !== r) return;
      this.current = null; clearTimeout(this.stopping);
      if (this.wanted && ++this.idleRestarts <= 2) this.restart = setTimeout(() => this.launch(), 200);
      else if (this.wanted) this.fail("Il browser interrompe il riconoscimento senza nuove parole. Usa il microfono della tastiera o Registra e trascrivi.");
      else { clearTimeout(this.deadline); clearTimeout(this.progress); this.state(false, "Dettatura terminata. Controlla il testo prima di inviare."); }
    };
    try { r.start(); } catch { this.fail("Il browser non ha avviato il microfono. Usa il microfono della tastiera o Registra e trascrivi."); }
  }
  stop() {
    this.wanted = false; clearTimeout(this.restart); clearTimeout(this.deadline); clearTimeout(this.progress);
    if (!this.current) { this.state(false, "Dettatura terminata."); return; }
    const r = this.current;
    this.state(true, "Completo la dettatura…");
    this.stopping = setTimeout(() => { if (this.current === r) { this.dispose(); this.state(false, "Dettatura terminata. Controlla il testo."); } }, 2000);
    try { r.stop(); } catch { this.dispose(); this.state(false, "Dettatura terminata."); }
  }
  dispose() {
    this.wanted = false; clearTimeout(this.restart); clearTimeout(this.deadline); clearTimeout(this.stopping); clearTimeout(this.progress);
    const r = this.current; this.current = null;
    if (r) { r.onresult = null; r.onerror = null; r.onend = null; r.onstart = null; try { r.abort(); } catch { /* already stopped */ } }
  }
}
