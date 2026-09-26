"use client";
import { useEffect, useRef, useState } from "react";
import { speechChunk, spokenText } from "@/lib/speech-text";
import { BrowserDictation, type Recognition } from "@/lib/browser-dictation";
import { CloudSpeaker } from "@/lib/cloud-speaker";
import { AI_VOICES, RECORDING_MIMES } from "@/lib/audio-catalog";
import { useRecording } from "./useRecording";

type VoiceWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const VOICE_STORAGE = "eyra.voice.uri";

export function useVoice() {
  const [available, setAvailable] = useState(false), [microphone, setMicrophone] = useState(false);
  const [enabled, setEnabled] = useState(false), [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [cloud, setCloud] = useState({ enabled: false, reason: "Verifico la configurazione delle voci AI…" });
  const cloudReady = useRef(false), cloudSpeaker = useRef<CloudSpeaker | null>(null);
  const [inputMode, setInputMode] = useState("browser");
  const recording = useRecording();
  const preferredVoice = useRef("");
  const recognition = useRef<BrowserDictation | null>(null), buffer = useRef(""), active = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    setAvailable("speechSynthesis" in window);
    const w = window as VoiceWindow;
    setMicrophone(window.isSecureContext && !!(w.SpeechRecognition || w.webkitSpeechRecognition));
    cloudSpeaker.current = new CloudSpeaker(message => { if (mounted.current) setStatus(message); });
    const request = new AbortController();
    void fetch("/api/audio", { signal: request.signal }).then(r => r.json()).then((data: { enabled?: boolean; reason?: string }) => {
      if (!mounted.current) return;
      cloudReady.current = data.enabled === true;
      setCloud({ enabled: data.enabled === true, reason: data.reason || "Audio AI non disponibile." });
      setAvailable(!!window.speechSynthesis || data.enabled === true);
      if (data.enabled && window.isSecureContext && typeof MediaRecorder !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function" && RECORDING_MIMES.some(m => MediaRecorder.isTypeSupported(m))) setInputMode("recording");
    }).catch(() => { if (mounted.current && !request.signal.aborted) setCloud({ enabled: false, reason: "Configurazione audio non raggiungibile. Ricarica la pagina per riprovare." }); });
    try { preferredVoice.current = localStorage.getItem(VOICE_STORAGE) || ""; setSelectedVoice(preferredVoice.current); } catch { /* Storage may be unavailable in private browsing. */ }
    const synth = window.speechSynthesis;
    const refreshVoices = () => setVoices(synth.getVoices().slice().sort((a, b) => Number(b.lang.startsWith("it")) - Number(a.lang.startsWith("it")) || a.name.localeCompare(b.name, "it")));
    if (synth) { refreshVoices(); synth.addEventListener("voiceschanged", refreshVoices); }
    const refresh = () => { if (synth) refreshVoices(); };
    window.addEventListener("focus", refresh);
    const retry = setTimeout(refresh, 1000);
    return () => { mounted.current = false; active.current = false; request.abort(); clearTimeout(retry); window.removeEventListener("focus", refresh); recognition.current?.dispose(); cloudSpeaker.current?.dispose(); synth?.removeEventListener("voiceschanged", refreshVoices); synth?.cancel(); };
  }, []);
  function stop() { active.current = false; buffer.current = ""; window.speechSynthesis?.cancel(); cloudSpeaker.current?.stop(); }
  function unlock() { if (preferredVoice.current.startsWith("ai:")) cloudSpeaker.current?.unlock(); }
  function speak(text: string) {
    const clean = spokenText(text);
    if (!clean) return;
    if (preferredVoice.current.startsWith("ai:")) {
      if (!cloudReady.current) { setStatus("Attiva Audio AI in Impostazioni → Voce per usare questo timbro."); return; }
      cloudSpeaker.current?.enqueue(clean, preferredVoice.current.slice(3)); return;
    }
    if (!("speechSynthesis" in window)) return;
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
      if (preferredVoice.current.startsWith("ai:") && !flush && buffer.current.length < 160) break;
      const chunk = speechChunk(buffer.current, flush);
      if (chunk.rest === buffer.current) break;
      buffer.current = chunk.rest;
      speak(chunk.text);
    }
  }
  function dictate(current: string, update: (text: string) => void) {
    if (recording.processing) return;
    if (inputMode === "recording" && cloudReady.current && recording.supported) {
      stop(); setStatus(""); void recording.toggle(current, update); return;
    }
    recording.clearStatus();
    if (listening) { recognition.current?.stop(); return; }
    stop();
    const w = window as VoiceWindow, Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) return;
    recognition.current?.dispose();
    recognition.current = new BrowserDictation(() => new Constructor(), update, (on, message) => { if (mounted.current) { setListening(on); setStatus(message); } });
    recognition.current.start(current);
  }
  return {
    available, microphone: microphone || (cloud.enabled && recording.supported), nativeMicrophone: microphone, recordingSupported: recording.supported,
    enabled, listening: listening || recording.recording, processing: recording.processing, status: recording.status || status, dictate, push, voices, selectedVoice, cloud, aiVoices: AI_VOICES, inputMode,
    setInputMode(mode: string) { if (listening || recording.recording || recording.processing) return; setInputMode(mode); recording.clearStatus(); setStatus(""); },
    selectVoice(uri: string) {
      stop(); recording.clearStatus(); preferredVoice.current = uri; setSelectedVoice(uri); setStatus("");
      try { if (uri) localStorage.setItem(VOICE_STORAGE, uri); else localStorage.removeItem(VOICE_STORAGE); }
      catch { setStatus("Voce scelta per questa sessione. Il browser non consente di salvare la preferenza."); }
    },
    preview() { stop(); recording.clearStatus(); unlock(); speak("Ciao! Questa è la mia voce. Possiamo organizzare la giornata e leggere insieme i tuoi documenti."); },
    toggle() { stop(); recording.clearStatus(); unlock(); setEnabled(!enabled); setStatus(""); if (!enabled) speak("Voce attiva."); },
    begin() { stop(); recording.clearStatus(); unlock(); active.current = enabled; },
    reset() { buffer.current = ""; },
    stop() { stop(); recording.clearStatus(); setStatus(""); },
    resume() { cloudSpeaker.current?.unlock(); },
    replay(text: string) { stop(); recording.clearStatus(); unlock(); for (let rest = text; rest;) { const chunk = speechChunk(rest, true); speak(chunk.text); rest = chunk.rest; } },
  };
}
