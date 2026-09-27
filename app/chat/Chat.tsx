"use client";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";
import { useVoice } from "./useVoice";
import AttachmentPicker from "./AttachmentPicker";
import Icon from "@/app/components/Icon";

type M = { role: "user" | "assistant"; text: string };
const link = (t: string) => t.replace(/\[\[([^\]|#]+)\]\]/g, (_, id) => `[${id}](/f/${encodeURIComponent(id)})`);

export default function Chat({ initial, disabled = false, conversationId = "web", inline = false }: { initial: M[]; disabled?: boolean; conversationId?: string; inline?: boolean }) {
  const [msgs, setMsgs] = useState<M[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dictated, setDictated] = useState(false);
  const voice = useVoice();
  const router = useRouter();
  const sending = useRef(false);
  const [files, setFiles] = useState<File[]>([]), [preparing, setPreparing] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!inline || !messageInput.current) return;
    messageInput.current.style.height = "44px";
    messageInput.current.style.height = `${Math.min(140, Math.max(44, messageInput.current.scrollHeight))}px`;
  }, [text, inline]);
  useEffect(() => {
    if (!msgs.length) return;
    if (inline && end.current?.parentElement) end.current.parentElement.scrollTop = end.current.parentElement.scrollHeight;
    else end.current?.scrollIntoView({ block: "end" });
  }, [msgs, busy, inline]);

  async function send() {
    if (disabled || sending.current || voice.listening || voice.processing || preparing) return;
    setCollapsed(false);
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
      <div className="flusso" aria-live="polite" hidden={inline && (!msgs.length || collapsed)}>
        {!inline && msgs.length === 0 && <p className="vuoto">Chiedi scadenze, incolla un'email del commercialista, allega PDF o Excel. Le modifiche all'archivio arrivano in «Da approvare».</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role === "user" ? "io" : "agente"}`}>
            {m.role === "user" ? m.text : <><ReactMarkdown remarkPlugins={[remarkGfm]}>{link(m.text)}</ReactMarkdown>{m.text && voice.available && (!busy || i < msgs.length - 1) && <button className="sec listen-message" disabled={voice.listening || voice.processing} onClick={() => voice.replay(m.text)}>Ascolta</button>}</>}
          </div>
        ))}
        {busy && <div className="msg agente">Sto lavorando…</div>}
        <div ref={end} />
      </div>
      {inline && !!msgs.length && <button className="conversation-toggle" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? "Mostra conversazione" : "Nascondi conversazione"}</button>}
      <div className={`composer${inline ? " composer-minimal" : ""}`}>
        {inline ? <div className="prompt-tools">
          <AttachmentPicker compact files={files} onChange={setFiles} disabled={disabled || busy} onProcessing={setPreparing} />
          {voice.microphone && <button type="button" className="icon-button" title={voice.listening ? "Termina dettatura" : "Detta messaggio"} aria-label={voice.listening ? "Termina dettatura" : "Detta messaggio"} aria-pressed={voice.listening} disabled={disabled || busy || voice.processing} onClick={() => voice.dictate(text, value => { setText(value); setDictated(true); })}><Icon name={voice.listening ? "stop" : "mic"} /></button>}
          {voice.appleMobile && <button type="button" className="icon-button" title="Microfono della tastiera iPhone" aria-label="Usa microfono tastiera iPhone" disabled={disabled || busy || voice.processing} onClick={() => { flushSync(() => { voice.useKeyboard(); setDictated(true); }); messageInput.current?.focus(); }}><Icon name="keyboard" /></button>}
          {voice.available && (voice.enabled || voice.status.includes("Voce") || voice.status.includes("voce")) && <button type="button" className="icon-button" title="Ferma voce" aria-label="Ferma voce" onClick={voice.stop}><Icon name="stop" /></button>}
          {voice.status.includes("Riprendi audio") && <button type="button" className="icon-button" title="Riprendi audio" aria-label="Riprendi audio" onClick={voice.resume}><Icon name="sound" /></button>}
          <a className="icon-button" href="/chat" title="Cronologia conversazioni" aria-label="Cronologia conversazioni"><Icon name="history" /></a>
        </div> : <>
        <div className="voice-controls">
          {voice.microphone && <button className="sec" disabled={disabled || busy || voice.processing} aria-pressed={voice.listening} onClick={() => voice.dictate(text, value => { setText(value); setDictated(true); })}>{voice.listening ? "Termina" : voice.inputMode === "recording" && voice.cloud.enabled ? "Registra messaggio" : "Detta messaggio"}</button>}
          {voice.appleMobile && <button type="button" className="sec" disabled={disabled || busy || voice.processing} onClick={() => {
            // Focus must stay in the tap handler to open the iPhone keyboard.
            flushSync(() => { voice.useKeyboard(); setDictated(true); });
            messageInput.current?.focus();
          }}>Usa microfono tastiera</button>}
          {voice.dictationFailed && voice.cloud.enabled && voice.recordingSupported && <button type="button" className="sec" disabled={disabled || busy || voice.processing} onClick={() => voice.record(text, value => { setText(value); setDictated(true); })}>Registra e trascrivi</button>}
          {voice.available && <><button className="sec" disabled={voice.listening || voice.processing} aria-pressed={voice.enabled} onClick={voice.toggle}>{voice.enabled ? "Voce attiva" : "Attiva risposte vocali"}</button><button className="sec" onClick={voice.stop}>Ferma voce</button></>}
          {voice.selectedVoice.startsWith("ai:") && voice.cloud.enabled && <button className="sec" disabled={voice.listening || voice.processing} onClick={voice.resume}>Riprendi audio</button>}
          <span role="status">{voice.status}</span>
          {voice.dictationFailed && !voice.cloud.enabled && <span>La registrazione alternativa richiede Audio AI. <a href="/setup#voce">Configura in Impostazioni → Voce</a>. Su iPhone puoi usare subito il microfono della tastiera.</span>}
        </div>

          <a className="voice-config-link" href="/setup#voce">Impostazioni voce e dettatura ↗</a>
        </>}
        {inline && voice.status && <p className="prompt-status" role="status">{voice.status}</p>}
        {inline && voice.dictationFailed && voice.cloud.enabled && voice.recordingSupported && <button type="button" className="dictation-retry sec" disabled={disabled || busy || voice.processing} onClick={() => voice.record(text, value => { setText(value); setDictated(true); })}>Registra e trascrivi</button>}
        <textarea ref={messageInput} rows={inline ? 1 : undefined} disabled={disabled || voice.listening || voice.processing} value={text} onChange={(e) => setText(e.target.value)} placeholder={disabled ? "Configura la chat in Impostazioni" : inline ? "Scrivi o parla…" : "Scrivi o detta…"} aria-label="Messaggio"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
        <button className={inline ? "icon-button prompt-send" : undefined} title="Invia messaggio" aria-label="Invia messaggio" onClick={send} disabled={busy || disabled || voice.listening || voice.processing || preparing || (!text.trim() && !files.length)}>{inline ? <Icon name="send" /> : "Invia"}</button>
        {(!inline || dictated || voice.listening || voice.processing) && <small className="voice-help">{voice.processing ? "Trascrizione in corso…" : voice.inputMode === "recording" && voice.cloud.enabled ? "Registra, premi Termina e controlla il testo. L’audio viene inviato a OpenAI per la trascrizione." : voice.microphone ? "Controlla il testo dettato prima di inviare. La dettatura usa i servizi del browser; su iPhone puoi anche usare il microfono della tastiera." : "Dettatura non disponibile: usa HTTPS e consenti il microfono, oppure usa il microfono della tastiera."} {dictated && "Per approvare una modifica, invia il codice in un nuovo messaggio scritto."}</small>}
        {!inline && <AttachmentPicker files={files} onChange={setFiles} disabled={disabled || busy} onProcessing={setPreparing} />}
      </div>
    </div>
  );
}
