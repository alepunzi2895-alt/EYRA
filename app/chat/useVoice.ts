"use client";
import { useEffect, useRef, useState } from "react";
import { speechChunk, spokenText } from "@/lib/speech-text";

type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type VoiceWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const VOICE_STORAGE = "eyra.voice.uri";

export function useVoice() {
  const [available, setAvailable] = useState(false), [microphone, setMicrophone] = useState(false);
  const [enabled, setEnabled] = useState(false), [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const preferredVoice = useRef("");
  const recognition = useRef<Recognition | null>(null), buffer = useRef(""), active = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    setAvailable("speechSynthesis" in window);
    const w = window as VoiceWindow;
    setMicrophone(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    try { preferredVoice.current = localStorage.getItem(VOICE_STORAGE) || ""; setSelectedVoice(preferredVoice.current); } catch { /* Storage may be unavailable in private browsing. */ }
    const synth = window.speechSynthesis;
    const refreshVoices = () => setVoices(synth.getVoices().slice().sort((a, b) => Number(b.lang.startsWith("it")) - Number(a.lang.startsWith("it")) || a.name.localeCompare(b.name, "it")));
    if (synth) { refreshVoices(); synth.addEventListener("voiceschanged", refreshVoices); }
    return () => { mounted.current = false; active.current = false; recognition.current?.abort(); synth?.removeEventListener("voiceschanged", refreshVoices); synth?.cancel(); };
  }, []);
  function stop() { active.current = false; buffer.current = ""; window.speechSynthesis?.cancel(); }
  function speak(text: string) {
    const clean = spokenText(text);
    if (!clean || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "it-IT";
    const allVoices = window.speechSynthesis.getVoices();
    const italian = allVoices.filter(v => v.lang.startsWith("it"));
    utterance.voice = allVoices.find(v => v.voiceURI === preferredVoice.current) || italian.find(v => v.localService) || italian[0] || null;
    if (utterance.voice) utterance.lang = utterance.voice.lang;
    utterance.onstart = () => { if (mounted.current) setStatus("Voce in riproduzione"); };
    utterance.onend = () => { if (mounted.current && !window.speechSynthesis.pending) setStatus(""); };
    utterance.onerror = e => { if (mounted.current && !["interrupted", "canceled"].includes(e.error)) setStatus("Riproduzione non disponibile: usa Ascolta o continua con il testo."); };
    window.speechSynthesis.speak(utterance);
  }
  function push(text: string, flush = false) {
    if (!active.current) return;
    buffer.current += text;
    while (buffer.current) {
      const chunk = speechChunk(buffer.current, flush);
      if (chunk.rest === buffer.current) break;
      buffer.current = chunk.rest;
      speak(chunk.text);
    }
  }
  function dictate(current: string, update: (text: string) => void) {
    if (listening) { recognition.current?.stop(); return; }
    stop();
    const w = window as VoiceWindow, Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) return;
    const r = new Constructor(); recognition.current = r;
    r.lang = "it-IT"; r.interimResults = true; r.continuous = false;
    r.onresult = event => update(`${current.trim()} ${Array.from(event.results).map(result => result[0].transcript).join(" ")}`.trim());
    r.onerror = event => { if (mounted.current) setStatus(event.error === "not-allowed" ? "Consenti il microfono nelle impostazioni del browser." : "Dettatura interrotta. Puoi riprovare o scrivere il messaggio."); };
    r.onend = () => { if (mounted.current) setListening(false); };
    try { r.start(); setListening(true); setStatus(""); }
    catch { setStatus("Microfono non disponibile. Riprova."); }
  }
  return {
    available, microphone, enabled, listening, status, dictate, push, voices, selectedVoice,
    selectVoice(uri: string) {
      stop(); preferredVoice.current = uri; setSelectedVoice(uri); setStatus("");
      try { if (uri) localStorage.setItem(VOICE_STORAGE, uri); else localStorage.removeItem(VOICE_STORAGE); }
      catch { setStatus("Voce scelta per questa sessione. Il browser non consente di salvare la preferenza."); }
    },
    preview() { stop(); speak("Ciao! Questa è la mia voce. Possiamo organizzare la giornata e leggere insieme i tuoi documenti."); },
    toggle() { stop(); setEnabled(!enabled); setStatus(""); if (!enabled) speak("Voce attiva."); },
    begin() { stop(); active.current = enabled; },
    reset() { buffer.current = ""; },
    stop() { stop(); setStatus(""); },
    replay(text: string) { stop(); speak(text); },
  };
}
