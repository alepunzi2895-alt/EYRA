export const AI_VOICES = ["marin", "cedar", "coral", "nova", "alloy", "ash", "ballad", "echo", "fable", "onyx", "sage", "shimmer", "verse"] as const;
export const isAiVoice = (value: string): value is typeof AI_VOICES[number] => AI_VOICES.some(v => v === value);
export const AUDIO_MAX_BYTES = 4_000_000;
export const RECORDING_MIMES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
export function recordingFormat(mime: string) {
  const base = mime.split(";")[0].toLowerCase();
  return base === "audio/mp4" ? "mp4" : base === "audio/webm" ? "webm" : null;
}
