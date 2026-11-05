import { Price, PriceUpload } from '../../models/Price.js';
import { addDays } from '../time.js';
import { COMMODITY_MAP } from './commodities.js';
import type { ParsedRow } from './tcbParser.js';

export interface LatestPrice {
  commodity: string;
  nameBn: string;
  unitBn: string;
  date: string;
  min: number | null;
  max: number | null;
  source: string;
  sourceUrl: string;
}

/** Latest daily price per commodity (optionally only some commodities). */
export async function latestPrices(keys?: string[]): Promise<LatestPrice[]> {
  const match: Record<string, unknown> = { kind: 'daily' };
  if (keys?.length) match.commodity = { $in: keys };
  const docs = await Price.find(match).sort({ date: -1 }).limit(2000).lean();
  const seen = new Map<string, LatestPrice>();
  for (const d of docs) {
    if (seen.has(d.commodity)) continue;
    const c = COMMODITY_MAP.get(d.commodity);
    seen.set(d.commodity, {
      commodity: d.commodity,
      nameBn: c?.nameBn ?? d.commodity,
      unitBn: d.unitBn || c?.unitBn || '',
      date: d.date,
      min: d.min ?? null,
      max: d.max ?? null,
      source: d.source,
      sourceUrl: d.sourceUrl ?? '',
    });
  }
  return [...seen.values()];
}

/**
 * Writes a reviewed upload into the price history.
 * Daily rows overwrite the same date (a corrected re-upload replaces earlier values);
 * week/month/year-ago columns are stored as "reference" points and never overwrite daily data.
 */
export async function publishRows(opts: { uploadId: unknown; reportDate: string; rows: ParsedRow[]; sourceUrl: string; source?: string }) {
  const source = opts.source ?? 'TCB';
  let daily = 0;
  let reference = 0;
  for (const r of opts.rows) {
    if (!r.include || !r.commodity || !COMMODITY_MAP.has(r.commodity)) continue;
    const unitBn = r.unitBn || COMMODITY_MAP.get(r.commodity)!.unitBn;
    if (r.today.min != null || r.today.max != null) {
      await Price.updateOne(
        { commodity: r.commodity, date: opts.reportDate, kind: 'daily', source },
        { $set: { min: r.today.min, max: r.today.max ?? r.today.min, unitBn, reportDate: opts.reportDate, sourceUrl: opts.sourceUrl, uploadId: opts.uploadId } },
        { upsert: true },
      );
      daily++;
    }
    const refs: [keyof ParsedRow, number][] = [
      ['weekAgo', -7],
      ['monthAgo', -30],
      ['yearAgo', -365],
    ];
    for (const [field, offset] of refs) {
      const v = r[field] as ParsedRow['today'];
      if (v?.min == null && v?.max == null) continue;
      const date = addDays(opts.reportDate, offset);
      // keep the reference point from the most recent report only
      await Price.updateOne(
        { commodity: r.commodity, date, kind: 'reference', source },
        { $set: { min: v.min, max: v.max ?? v.min, unitBn, reportDate: opts.reportDate, sourceUrl: opts.sourceUrl, uploadId: opts.uploadId } },
        { upsert: true },
      );
      reference++;
    }
  }
  return { daily, reference };
}

/** Row order of the last published upload — used to map unreadable names by position. */
export async function lastRowTemplate(): Promise<string[] | null> {
  const last = await PriceUpload.findOne({ status: 'published' }).sort({ reportDate: -1 }).select('rows').lean();
  if (!last) return null;
  const keys = (last.rows ?? []).map((r) => r.commodity).filter((k): k is string => Boolean(k));
  return keys.length ? keys : null;
}

export interface HistoryPoint {
  date: string;
  min: number | null;
  max: number | null;
  avg: number | null;
  kind: 'daily' | 'reference';
}

/** Merged history: daily points, plus reference points only on dates without a daily record. */
export async function history(commodity: string, from: string, to: string): Promise<HistoryPoint[]> {
  const docs = await Price.find({ commodity, date: { $gte: from, $lte: to } }).sort({ date: 1 }).lean();
  const byDate = new Map<string, HistoryPoint>();
  for (const d of docs) {
    const prev = byDate.get(d.date);
    if (prev && prev.kind === 'daily') continue;
    const avg = d.min != null && d.max != null ? (d.min + d.max) / 2 : d.min ?? d.max ?? null;
    byDate.set(d.date, { date: d.date, min: d.min ?? null, max: d.max ?? null, avg, kind: d.kind as 'daily' | 'reference' });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Change of the average price vs. ~7, ~30 and ~365 days earlier (nearest point within a window). */
export function changes(points: HistoryPoint[]) {
  const last = [...points].reverse().find((p) => p.avg != null);
  if (!last) return null;
  const near = (days: number, tol: number) => {
    const target = addDays(last.date, -days);
    let best: HistoryPoint | null = null;
    let bestDiff = Infinity;
    for (const p of points) {
      if (p.avg == null || p.date >= last.date) continue;
      const diff = Math.abs((new Date(p.date).getTime() - new Date(target).getTime()) / 86400_000);
      if (diff <= tol && diff < bestDiff) {
        best = p;
        bestDiff = diff;
      }
    }
    return best ? Number((((last.avg! - best.avg!) / best.avg!) * 100).toFixed(2)) : null;
  };
  return { date: last.date, avg: last.avg, week: near(7, 2), month: near(30, 4), year: near(365, 10) };
}
