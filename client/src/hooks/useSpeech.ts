import { useCallback, useEffect, useRef, useState } from 'react';
import { getBanglaVoice, getRecognitionCtor, speakBangla, stopSpeaking } from '@/lib/speech';

export function useReadAloud() {
  const [available, setAvailable] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const check = () => setAvailable(!!getBanglaVoice());
    check();
    window.speechSynthesis.addEventListener?.('voiceschanged', check);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', check);
  }, []);

  useEffect(() => () => stopSpeaking(), []);

  const speak = useCallback((text: string) => {
    const ok = speakBangla(text, () => setSpeaking(false));
    setSpeaking(ok);
  }, []);
  const stop = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
  }, []);
  return { available, speaking, speak, stop };
}

export function useVoiceInput(onResult: (text: string) => void) {
  const Ctor = getRecognitionCtor();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);
  const cb = useRef(onResult);
  cb.current = onResult;

  const start = useCallback(() => {
    if (!Ctor) return;
    setError(null);
    const rec = new Ctor();
    rec.lang = 'bn-BD';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript ?? '';
      if (text) cb.current(text);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      const map: Record<string, string> = {
        'not-allowed': 'মাইক্রোফোন ব্যবহারের অনুমতি দেওয়া হয়নি।',
        'no-speech': 'কোনো কথা শোনা যায়নি, আবার চেষ্টা করুন।',
        network: 'ভয়েস ইনপুটের জন্য ইন্টারনেট সংযোগ প্রয়োজন।',
      };
      setError(map[e.error] ?? 'ভয়েস ইনপুট কাজ করেনি।');
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [Ctor]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  return { supported: !!Ctor, listening, error, start, stop };
}
