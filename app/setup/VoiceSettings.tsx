"use client";
import { useVoice } from "@/app/chat/useVoice";

export default function VoiceSettings() {
 const voice = useVoice(); const busy = false;
 return <div className="voice-preferences"><button type="button" className="sec" aria-pressed={voice.enabled} onClick={voice.toggle}>{voice.enabled ? "Risposte vocali attive" : "Attiva risposte vocali"}</button>
        {voice.available && <details className="voice-settings" open>
          <summary>Scegli voce</summary>
          <div className="voice-choice">
            <label>Voce per le risposte<select value={voice.selectedVoice} disabled={busy || voice.listening || voice.processing} onChange={e => voice.selectVoice(e.target.value)}>
              <option value="">Automatica · italiano</option>
              {voice.selectedVoice && !voice.selectedVoice.startsWith("ai:") && !voice.voices.some(v => v.voiceURI === voice.selectedVoice) && <option value={voice.selectedVoice} disabled>Voce salvata non disponibile · uso automatica</option>}
              <optgroup label="Voci AI · OpenAI" disabled={!voice.cloud.enabled}>{voice.aiVoices.map(v => <option key={v} value={`ai:${v}`}>{v.charAt(0).toUpperCase() + v.slice(1)} · AI{voice.cloud.enabled ? "" : " · da attivare"}</option>)}</optgroup>
              <optgroup label="Voci del dispositivo">{voice.voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang} · {v.localService ? "sul dispositivo" : "online"}</option>)}</optgroup>
            </select></label>
            {voice.selectedVoice.startsWith("ai:") && !voice.cloud.enabled ? <>
              <a className="btn sec" href="/setup#voce">Attiva questa voce AI</a>
              {voice.nativePlayback && <button type="button" className="sec" disabled={!!voice.previewBlocked} onClick={voice.previewDevice}>Prova la voce del dispositivo</button>}
            </> : <button type="button" className="sec" disabled={!!voice.previewBlocked} onClick={voice.preview}>{voice.nativeListening ? "Termina dettatura e ascolta" : "Ascolta anteprima"}</button>}
          </div>
          <p role="status">{voice.previewBlocked || voice.status}</p>
          <p>{voice.cloud.reason} {!voice.cloud.enabled && <a href="/setup#voce">Configura Audio AI</a>}</p>
          {voice.voices.filter(v => v.lang.startsWith("it")).length <= 1 && <p>Questo browser offre al massimo una voce italiana: altre voci del telefono potrebbero non essere esposte a Safari. I timbri AI sono indipendenti da questa lista.</p>}
          {voice.cloud.enabled && voice.recordingSupported && <div className="voice-choice"><label>Metodo di dettatura<select disabled={busy || voice.listening || voice.processing} value={voice.inputMode} onChange={e => voice.setInputMode(e.target.value)}><option value="recording">Registra e trascrivi · OpenAI</option><option value="browser" disabled={!voice.nativeMicrophone}>Dettatura del browser · testo in diretta</option></select></label></div>}
          <p>La scelta viene ricordata in questo browser e vale anche per «Ascolta». Le voci disponibili dipendono dal dispositivo; quelle online possono usare un servizio remoto.</p>
          {!voice.voices.length && <p>Il browser non ha ancora fornito l’elenco delle voci. Puoi provare la voce automatica.</p>}
        </details>}

</div>;
}
