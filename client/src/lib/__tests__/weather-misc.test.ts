import { describe, expect, it } from 'vitest';
import { buildForecastUrl, evaluateRisks, findSprayWindows, parseForecast } from '../weather';
import { weatherData } from '../data';
import { formatBn, fromBnDigits, parseNumber, toBnDigits } from '../formatting';
import { banglaDate, cropSeasonForMonth } from '../season';
import { buildIcs } from '../ics';

function fakeApi(days = 7, opts: { humidity?: number; rain?: number[]; wind?: number; tmax?: number } = {}) {
  const dates = Array.from({ length: days }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
  const hourlyTimes = dates.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`));
  return {
    current: { time: '2026-11-01T09:00', temperature_2m: 27.4, relative_humidity_2m: 80, precipitation: 0, wind_speed_10m: 6, weather_code: 2 },
    hourly: {
      time: hourlyTimes,
      relative_humidity_2m: hourlyTimes.map(() => opts.humidity ?? 70),
      wind_speed_10m: hourlyTimes.map(() => opts.wind ?? 5),
      precipitation: hourlyTimes.map(() => 0),
    },
    daily: {
      time: dates,
      temperature_2m_max: dates.map(() => opts.tmax ?? 30),
      temperature_2m_min: dates.map(() => 20),
      precipitation_sum: dates.map((_, i) => opts.rain?.[i] ?? 0),
      precipitation_probability_max: dates.map(() => 10),
      wind_speed_10m_max: dates.map(() => opts.wind ?? 8),
    },
  };
}

describe('weather', () => {
  it('builds an Open-Meteo URL with the right parameters', () => {
    const u = new URL(buildForecastUrl(23.81, 90.41));
    expect(u.hostname).toBe('api.open-meteo.com');
    expect(u.searchParams.get('timezone')).toBe('Asia/Dhaka');
    expect(u.searchParams.get('daily')).toContain('precipitation_sum');
  });
  it('parses forecast and computes daily mean humidity', () => {
    const f = parseForecast(fakeApi(3, { humidity: 90 }));
    expect(f.daily).toHaveLength(3);
    expect(f.daily[0].humidityMean).toBeCloseTo(90);
    expect(f.current?.temp).toBe(27.4);
  });
  it('throws on malformed data (external API failure)', () => {
    expect(() => parseForecast({})).toThrow();
    expect(() => parseForecast(null)).toThrow();
  });
  it('flags humidity disease risk after 3 humid days', () => {
    const hits = evaluateRisks(parseForecast(fakeApi(7, { humidity: 92 })).daily, weatherData.riskRules);
    expect(hits.map((h) => h.rule.id)).toContain('rr-humid');
  });
  it('flags heavy rain and dry spell correctly', () => {
    const wet = evaluateRisks(parseForecast(fakeApi(7, { rain: [0, 80, 0, 0, 0, 0, 0] })).daily, weatherData.riskRules);
    expect(wet.map((h) => h.rule.id)).toContain('rr-heavy-rain');
    expect(wet.map((h) => h.rule.id)).not.toContain('rr-dry');
    const dry = evaluateRisks(parseForecast(fakeApi(7)).daily, weatherData.riskRules);
    expect(dry.map((h) => h.rule.id)).toContain('rr-dry');
  });
  it('finds daytime spray windows only when calm', () => {
    const calm = findSprayWindows(parseForecast(fakeApi(2, { wind: 5 })).hourly, weatherData.sprayRule);
    expect(calm.length).toBeGreaterThan(0);
    calm.forEach((w) => {
      const h = Number(w.start.slice(11, 13));
      expect(h).toBeGreaterThanOrEqual(6);
      expect(w.start.slice(0, 10)).toBe(w.end.slice(0, 10));
    });
    const windy = findSprayWindows(parseForecast(fakeApi(2, { wind: 25 })).hourly, weatherData.sprayRule);
    expect(windy).toHaveLength(0);
  });
});

describe('formatting & dates', () => {
  it('converts digits both ways', () => {
    expect(toBnDigits('2026')).toBe('২০২৬');
    expect(fromBnDigits('১২.৫')).toBe('12.5');
    expect(parseNumber('১,২০০')).toBe(1200);
    expect(Number.isNaN(parseNumber(''))).toBe(true);
  });
  it('formats numbers in Bangla', () => {
    expect(formatBn(1234.5)).toMatch(/[০-৯]/);
    expect(formatBn(NaN)).toBe('—');
  });
  it('computes the revised Bangla calendar', () => {
    expect(banglaDate(new Date(2026, 3, 14)).labelBn).toBe('১ বৈশাখ ১৪৩৩');
    expect(banglaDate(new Date(2026, 1, 14)).monthBn).toBe('ফাল্গুন');
    expect(banglaDate(new Date(2026, 9, 17)).monthBn).toBe('কার্তিক');
    expect(banglaDate(new Date(2026, 9, 17)).day).toBe(1);
  });
  it('maps months to cropping seasons', () => {
    expect(cropSeasonForMonth(1)).toBe('rabi');
    expect(cropSeasonForMonth(4)).toBe('kharif-1');
    expect(cropSeasonForMonth(8)).toBe('kharif-2');
  });
  it('builds a valid ICS file', () => {
    const ics = buildIcs([{ uid: 'a', title: 'বোরো, বীজতলা', date: new Date(2026, 10, 1) }]);
    expect(ics).toMatch(/^BEGIN:VCALENDAR/);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261101');
    expect(ics).toContain('বোরো\\, বীজতলা');
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true);
  });
});
