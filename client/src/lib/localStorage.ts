/**
 * Safe LocalStorage helpers. Everything AgriBangla stores lives under the
 * `agribangla:` prefix so it can be exported or reset in one go.
 * Never store passwords, payment details or sensitive personal records here.
 */
export const PREFIX = 'agribangla:';

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = `${PREFIX}__probe`;
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isStorageAvailable(): boolean {
  return storage() !== null;
}

const memoryFallback = new Map<string, string>();

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = storage()?.getItem(PREFIX + key) ?? memoryFallback.get(PREFIX + key) ?? null;
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  const raw = JSON.stringify(value);
  try {
    const s = storage();
    if (s) s.setItem(PREFIX + key, raw);
    else memoryFallback.set(PREFIX + key, raw);
  } catch {
    memoryFallback.set(PREFIX + key, raw);
  }
  listeners.get(key)?.forEach((l) => l());
}

export function removeKey(key: string): void {
  try {
    storage()?.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
  memoryFallback.delete(PREFIX + key);
  listeners.get(key)?.forEach((l) => l());
}

export function subscribe(key: string, listener: Listener): () => void {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(listener);
  return () => listeners.get(key)?.delete(listener);
}

/** All AgriBangla keys currently stored (without prefix). */
export function listKeys(): string[] {
  const keys = new Set<string>();
  const s = storage();
  if (s) {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(PREFIX) && !k.endsWith('__probe')) keys.add(k.slice(PREFIX.length));
    }
  }
  memoryFallback.forEach((_, k) => keys.add(k.slice(PREFIX.length)));
  return [...keys];
}

export function exportAll(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of listKeys()) out[k] = readJSON(k, null);
  return out;
}

export function resetAll(): void {
  for (const k of listKeys()) removeKey(k);
}

/** Import a previously exported object (only known AgriBangla keys are accepted). */
export function importAll(data: Record<string, unknown>, allowedKeys: string[]): number {
  let n = 0;
  for (const [k, v] of Object.entries(data)) {
    if (allowedKeys.includes(k)) {
      writeJSON(k, v);
      n++;
    }
  }
  return n;
}
