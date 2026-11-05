import { useEffect, useState } from 'react';
import { usePrefs } from './useStored';

export type HeroReason = 'ok' | 'no-webgl' | 'reduced-motion' | 'slow-network' | 'small-screen' | 'user-off' | 'error';

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

/** Decides whether the 3D hero should load, and at what quality. */
export function useHeroMode() {
  const [prefs, update] = usePrefs();
  const [state, setState] = useState<{ reason: HeroReason; canWebGL: boolean; quality: number }>({
    reason: 'small-screen',
    canWebGL: true,
    quality: 1,
  });

  useEffect(() => {
    const canWebGL = hasWebGL();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const conn = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    const slow = !!conn && (conn.saveData === true || ['slow-2g', '2g', '3g'].includes(conn.effectiveType ?? ''));
    const small = window.innerWidth < 768;
    const cores = navigator.hardwareConcurrency ?? 4;
    let quality = small ? 0.45 : cores <= 4 ? 0.65 : 1;
    // developer override for testing on slow/software GPUs: localStorage "agribangla:debugQuality" = 0.1–1
    try {
      const dq = Number(localStorage.getItem('agribangla:debugQuality'));
      if (dq > 0 && dq <= 1) quality = dq;
    } catch {
      /* storage unavailable */
    }

    let reason: HeroReason = 'ok';
    if (!canWebGL) reason = 'no-webgl';
    else if (prefs.hero3d === 'off') reason = 'user-off';
    else if (prefs.hero3d === 'on') reason = 'ok';
    else if (reduced) reason = 'reduced-motion';
    else if (slow) reason = 'slow-network';
    else if (small) reason = 'small-screen';
    setState({ reason, canWebGL, quality });
  }, [prefs.hero3d]);

  return {
    ...state,
    show3d: state.reason === 'ok',
    enable3d: () => update({ hero3d: 'on' }),
    disable3d: () => update({ hero3d: 'off' }),
    markError: () => setState((s) => ({ ...s, reason: 'error' })),
  };
}

export const HERO_REASON_BN: Record<HeroReason, string> = {
  ok: '',
  'no-webgl': 'এই ডিভাইসে ৩ডি গ্রাফিক্স (WebGL) চালু নেই, তাই স্থির ছবি দেখানো হচ্ছে।',
  'reduced-motion': 'আপনার ডিভাইসে "কম অ্যানিমেশন" চালু আছে, তাই স্থির ছবি দেখানো হচ্ছে।',
  'slow-network': 'ধীর ইন্টারনেট বা ডাটা-সেভার চালু থাকায় স্থির ছবি দেখানো হচ্ছে।',
  'small-screen': 'মোবাইলে ডাটা ও ব্যাটারি বাঁচাতে স্থির ছবি দেখানো হচ্ছে।',
  'user-off': 'আপনি ৩ডি দৃশ্য বন্ধ রেখেছেন।',
  error: '৩ডি দৃশ্য লোড করা যায়নি, তাই স্থির ছবি দেখানো হচ্ছে।',
};
