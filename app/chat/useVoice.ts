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
  const [nativePlayback, setNativePlayback] = useState(false);
  const [enabled, setEnabled] = useState(false), [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const [dictationStatus, setDictationStatus] = useState(""), [dictationFailed, setDictationFailed] = useState(false);
  const [appleMobile, setAppleMobile] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [cloud, setCloud] = useState({ enabled: false, reason: "Verifico la configurazione delle voci AI…" });
  const cloudReady = useRef(false), cloudSpeaker = useRef<CloudSpeaker | null>(null);
  const [inputMode, setInputMode] = useState("browser");
  const inputChosen = useRef(false);
  const recording = useRecording();
  const preferredVoice = useRef("");
  const recognition = useRef<BrowserDictation | null>(null), buffer = useRef(""), active = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    setAppleMobile(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setAvailable("speechSynthesis" in window);
    setNativePlayback("speechSynthesis" in window);
    const w = window as VoiceWindow;
    setMicrophone(window.isSecureContext && !!(w.SpeechRecognition || w.webkitSpeechRecognition));
    cloudSpeaker.current = new CloudSpeaker(message => { if (mounted.current) setStatus(message); });
    const request = new AbortController();
    void fetch("/api/audio", { signal: request.signal }).then(r => r.json()).then((data: { enabled?: boolean; reason?: string }) => {
      if (!mounted.current) return;
      cloudReady.current = data.enabled === true;
      setCloud({ enabled: data.enabled === true, reason: data.reason || "Audio AI non disponibile." });
      setAvailable(!!window.speechSynthesis || data.enabled === true);
      if (!inputChosen.current && data.enabled && window.isSecureContext && typeof MediaRecorder !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function" && RECORDING_MIMES.some(m => MediaRecorder.isTypeSupported(m))) setInputMode("recording");
    }).catch(() => { if (mounted.current && !request.signal.aborted) setCloud({ enabled: false, reason: "Configurazione audio non raggiungibile. Ricarica la pagina per riprovare." }); });
    try {
      preferredVoice.current = localStorage.getItem(VOICE_STORAGE) || ""; setSelectedVoice(preferredVoice.current);
      setEnabled(localStorage.getItem("eyra.voice.enabled") === "true");
      const input = localStorage.getItem("eyra.voice.input");
      if (input === "browser" || input === "recording") { inputChosen.current = true; setInputMode(input); }
    } catch { /* Storage may be unavailable in private browsing. */ }
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
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
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
    inputChosen.current = true;
    if (inputMode === "recording" && cloudReady.current && recording.supported) {
      stop(); setStatus(""); setDictationStatus(""); setDictationFailed(false); void recording.toggle(current, update); return;
    }
    recording.clearStatus();
    if (listening) { recognition.current?.stop(); return; }
    stop();
    const w = window as VoiceWindow, Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) { setDictationFailed(true); setDictationStatus("Riconoscimento non disponibile. Usa il microfono della tastiera."); return; }
    recognition.current?.dispose();
    recognition.current = new BrowserDictation(() => new Constructor(), update, (on, message, failed) => { if (mounted.current) { setListening(on); setDictationStatus(message); setDictationFailed(!!failed); } });
    recognition.current.start(current);
  }
  function selectVoice(uri: string) {
    stop(); recording.clearStatus(); setDictationStatus(""); preferredVoice.current = uri; setSelectedVoice(uri); setStatus("");
    try { if (uri) localStorage.setItem(VOICE_STORAGE, uri); else localStorage.removeItem(VOICE_STORAGE); }
    catch { setStatus("Voce scelta per questa sessione. Il browser non consente di salvare la preferenza."); }
  }
  function preview() {
    if (recording.recording || recording.processing) return;
    // A stalled native dictation must not leave the preview permanently disabled.
    recognition.current?.dispose(); setListening(false); setDictationFailed(false); setDictationStatus("");
    stop(); recording.clearStatus(); unlock();
    speak("Ciao! Questa è la mia voce. Possiamo organizzare la giornata e leggere insieme i tuoi documenti.");
  }
  return {
    available, nativePlayback, microphone: microphone || (cloud.enabled && recording.supported), nativeMicrophone: microphone, recordingSupported: recording.supported,
    previewBlocked: recording.processing ? "Attendi la trascrizione prima di ascoltare l’anteprima." : recording.recording ? "Premi Termina per completare la registrazione prima di ascoltare l’anteprima." : "",
    nativeListening: listening,
    enabled, listening: listening || recording.recording, processing: recording.processing, status: recording.status || dictationStatus || status, dictate, push, voices, selectedVoice, cloud, aiVoices: AI_VOICES, inputMode, appleMobile, dictationFailed,
    useKeyboard() { inputChosen.current = true; recognition.current?.dispose(); recording.cancel(); stop(); setListening(false); setDictationFailed(false); setDictationStatus("Tocca il microfono della tastiera iPhone per dettare. Se manca: Impostazioni iPhone → Generali → Tastiera → Abilita dettatura."); },
    record(current: string, update: (text: string) => void) { if (!cloudReady.current || !recording.supported || recording.processing) return; inputChosen.current = true; recognition.current?.dispose(); setListening(false); stop(); setInputMode("recording"); setDictationFailed(false); setDictationStatus(""); void recording.toggle(current, update); },
    setInputMode(mode: string) { if (listening || recording.recording || recording.processing) return; inputChosen.current = true; setInputMode(mode); recording.clearStatus(); setDictationStatus(""); setDictationFailed(false); setStatus(""); try { localStorage.setItem("eyra.voice.input", mode); } catch { /* session only */ } },
    selectVoice, preview,
    previewDevice() { if (recording.recording || recording.processing) return; selectVoice(""); preview(); },
    toggle() { stop(); recording.clearStatus(); unlock(); setEnabled(!enabled); setStatus(""); try { localStorage.setItem("eyra.voice.enabled", String(!enabled)); } catch { /* session only */ } if (!enabled) speak("Voce attiva."); },
    begin() { stop(); recording.clearStatus(); setDictationStatus(""); unlock(); active.current = enabled; },
    reset() { buffer.current = ""; },
    stop() { stop(); recording.clearStatus(); setStatus(""); },
    resume() { cloudSpeaker.current?.unlock(); },
    replay(text: string) { stop(); recording.clearStatus(); unlock(); for (let rest = text; rest;) { const chunk = speechChunk(rest, true); speak(chunk.text); rest = chunk.rest; } },
  };
}
