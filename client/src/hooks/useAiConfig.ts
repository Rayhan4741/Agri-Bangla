import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_AI_CONFIG, getSessionKey, setSessionKey, type AiConfig } from '@/lib/aiProvider';
import { STORE_KEYS, useStored } from './useStored';

const keyListeners = new Set<() => void>();
const subscribeKey = (cb: () => void) => {
  keyListeners.add(cb);
  return () => keyListeners.delete(cb);
};
const hasKeySnapshot = () => !!getSessionKey();

/** Non-secret AI settings persist in LocalStorage; the API key stays in sessionStorage only. */
export function useAiConfig() {
  const [cfg, setCfg] = useStored<AiConfig>(STORE_KEYS.ai, DEFAULT_AI_CONFIG);
  const hasKey = useSyncExternalStore(subscribeKey, hasKeySnapshot, () => false);
  const config = { ...DEFAULT_AI_CONFIG, ...cfg };
  const update = useCallback((patch: Partial<AiConfig>) => setCfg((c) => ({ ...DEFAULT_AI_CONFIG, ...c, ...patch })), [setCfg]);
  const saveKey = useCallback((k: string) => {
    setSessionKey(k.trim());
    keyListeners.forEach((l) => l());
  }, []);
  const ready = config.enabled && hasKey && !!config.model.trim();
  return { config, update, hasKey, saveKey, ready };
}
