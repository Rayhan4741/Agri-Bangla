import { Router } from 'express';
import { z } from 'zod';
import { getFetch } from '../lib/ai/types.js';
import { HttpError } from '../lib/httpError.js';
import { parse } from '../lib/validate.js';
import { ApiCache } from '../models/Misc.js';

export const weatherRouter = Router();

const PROVIDER = { name: 'Open-Meteo', url: 'https://open-meteo.com/', license: 'CC BY 4.0 (weather data)' };
const TTL_MS = 60 * 60_000;

// Restricted to Bangladesh's bounding box so the endpoint can't be used as an open proxy.
const q = z.object({
  lat: z.coerce.number().min(20.3).max(26.8),
  lon: z.coerce.number().min(87.9).max(92.8),
});

export function forecastUrl(lat: number, lon: number) {
  const p = new URLSearchParams({
    latitude: lat.toFixed(2),
    longitude: lon.toFixed(2),
    current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
    hourly: 'relative_humidity_2m,wind_speed_10m,precipitation',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,relative_humidity_2m_mean,weather_code',
    timezone: 'Asia/Dhaka',
    forecast_days: '7',
    wind_speed_unit: 'kmh',
  });
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}

weatherRouter.get('/', async (req, res) => {
  const { lat, lon } = parse(q, req.query);
  const key = `om:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = await ApiCache.findOne({ key }).lean().catch(() => null);
  if (cached && Date.now() - new Date(cached.fetchedAt).getTime() < TTL_MS) {
    return res.json({ provider: PROVIDER, retrievedAt: cached.fetchedAt, cached: true, data: cached.payload });
  }
  let r: Response;
  try {
    r = await getFetch()(forecastUrl(lat, lon), { signal: AbortSignal.timeout(12000) });
  } catch {
    if (cached) return res.json({ provider: PROVIDER, retrievedAt: cached.fetchedAt, cached: true, stale: true, data: cached.payload });
    throw new HttpError(502, 'WEATHER_UNAVAILABLE', 'আবহাওয়ার সার্ভারে সংযোগ করা যায়নি।');
  }
  if (!r.ok) {
    if (cached) return res.json({ provider: PROVIDER, retrievedAt: cached.fetchedAt, cached: true, stale: true, data: cached.payload });
    throw new HttpError(502, 'WEATHER_UNAVAILABLE', `আবহাওয়ার তথ্য পাওয়া যায়নি (${r.status})।`);
  }
  const data = await r.json();
  const fetchedAt = new Date();
  await ApiCache.updateOne({ key }, { $set: { payload: data, fetchedAt } }, { upsert: true }).catch(() => undefined);
  res.json({ provider: PROVIDER, retrievedAt: fetchedAt, cached: false, data });
});
