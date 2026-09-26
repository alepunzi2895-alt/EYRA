"use client";
import { useEffect, useRef, useState } from "react";
import { AUDIO_MAX_BYTES, RECORDING_MIMES } from "@/lib/audio-catalog";
export function useRecording() {
  const [supported, setSupported] = useState(false), [recording, setRecording] = useState(false), [processing, setProcessing] = useState(false), [status, setStatus] = useState("");
  const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), request = useRef<AbortController | null>(null);
  const generation = useRef(0), running = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function cleanup() { clearTimeout(timer.current); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; }
  function cancel() { generation.current++; running.current = false; request.current?.abort(); if (recorder.current?.state === "recording") recorder.current.stop(); cleanup(); }
  useEffect(() => {
    setSupported(window.isSecureContext && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined" && RECORDING_MIMES.some(m => MediaRecorder.isTypeSupported(m)));
    return cancel;
  }, []);
  async function toggle(initial: string, update: (text: string) => void) {
    if (running.current) {
      if (recorder.current?.state === "recording") recorder.current.stop();
      else { cancel(); setRecording(false); setProcessing(false); setStatus("Registrazione annullata."); }
      return;
    }
    const id = ++generation.current;
    running.current = true; setRecording(true); setStatus("Consenti l’accesso al microfono…");
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (id !== generation.current) { input.getTracks().forEach(t => t.stop()); return; }
      stream.current = input;
      const mime = RECORDING_MIMES.find(m => MediaRecorder.isTypeSupported(m));
      if (!mime) throw new Error("Formato di registrazione non disponibile in questo browser.");
      const r = new MediaRecorder(input, { mimeType: mime, audioBitsPerSecond: 96000 });
      recorder.current = r; const chunks: Blob[] = []; let size = 0, failed = false;
      r.ondataavailable = e => { size += e.data.size; if (size > AUDIO_MAX_BYTES) { failed = true; if (r.state === "recording") r.stop(); } else if (e.data.size) chunks.push(e.data); };
      r.onerror = () => { if (id !== generation.current) return; failed = true; setStatus("Registrazione interrotta. Riprova."); if (r.state === "recording") r.stop(); else { cleanup(); running.current = false; setRecording(false); } };
      r.onstop = async () => {
        if (id !== generation.current) { input.getTracks().forEach(t => t.stop()); return; }
        cleanup(); running.current = false;
        setRecording(false);
        if (failed || !size) { setStatus("Registrazione vuota, interrotta o oltre 4 MB. Riprova con un messaggio più breve."); return; }
        setProcessing(true); setStatus("Trascrivo la registrazione…");
        const controller = new AbortController(); request.current = controller;
        try {
          const form = new FormData(); form.set("file", new Blob(chunks, { type: r.mimeType || mime }), "registrazione");
          const response = await fetch("/api/audio/transcribe", { method: "POST", body: form, signal: controller.signal });
          const result = await response.json();
          if (!response.ok || typeof result.text !== "string") throw new Error(result.error || "Trascrizione non riuscita.");
          if (id === generation.current) { update([initial.trim(), result.text.trim()].filter(Boolean).join(" ")); setStatus("Trascrizione pronta. Controlla il testo prima di inviare."); }
        } catch(e) { if (id === generation.current) setStatus(e instanceof Error ? e.message : "Trascrizione non riuscita."); }
        finally { if (id === generation.current) setProcessing(false); }
      };
      input.getAudioTracks().forEach(t => t.addEventListener("ended", () => { if (r.state === "recording") r.stop(); }));
      r.start(1000); setStatus("Registrazione in corso. Premi Termina; massimo 90 secondi.");
      timer.current = setTimeout(() => { if (r.state === "recording") r.stop(); }, 90_000);
    } catch(e) {
      if (id !== generation.current) return;
      cleanup(); running.current = false;
      if (id === generation.current) { setRecording(false); setStatus(e instanceof DOMException && e.name === "NotAllowedError" ? "Consenti il microfono nelle impostazioni del sito in Safari." : "Impossibile avviare la registrazione. Verifica HTTPS e permesso microfono."); }
    }
  }
  return { supported, recording, processing, status, toggle, clearStatus() { setStatus(""); } };
}
