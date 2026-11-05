import { bnToAsciiDigits } from '../bn.js';
import { COMMODITIES, type Commodity } from './commodities.js';

/**
 * Turns the text of a TCB daily retail price report into structured rows.
 *
 * TCB's table columns are, per commodity:
 *   name | unit | today (min–max) | 1 week ago (min–max) | 1 month ago (min–max) | 1 year ago (min–max) | monthly % | yearly %
 *
 * PDF text extraction of Bangla is unreliable (pre-base vowel signs come out of order, some
 * reports use legacy ASCII fonts), so names are matched on a consonant "skeleton" and every
 * parse is shown to an admin for review before anything is published.
 */

export interface Range {
  min: number | null;
  max: number | null;
}
export interface ParsedRow {
  line: string;
  rawName: string;
  commodity: string | null;
  unitBn: string;
  today: Range;
  weekAgo: Range;
  monthAgo: Range;
  yearAgo: Range;
  /** 0–1: how sure the parser is about this row. Rows < 0.7 are highlighted for review. */
  confidence: number;
  include: boolean;
}
export interface ParseResult {
  reportDate: string | null;
  rows: ParsedRow[];
  warnings: string[];
}

const DEP_VOWELS = /[ঁ-ঃ়া-্ৗ‌‍]/g; // ঁ ং ঃ ় া–্ ৗ ZWJ/ZWNJ

/** Consonant skeleton: robust to vowel-sign reordering and spelling variants (দেশী/দেশি). */
export function skeleton(s: string): string {
  return bnToAsciiDigits(s.normalize('NFC'))
    .toLowerCase()
    .replace(/য়/g, 'য')
    .replace(/ড়/g, 'ড')
    .replace(/ঢ়/g, 'ঢ')
    .replace(/ণ/g, 'ন')
    .replace(/[শষ]/g, 'স')
    .replace(DEP_VOWELS, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

interface AliasEntry {
  sk: string;
  c: Commodity;
}
const ALIASES: AliasEntry[] = COMMODITIES.flatMap((c) =>
  [c.nameBn, c.nameEn, ...c.aliases].map((a) => ({ sk: skeleton(a), c })).filter((a) => a.sk.length >= 2),
).sort((a, b) => b.sk.length - a.sk.length);

/** Best commodity for a piece of text (longest alias skeleton contained in it). */
export function matchCommodity(text: string): { commodity: Commodity; score: number } | null {
  const sk = skeleton(text);
  if (sk.length < 2) return null;
  for (const a of ALIASES) {
    if (sk.includes(a.sk)) return { commodity: a.c, score: Math.min(1, a.sk.length / Math.max(4, sk.length) + 0.5) };
  }
  return null;
}

const BN_MONTHS: Record<string, number> = {
  জানুয়ারি: 1, জানুয়ারী: 1, ফেব্রুয়ারি: 2, ফেব্রুয়ারী: 2, মার্চ: 3, এপ্রিল: 4, মে: 5, জুন: 6, জুলাই: 7, আগস্ট: 8, আগষ্ট: 8,
  সেপ্টেম্বর: 9, অক্টোবর: 10, নভেম্বর: 11, ডিসেম্বর: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};
// month names matched on skeletons too, so 'অেক্টাবর' (vowel signs out of order) still reads as অক্টোবর
const MONTH_SKELETONS = new Map(Object.entries(BN_MONTHS).map(([k, v]) => [skeleton(k), v]));
const pad = (n: number) => String(n).padStart(2, '0');
function validDate(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Finds the report date in the header lines (dd/mm/yyyy, yyyy-mm-dd or "২৯ অক্টোবর ২০২৬"). */
export function findReportDate(lines: string[]): string | null {
  for (const raw of lines.slice(0, 25)) {
    const l = bnToAsciiDigits(raw.normalize('NFC'));
    let m = l.match(/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/);
    if (m) {
      const d = validDate(Number(m[1]), Number(m[2]), Number(m[3]));
      if (d) return d;
    }
    m = l.match(/(?<!\d)(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4}|\d{2})(?!\d)/);
    if (m) {
      const d = validDate(Number(m[3]), Number(m[2]), Number(m[1]));
      if (d) return d;
    }
    m = l.match(/(\d{1,2})\s*([\p{L}\p{M}]+),?\s*(\d{4})/u);
    if (m) {
      const mon = BN_MONTHS[m[2].toLowerCase()] ?? MONTH_SKELETONS.get(skeleton(m[2]));
      if (mon) {
        const d = validDate(Number(m[3]), mon, Number(m[1]));
        if (d) return d;
      }
    }
  }
  return null;
}

type Tok = { kind: 'num'; v: number; pct: boolean } | { kind: 'nil' } | { kind: 'text'; s: string };

function tokenize(line: string): Tok[] {
  let s = bnToAsciiDigits(line.normalize('NFC'))
    .replace(/\u0000/g, ' ')
    .replace(/\(\s*([+-])\s*\)\s*/g, '$1') // (+)5.2 → +5.2
    .replace(/[৳]/g, ' ')
    .replace(/(\d)\s*[-–—‐]\s*(?=\d)/g, '$1 '); // 60-65 → 60 65
  s = s.replace(/(\d),(\d{3})\b/g, '$1$2'); // 1,250 → 1250
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map<Tok>((t) => {
      const n = t.match(/^([+-]?\d+(?:\.\d+)?)(%?)$/);
      if (n) return { kind: 'num', v: Number(n[1]), pct: n[2] === '%' || /^[+-]/.test(t) };
      if (/^[-–—]+$/.test(t) || /^(নাই|n\/a|na)$/i.test(t)) return { kind: 'nil' };
      return { kind: 'text', s: t };
    });
}

const UNIT_RE = /(প্রতি\s*)?(\d+(?:\.\d+)?\s*)?(কেজি|কেজী|লিটার|লিঃ|হালি|পিস|ডজন|গ্রাম|গ্রাঃ|টি|kg|litre|liter|ltr|pcs|dozen|gm)/i;

function rangeOf(a: number | null, b: number | null): Range {
  if (a != null && b != null && a > b) return { min: b, max: a };
  return { min: a, max: b ?? a };
}

/** Parses one table line. Returns null for headers, titles and notes. */
export function parseLine(line: string): ParsedRow | null {
  const toks = tokenize(line);
  // trailing run of numbers/blanks = the price columns
  let i = toks.length;
  while (i > 0 && toks[i - 1].kind !== 'text') i--;
  const run = toks.slice(i);
  const nums = run.filter((t) => t.kind !== 'text');
  if (nums.length < 6) return null;
  const head = toks
    .slice(0, i)
    .map((t) => (t.kind === 'text' ? t.s : t.kind === 'num' ? String(t.v) : '-'))
    .join(' ')
    .trim();
  if (!head || head.length < 2) return null;

  const vals = nums.map((t) => (t.kind === 'num' ? t.v : null));
  let prices: (number | null)[];
  let conf = 0.3;
  if (vals.length >= 10) {
    prices = vals.slice(vals.length - 10, vals.length - 2);
    conf += 0.35;
  } else if (vals.length === 8) {
    prices = vals;
    conf += 0.3;
  } else if (vals.length === 9) {
    const lastIsPct = nums[8].kind === 'num' && (nums[8] as { pct: boolean }).pct;
    prices = lastIsPct ? vals.slice(0, 8) : vals.slice(1, 9);
    conf += 0.15;
  } else {
    prices = [...vals.slice(0, 6), null, null];
    conf += 0.05;
  }
  const r = (k: number) => rangeOf(prices[k] ?? null, prices[k + 1] ?? null);
  const today = r(0);
  const sane = [today.min, today.max].every((v) => v == null || (v > 0 && v < 100000));
  if (!sane) return null;

  const unitM = bnToAsciiDigits(head).match(UNIT_RE);
  const match = matchCommodity(head);
  let rawName = head;
  if (unitM?.index != null && unitM.index > 1 && !match?.commodity.key.startsWith('soybean-oil-')) rawName = head.slice(0, unitM.index).trim();
  if (match) conf += 0.35 * match.score;
  if (today.min == null) conf -= 0.2;
  return {
    line,
    rawName,
    commodity: match?.commodity.key ?? null,
    unitBn: unitM ? unitM[0].replace(/প্রতি\s*/, '').trim() : match?.commodity.unitBn ?? '',
    today,
    weekAgo: r(2),
    monthAgo: r(4),
    yearAgo: r(6),
    confidence: Math.max(0, Math.min(1, Number(conf.toFixed(2)))),
    include: Boolean(match),
  };
}

/**
 * When names could not be read (e.g. legacy-font PDFs) but the report has the same number of rows
 * as the last published one, map rows by position. Marked low-confidence for review.
 */
export function applyRowTemplate(rows: ParsedRow[], template: string[] | null, warnings: string[]) {
  if (!template?.length) return;
  const unmatched = rows.filter((r) => !r.commodity).length;
  if (!unmatched) return;
  if (rows.length !== template.length) {
    warnings.push(`${unmatched}টি সারির পণ্যের নাম পড়া যায়নি; হাতে মিলিয়ে দিন।`);
    return;
  }
  rows.forEach((r, k) => {
    if (!r.commodity) {
      r.commodity = template[k];
      r.confidence = Math.min(r.confidence, 0.55);
      r.include = true;
    }
  });
  warnings.push(`${unmatched}টি সারির নাম পড়া যায়নি; আগের প্রতিবেদনের সারির ক্রম অনুযায়ী মেলানো হয়েছে — অবশ্যই যাচাই করুন।`);
}

export function parseReportText(text: string | string[], template: string[] | null = null): ParseResult {
  const lines = (Array.isArray(text) ? text : text.split(/\r?\n/)).map((l) => l.trim()).filter(Boolean);
  const warnings: string[] = [];
  const reportDate = findReportDate(lines);
  if (!reportDate) warnings.push('প্রতিবেদনের তারিখ খুঁজে পাওয়া যায়নি — হাতে লিখে দিন।');
  const rows: ParsedRow[] = [];
  const seen = new Set<string>();
  for (const l of lines) {
    const row = parseLine(l);
    if (!row) continue;
    if (row.commodity && seen.has(row.commodity)) {
      row.include = false;
      row.confidence = Math.min(row.confidence, 0.4);
      warnings.push(`"${row.rawName}" একাধিকবার পাওয়া গেছে — দ্বিতীয়টি বাদ রাখা হয়েছে।`);
    }
    if (row.commodity) seen.add(row.commodity);
    rows.push(row);
  }
  applyRowTemplate(rows, template, warnings);
  if (!rows.length) warnings.push('কোনো দামের সারি পাওয়া যায়নি। PDF-টি স্ক্যান করা ছবি হলে দাম হাতে লিখুন বা CSV দিন।');
  return { reportDate, rows, warnings };
}

/**
 * CSV import. Header must include `commodity` (key or Bangla name) and either
 * `min,max` (today only) or `today_min,today_max[,week_min,week_max,month_min,month_max,year_min,year_max]`.
 * Optional columns: `unit`, `date` (YYYY-MM-DD; otherwise the report date is used).
 */
export function parseCsv(csv: string): ParseResult & { dates: Set<string> } {
  const warnings: string[] = [];
  const lines = csv.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const dates = new Set<string>();
  if (lines.length < 2) return { reportDate: null, rows: [], warnings: ['CSV-তে কোনো সারি নেই।'], dates };
  const split = (l: string) => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const header = split(lines[0]).map((h) => h.toLowerCase());
  const col = (n: string) => header.indexOf(n);
  if (col('commodity') < 0) return { reportDate: null, rows: [], warnings: ['CSV-এর প্রথম সারিতে "commodity" কলাম থাকতে হবে।'], dates };
  const num = (v: string | undefined) => {
    if (v == null || v === '' || /^[-–]$/.test(v)) return null;
    const n = Number(bnToAsciiDigits(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  };
  const rows: ParsedRow[] = [];
  for (const l of lines.slice(1)) {
    const c = split(l);
    const name = c[col('commodity')] ?? '';
    const byKey = COMMODITIES.find((x) => x.key === name);
    const match = byKey ? { commodity: byKey, score: 1 } : matchCommodity(name);
    const get = (a: string, b?: string) => num(c[col(a)] ?? (b ? c[col(b)] : undefined));
    const date = c[col('date')];
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) dates.add(date);
    rows.push({
      line: l,
      rawName: name,
      commodity: match?.commodity.key ?? null,
      unitBn: c[col('unit')] || match?.commodity.unitBn || '',
      today: rangeOf(get('today_min', 'min'), get('today_max', 'max')),
      weekAgo: rangeOf(get('week_min'), get('week_max')),
      monthAgo: rangeOf(get('month_min'), get('month_max')),
      yearAgo: rangeOf(get('year_min'), get('year_max')),
      confidence: match ? 0.95 : 0.3,
      include: Boolean(match),
    });
  }
  const unknown = rows.filter((r) => !r.commodity).length;
  if (unknown) warnings.push(`${unknown}টি সারির পণ্য চেনা যায়নি।`);
  return { reportDate: dates.size === 1 ? [...dates][0] : null, rows, warnings, dates };
}
