/**
 * Optional live weather via Open-Meteo (https://open-meteo.com) — a free, key-less,
 * browser-accessible API for non-commercial use. Nothing here is called unless the
 * user switches live weather on. If you deploy commercially, check Open-Meteo's terms.
 */
import type { SprayRule, WeatherRiskRule } from '@/types';

export const WEATHER_PROVIDER = {
  name: 'Open-Meteo',
  url: 'https://open-meteo.com/',
  endpoint: 'https://api.open-meteo.com/v1/forecast',
};

export interface DailyForecast {
  date: string; // YYYY-MM-DD
  tempMax: number;
  tempMin: number;
  precipSum: number;
  precipProbMax: number | null;
  windMax: number;
  humidityMean: number;
}

export interface HourlyPoint {
  time: string; // ISO local
  humidity: number;
  wind: number;
  precip: number;
}

export interface Forecast {
  provider: string;
  retrievedAt: Date;
  current: { temp: number; humidity: number; wind: number; precip: number; code: number; time: string } | null;
  daily: DailyForecast[];
  hourly: HourlyPoint[];
}

export function buildForecastUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: lat.toFixed(2),
    longitude: lon.toFixed(2),
    current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code',
    hourly: 'relative_humidity_2m,wind_speed_10m,precipitation',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max',
    timezone: 'Asia/Dhaka',
    forecast_days: '7',
  });
  return `${WEATHER_PROVIDER.endpoint}?${params.toString()}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseForecast(json: any, retrievedAt = new Date()): Forecast {
  if (!json || !json.daily || !Array.isArray(json.daily.time)) throw new Error('অপ্রত্যাশিত আবহাওয়া তথ্য');
  const hourly: HourlyPoint[] = (json.hourly?.time ?? []).map((t: string, i: number) => ({
    time: t,
    humidity: Number(json.hourly.relative_humidity_2m?.[i] ?? NaN),
    wind: Number(json.hourly.wind_speed_10m?.[i] ?? NaN),
    precip: Number(json.hourly.precipitation?.[i] ?? 0),
  }));
  const daily: DailyForecast[] = json.daily.time.map((date: string, i: number) => {
    const hs = hourly.filter((h) => h.time.startsWith(date) && Number.isFinite(h.humidity));
    const humidityMean = hs.length ? hs.reduce((s, h) => s + h.humidity, 0) / hs.length : NaN;
    return {
      date,
      tempMax: Number(json.daily.temperature_2m_max?.[i]),
      tempMin: Number(json.daily.temperature_2m_min?.[i]),
      precipSum: Number(json.daily.precipitation_sum?.[i] ?? 0),
      precipProbMax: json.daily.precipitation_probability_max?.[i] ?? null,
      windMax: Number(json.daily.wind_speed_10m_max?.[i]),
      humidityMean,
    };
  });
  const c = json.current;
  return {
    provider: WEATHER_PROVIDER.name,
    retrievedAt,
    current: c
      ? {
          temp: Number(c.temperature_2m),
          humidity: Number(c.relative_humidity_2m),
          wind: Number(c.wind_speed_10m),
          precip: Number(c.precipitation ?? 0),
          code: Number(c.weather_code ?? -1),
          time: String(c.time ?? ''),
        }
      : null,
    daily,
    hourly,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const cache = new Map<string, { at: number; data: Forecast }>();

/**
 * Prefers the AgriBangla server (cached Open-Meteo, one upstream call per district per hour);
 * falls back to calling Open-Meteo directly when the server is not reachable.
 */
export async function fetchForecast(lat: number, lon: number, signal?: AbortSignal, viaServer = false): Promise<Forecast> {
  const url = buildForecastUrl(lat, lon);
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < 20 * 60 * 1000) return hit.data;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('offline');
  if (viaServer) {
    try {
      const { api } = await import('./api');
      const r = await api<{ data: unknown; retrievedAt: string; provider: { name: string } }>(`/weather?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`, { signal });
      const data = parseForecast(r.data, new Date(r.retrievedAt));
      cache.set(url, { at: Date.now(), data });
      return data;
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      /* fall through to the direct call */
    }
  }
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = parseForecast(await res.json());
  cache.set(url, { at: Date.now(), data });
  return data;
}

export function weatherCodeBn(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'পরিষ্কার আকাশ', icon: 'sun' };
  if (code >= 1 && code <= 3) return { label: 'আংশিক মেঘলা', icon: 'cloud-sun' };
  if (code === 45 || code === 48) return { label: 'কুয়াশা', icon: 'cloud-fog' };
  if (code >= 51 && code <= 57) return { label: 'গুঁড়ি গুঁড়ি বৃষ্টি', icon: 'cloud-drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'বৃষ্টি', icon: 'cloud-rain' };
  if (code >= 95) return { label: 'বজ্রসহ বৃষ্টি', icon: 'cloud-lightning' };
  return { label: 'আবহাওয়া', icon: 'cloud' };
}

export interface RiskHit {
  rule: WeatherRiskRule;
  days: string[];
}

function metricValue(d: DailyForecast, metric: WeatherRiskRule['metric']): number {
  switch (metric) {
    case 'humidityMean':
      return d.humidityMean;
    case 'precipSum':
      return d.precipSum;
    case 'tempMax':
      return d.tempMax;
    case 'tempMin':
      return d.tempMin;
    case 'windMax':
      return d.windMax;
    case 'dryDays':
      return d.precipSum < 1 ? 1 : 0;
  }
}

/** Rule-based risk flags from the forecast. Thresholds live in weatherGuides.json. */
export function evaluateRisks(daily: DailyForecast[], rules: WeatherRiskRule[]): RiskHit[] {
  const hits: RiskHit[] = [];
  for (const rule of rules) {
    let run: string[] = [];
    let best: string[] = [];
    for (const d of daily) {
      const v = metricValue(d, rule.metric);
      const ok = Number.isFinite(v) && (rule.op === 'gte' ? v >= rule.threshold : v <= rule.threshold);
      if (ok) {
        run.push(d.date);
        if (run.length > best.length) best = [...run];
      } else run = [];
    }
    if (best.length >= rule.consecutiveDays) hits.push({ rule, days: best });
  }
  return hits;
}

export interface SprayWindow {
  start: string;
  end: string;
  hours: number;
}

/**
 * Finds daytime windows where wind is low and no rain is forecast for the next N hours.
 * General rule of thumb only — always follow the product label.
 */
export function findSprayWindows(hourly: HourlyPoint[], rule: SprayRule, minHours = 2): SprayWindow[] {
  const ok = hourly.map((h, i) => {
    const hour = Number(h.time.slice(11, 13));
    if (hour < rule.startHour || hour >= rule.endHour) return false;
    if (!Number.isFinite(h.wind) || h.wind > rule.maxWindKmh) return false;
    for (let k = i; k < Math.min(hourly.length, i + rule.rainFreeHoursAfter + 1); k++) {
      if (hourly[k].precip > 0.1) return false;
    }
    return true;
  });
  const windows: SprayWindow[] = [];
  let s = -1;
  for (let i = 0; i <= ok.length; i++) {
    const sameDay = s >= 0 && i < hourly.length && hourly[i].time.slice(0, 10) === hourly[s].time.slice(0, 10);
    if (i < ok.length && ok[i] && (s < 0 || sameDay)) {
      if (s < 0) s = i;
    } else {
      if (s >= 0 && i - s >= minHours) windows.push({ start: hourly[s].time, end: hourly[i - 1].time, hours: i - s });
      s = i < ok.length && ok[i] ? i : -1;
    }
  }
  return windows;
}
