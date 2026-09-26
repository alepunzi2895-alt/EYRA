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
  constructor(private create: () => Recognition, private update: (text: string) => void, private state: (listening: boolean, message: string) => void) {}
  start(initial: string) {
    this.dispose(); this.latest = initial.trim(); this.wanted = true; this.idleRestarts = 0;
    this.deadline = setTimeout(() => this.stop(), 90_000);
    this.launch();
  }
  private launch() {
    if (!this.wanted) return;
    const r = this.create(), prefix = this.latest, segments: string[] = [];
    let hadError = false;
    this.current = r; r.lang = "it-IT"; r.interimResults = true; r.continuous = true;
    this.state(true, "Avvio microfono…");
    r.onstart = () => { if (this.current === r) this.state(true, "Ti ascolto. Premi Termina quando hai finito."); };
    r.onresult = event => {
      if (this.current !== r) return;
      segments.length = event.results.length;
      for (let i = 0; i < event.results.length; i++) segments[i] = event.results[i][0]?.transcript || "";
      const next = [prefix, segments.join(" ").trim()].filter(Boolean).join(" ");
      if (next !== this.latest) this.idleRestarts = 0;
      this.latest = next; this.update(next);
    };
    r.onerror = ({ error }) => {
      if (this.current !== r || (!this.wanted && error === "aborted")) return;
      hadError = true;
      this.wanted = false; clearTimeout(this.deadline);
      const message = ["not-allowed", "service-not-allowed"].includes(error) ? "Consenti il microfono nelle impostazioni del sito in Safari. Se resta bloccato, usa il microfono della tastiera o la registrazione audio." : error === "no-speech" ? "Non ho sentito parole. Il testo resta qui: premi Detta per riprovare." : error === "audio-capture" ? "Microfono non disponibile: chiudi altre registrazioni e riprova." : "La dettatura del browser si è interrotta. Il testo resta qui; puoi riprovare o usare la registrazione audio.";
      this.state(false, message);
    };
    r.onend = () => {
      if (this.current !== r) return;
      this.current = null; clearTimeout(this.stopping);
      if (hadError) return;
      if (this.wanted && ++this.idleRestarts <= 2) this.restart = setTimeout(() => this.launch(), 200);
      else { this.wanted = false; clearTimeout(this.deadline); this.state(false, "Dettatura terminata. Controlla il testo prima di inviare."); }
    };
    try { r.start(); } catch { this.wanted = false; this.current = null; clearTimeout(this.deadline); this.state(false, "Safari non ha avviato il microfono. Premi nuovamente Detta o usa la registrazione audio."); }
  }
  stop() {
    this.wanted = false; clearTimeout(this.restart); clearTimeout(this.deadline);
    if (!this.current) { this.state(false, "Dettatura terminata."); return; }
    const r = this.current;
    this.state(true, "Completo la dettatura…");
    this.stopping = setTimeout(() => { if (this.current === r) { this.dispose(); this.state(false, "Dettatura terminata. Controlla il testo."); } }, 2000);
    try { r.stop(); } catch { this.dispose(); this.state(false, "Dettatura terminata."); }
  }
  dispose() {
    this.wanted = false; clearTimeout(this.restart); clearTimeout(this.deadline); clearTimeout(this.stopping);
    const r = this.current; this.current = null;
    if (r) { r.onresult = null; r.onerror = null; r.onend = null; r.onstart = null; try { r.abort(); } catch { /* already stopped */ } }
  }
}
