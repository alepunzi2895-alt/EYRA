"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";
import { useVoice } from "./useVoice";
import AttachmentPicker from "./AttachmentPicker";

type M = { role: "user" | "assistant"; text: string };
const link = (t: string) => t.replace(/\[\[([^\]|#]+)\]\]/g, (_, id) => `[${id}](/f/${encodeURIComponent(id)})`);

export default function Chat({ initial, disabled = false, conversationId = "web", inline = false }: { initial: M[]; disabled?: boolean; conversationId?: string; inline?: boolean }) {
  const [msgs, setMsgs] = useState<M[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [dictated, setDictated] = useState(false);
  const voice = useVoice();
  const router = useRouter();
  const sending = useRef(false);
  const [files, setFiles] = useState<File[]>([]), [preparing, setPreparing] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!msgs.length) return;
    if (inline && end.current?.parentElement) end.current.parentElement.scrollTop = end.current.parentElement.scrollHeight;
    else end.current?.scrollIntoView({ block: "end" });
  }, [msgs, busy, inline]);

  async function send() {
    if (disabled || sending.current || voice.listening || voice.processing || preparing) return;
    const f = files;
    if (!text.trim() && !f?.length) return;
    const fd = new FormData();
    fd.set("text", text);
    fd.set("conversation", conversationId);
    fd.set("dictated", String(dictated));
    for (const x of Array.from(f ?? [])) fd.append("files", x);
    const names = Array.from(f ?? []).map((x) => `[allegato: ${x.name}] `).join("");
    setMsgs((m) => [...m, { role: "user", text: names + text }]);
    setText("");
    setBusy(true);
    sending.current = true; setDictated(false); voice.begin();
    setMsgs(m => [...m, { role: "assistant", text: "" }]);
    const update = (value: string) => setMsgs(m => [...m.slice(0, -1), { role: "assistant", text: value }]);
    try {
      const r = await fetch("/api/chat", { method: "POST", body: fd, headers: { Accept: "application/x-ndjson" } });
      if (!r.ok || !r.headers.get("content-type")?.includes("application/x-ndjson")) {
        const j = await r.json().catch(() => ({ reply: r.status === 413 ? "Allegati troppo grandi. Riduci il numero di pagine." : "Richiesta non riuscita. Riprova." })); update(j.reply || "Richiesta non riuscita."); setText(text); setDictated(dictated); return;
      }
      if (!r.body) throw new Error("Risposta vuota");
      const reader = r.body.getReader(), decoder = new TextDecoder();
      let pending = "", response = "", complete = false;
      while (true) {
        const { value, done } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split("\n"); pending = lines.pop() || "";
        for (const line of lines.filter(Boolean)) {
          const event = JSON.parse(line) as { type: string; text?: string };
          if (event.type === "start") { response = ""; update(""); voice.reset(); }
          if (event.type === "delta") { response += event.text || ""; update(response); voice.push(event.text || ""); }
          if (event.type === "done") { update(event.text || response); voice.push(response ? "" : event.text || "", true); complete = true; setFiles([]); }
          if (event.type === "error") { voice.stop(); update(event.text || "Richiesta non riuscita."); complete = true; }
        }
        if (done) break;
      }
      if (!complete) throw new Error("Risposta interrotta");
      router.refresh();
    } catch {
      voice.stop(); update("Connessione persa. Riapri la chat per verificare se la risposta è stata salvata prima di riprovare.");
    } finally { sending.current = false; setBusy(false); }
  }

  return (
    <div className={`chat${inline ? " chat-inline" : ""}`}>
      <div className="flusso" aria-live="polite" hidden={inline && !msgs.length}>
        {!inline && msgs.length === 0 && <p className="vuoto">Chiedi scadenze, incolla un'email del commercialista, allega PDF o Excel. Le modifiche all'archivio arrivano in «Da approvare».</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role === "user" ? "io" : "agente"}`}>
            {m.role === "user" ? m.text : <><ReactMarkdown remarkPlugins={[remarkGfm]}>{link(m.text)}</ReactMarkdown>{m.text && voice.available && (!busy || i < msgs.length - 1) && <button className="sec listen-message" disabled={voice.listening || voice.processing} onClick={() => voice.replay(m.text)}>Ascolta</button>}</>}
          </div>
        ))}
        {busy && <div className="msg agente">Sto lavorando…</div>}
        <div ref={end} />
      </div>
      <div className="composer">
        <div className="voice-controls">
          {voice.microphone && <button className="sec" disabled={disabled || busy || voice.processing} aria-pressed={voice.listening} onClick={() => voice.dictate(text, value => { setText(value); setDictated(true); })}>{voice.listening ? "Termina" : voice.inputMode === "recording" && voice.cloud.enabled ? "Registra messaggio" : "Detta messaggio"}</button>}
          {voice.available && <><button className="sec" disabled={voice.listening || voice.processing} aria-pressed={voice.enabled} onClick={voice.toggle}>{voice.enabled ? "Voce attiva" : "Attiva risposte vocali"}</button><button className="sec" onClick={voice.stop}>Ferma voce</button></>}
          {voice.selectedVoice.startsWith("ai:") && voice.cloud.enabled && <button className="sec" disabled={voice.listening || voice.processing} onClick={voice.resume}>Riprendi audio</button>}
          <span role="status">{voice.status}</span>
        </div>
        {voice.available && <details className="voice-settings">
          <summary>Scegli voce</summary>
          <div className="voice-choice">
            <label>Voce per le risposte<select value={voice.selectedVoice} disabled={busy || voice.listening || voice.processing} onChange={e => voice.selectVoice(e.target.value)}>
              <option value="">Automatica · italiano</option>
              {voice.selectedVoice && !voice.selectedVoice.startsWith("ai:") && !voice.voices.some(v => v.voiceURI === voice.selectedVoice) && <option value={voice.selectedVoice} disabled>Voce salvata non disponibile · uso automatica</option>}
              <optgroup label="Voci AI · OpenAI" disabled={!voice.cloud.enabled}>{voice.aiVoices.map(v => <option key={v} value={`ai:${v}`}>{v.charAt(0).toUpperCase() + v.slice(1)} · AI{voice.cloud.enabled ? "" : " · da attivare"}</option>)}</optgroup>
              <optgroup label="Voci del dispositivo">{voice.voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang} · {v.localService ? "sul dispositivo" : "online"}</option>)}</optgroup>
            </select></label>
            <button type="button" className="sec" disabled={busy || voice.listening || voice.processing || (voice.selectedVoice.startsWith("ai:") && !voice.cloud.enabled)} onClick={voice.preview}>Ascolta anteprima</button>
          </div>
          <p>{voice.cloud.reason} {!voice.cloud.enabled && <a href="/setup#voce">Configura Audio AI</a>}</p>
          {voice.voices.filter(v => v.lang.startsWith("it")).length <= 1 && <p>Questo browser offre al massimo una voce italiana: altre voci del telefono potrebbero non essere esposte a Safari. I timbri AI sono indipendenti da questa lista.</p>}
          {voice.cloud.enabled && voice.recordingSupported && <div className="voice-choice"><label>Metodo di dettatura<select disabled={busy || voice.listening || voice.processing} value={voice.inputMode} onChange={e => voice.setInputMode(e.target.value)}><option value="recording">Registra e trascrivi · OpenAI</option><option value="browser" disabled={!voice.nativeMicrophone}>Dettatura del browser · testo in diretta</option></select></label></div>}
          <p>La scelta viene ricordata in questo browser e vale anche per «Ascolta». Le voci disponibili dipendono dal dispositivo; quelle online possono usare un servizio remoto.</p>
          {!voice.voices.length && <p>Il browser non ha ancora fornito l’elenco delle voci. Puoi provare la voce automatica.</p>}
        </details>}
        <textarea rows={inline ? 2 : undefined} disabled={disabled || voice.listening || voice.processing} value={text} onChange={(e) => setText(e.target.value)} placeholder={disabled ? "Collega Claude e Turso nelle Impostazioni" : inline ? "Di cosa ci occupiamo? Scrivi o parla…" : "Scrivi o detta…"} aria-label="Messaggio"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
        <button onClick={send} disabled={busy || disabled || voice.listening || voice.processing || preparing}>Invia</button>
        <small className="voice-help">{voice.processing ? "Trascrizione in corso…" : voice.inputMode === "recording" && voice.cloud.enabled ? "Registra, premi Termina e controlla il testo. L’audio viene inviato a OpenAI per la trascrizione." : voice.microphone ? "Controlla il testo dettato prima di inviare. La dettatura usa i servizi del browser; su iPhone puoi anche usare il microfono della tastiera." : "Dettatura non disponibile: usa HTTPS e consenti il microfono, oppure usa il microfono della tastiera."} {dictated && "Per approvare una modifica, invia il codice in un nuovo messaggio scritto."}</small>
        <AttachmentPicker files={files} onChange={setFiles} disabled={disabled || busy} onProcessing={setPreparing} />
      </div>
    </div>
  );
}
