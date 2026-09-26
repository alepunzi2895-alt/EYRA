/** Unlock Web Audio from the button gesture, before waiting on the network (Safari). */
export class CloudSpeaker {
  private context: AudioContext | null = null;
  private queue: { text: string; voice: string; started?: boolean; audio?: AudioBuffer }[] = [];
  private working = false;
  private epoch = 0;
  private request?: AbortController;
  private source?: AudioBufferSourceNode;
  constructor(private status: (message: string) => void) {}
  unlock() {
    try {
      this.context ??= new AudioContext();
      void this.context.resume().then(() => this.pump()).catch(() => this.status("Tocca Riprendi audio per consentire la riproduzione."));
    } catch { this.status("Audio AI non supportato: scegli una voce del dispositivo."); }
  }
  enqueue(text: string, voice: string) {
    const last = this.queue.at(-1);
    if (last && !last.started && last.voice === voice && last.text.length + text.length < 650) last.text += " " + text;
    else this.queue.push({ text, voice });
    void this.pump();
  }
  private async pump() {
    if (this.working || !this.queue.length) return;
    if (!this.context || this.context.state !== "running") { this.status("Tocca Riprendi audio per consentire la riproduzione."); return; }
    this.working = true; const epoch = this.epoch;
    try {
      while (this.queue.length && epoch === this.epoch) {
        const item = this.queue[0];
        item.started = true;
        if (!item.audio) {
          this.request = new AbortController(); this.status("Preparo la voce AI…");
          const controller = this.request, timeout = setTimeout(() => controller.abort(), 60000);
          let response: Response;
          try { response = await fetch("/api/audio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: item.text, voice: item.voice }), signal: controller.signal }); }
          finally { clearTimeout(timeout); }
          if (!response.ok) { const body = await response.json(); throw new Error(body.error || "Voce AI non disponibile."); }
          item.audio = await this.context.decodeAudioData(await response.arrayBuffer());
        }
        if (epoch !== this.epoch) break;
        if (this.context.state !== "running") { this.status("Tocca Riprendi audio per ascoltare la risposta."); break; }
        this.queue.shift();
        this.status("Voce AI in riproduzione");
        await new Promise<void>(resolve => {
          const source = this.context!.createBufferSource(); this.source = source;
          source.buffer = item.audio!; source.connect(this.context!.destination);
          source.onended = () => { source.disconnect(); resolve(); }; source.start();
        });
      }
      if (epoch === this.epoch && !this.queue.length) this.status("");
    } catch(e) { if (epoch === this.epoch) { this.queue = []; this.status(e instanceof Error ? e.message : "Voce AI interrotta."); } }
    finally { this.working = false; if (this.queue.length && this.context?.state === "running") void this.pump(); }
  }
  stop() { this.epoch++; this.queue = []; this.request?.abort(); try { this.source?.stop(); } catch { /* finished */ } }
  dispose() { this.stop(); void this.context?.close().catch(() => {}); this.context = null; }
}
