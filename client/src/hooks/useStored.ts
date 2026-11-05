import { useCallback, useSyncExternalStore } from 'react';
import { readJSON, subscribe, writeJSON } from '@/lib/localStorage';

const cache = new Map<string, { raw: unknown }>();

/**
 * LocalStorage-backed state shared across all components using the same key.
 */
export function useStored<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const getSnapshot = useCallback(() => {
    if (!cache.has(key)) cache.set(key, { raw: readJSON<T>(key, initial) });
    return cache.get(key)!.raw as T;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const sub = useCallback(
    (cb: () => void) =>
      subscribe(key, () => {
        cache.set(key, { raw: readJSON<T>(key, initial) });
        cb();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const value = useSyncExternalStore(sub, getSnapshot, getSnapshot);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = (cache.get(key)?.raw as T) ?? readJSON<T>(key, initial);
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      writeJSON(key, resolved);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, set];
}

/** Keys used across the app — the profile page exports/imports only these. */
export const STORE_KEYS = {
  prefs: 'prefs',
  myCrops: 'myCrops',
  tasks: 'tasks',
  favorites: 'favorites',
  expenses: 'expenses',
  chat: 'chatHistory',
  calendarDone: 'calendarDone',
  diary: 'diary',
  ai: 'aiConfig',
} as const;

export interface Prefs {
  language: 'bn' | 'en';
  districtId: string;
  upazilaId: string;
  simpleMode: boolean;
  liveWeather: boolean;
  saveChat: boolean;
  hero3d: 'auto' | 'on' | 'off';
}

export const DEFAULT_PREFS: Prefs = {
  language: 'bn',
  districtId: '',
  upazilaId: '',
  simpleMode: false,
  liveWeather: false,
  saveChat: false,
  hero3d: 'auto',
};

export function usePrefs() {
  const [prefs, setPrefs] = useStored<Prefs>(STORE_KEYS.prefs, DEFAULT_PREFS);
  const merged = { ...DEFAULT_PREFS, ...prefs };
  const update = useCallback(
    (patch: Partial<Prefs>) => setPrefs((p) => ({ ...DEFAULT_PREFS, ...p, ...patch })),
    [setPrefs],
  );
  return [merged, update] as const;
}
