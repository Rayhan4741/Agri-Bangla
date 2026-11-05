/**
 * Thin wrappers around the browser Web Speech API.
 * - Read-aloud needs a Bangla (bn-*) voice installed on the device; we hide the button otherwise.
 * - Voice input uses SpeechRecognition (mainly Chrome/Edge on Android & desktop). Chrome sends
 *   the audio to its own speech service, so it needs internet and is subject to the browser's privacy terms.
 */

export function getBanglaVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang?.toLowerCase().startsWith('bn')) ?? null;
}

export function speakBangla(text: string, onEnd?: () => void): boolean {
  const voice = getBanglaVoice();
  if (!voice) return false;
  window.speechSynthesis.cancel();
  // long texts are split so some engines don't cut off mid-way
  const chunks = text.match(/[^।!?\n]+[।!?\n]?/g) ?? [text];
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk.trim());
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.92;
    if (i === chunks.length - 1 && onEnd) u.onend = onEnd;
    window.speechSynthesis.speak(u);
  });
  return true;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function getRecognitionCtor(): (new () => any) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
