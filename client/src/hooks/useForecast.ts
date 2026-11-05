import { useCallback, useEffect, useState } from 'react';
import { fetchForecast, type Forecast } from '@/lib/weather';
import { getDistrict } from '@/lib/geo';
import { usePrefs } from './useStored';
import { useServer } from '@/context/ServerContext';

export type ForecastStatus = 'off' | 'no-district' | 'loading' | 'ok' | 'error' | 'offline';

export function useForecast(districtIdOverride?: string) {
  const [prefs] = usePrefs();
  const server = useServer();
  const viaServer = server.status === 'online';
  const districtId = districtIdOverride ?? prefs.districtId;
  const [state, setState] = useState<{ status: ForecastStatus; data: Forecast | null; error?: string }>({ status: 'off', data: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!prefs.liveWeather) {
      setState({ status: 'off', data: null });
      return;
    }
    const d = getDistrict(districtId);
    if (!d) {
      setState({ status: 'no-district', data: null });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ status: 'loading', data: s.data }));
    fetchForecast(d.lat, d.lon, ctrl.signal, viaServer)
      .then((data) => setState({ status: 'ok', data }))
      .catch((e: Error) => {
        if (ctrl.signal.aborted) return;
        setState({ status: e.message === 'offline' ? 'offline' : 'error', data: null, error: e.message });
      });
    return () => ctrl.abort();
  }, [prefs.liveWeather, districtId, nonce, viaServer]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry, districtId };
}
