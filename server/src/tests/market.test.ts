import { describe, expect, it } from 'vitest';
import { findReportDate, matchCommodity, parseCsv, parseLine, parseReportText, skeleton } from '../lib/market/tcbParser.js';
import { pdfToLines } from '../lib/market/pdfText.js';
import { changes, type HistoryPoint } from '../lib/market/service.js';
import { makeTcbPdf } from './helpers/makeTcbPdf.js';

// SYNTHETIC report text in TCB's column layout (values invented for tests only).
const REPORT = `
ট্রেডিং কর্পোরেশন অব বাংলাদেশ
ঢাকা মহানগরীর নিত্য প্রয়োজনীয় পণ্যের খুচরা বাজার দর
তারিখঃ ২৯/১০/২০২৬ খ্রিঃ
পণ্যের নাম মাপের একক আজকের মূল্য এক সপ্তাহ পূর্বের মূল্য এক মাস পূর্বের মূল্য এক বছর পূর্বের মূল্য মাসিক বার্ষিক
চাল সরু (নাজির/মিনিকেট) প্রতি কেজি ৭০-৮০ ৭০-৮০ ৭২-৮২ ৬৮-৭৮ (-)২.৫৬ (+)২.৭০
চাল মোটা (স্বর্ণা/চায়না ইরি) প্রতি কেজি ৫০-৫৫ ৫০-৫৫ ৫০-৫৬ ৪৮-৫২ -০.৯৪ +৫.০০
সয়াবিন তেল (বোতল) ৫ লিটার ৮৫০-৮৮০ ৮৫০-৮৮০ ৮৪০-৮৭০ ৮০০-৮৩০ +১.১৬ +৬.১০
আলু প্রতি কেজি ২৫-৩০ ২৫-৩০ ২৮-৩২ - - -৮.৩৩ -
পিঁয়াজ (দেশী) প্রতি কেজি ১০০-১১০ ৯০-১০০ ৮০-৯০ ১০০-১২০ +২৩.৫৩ -৪.৫৫
ডিম (ফার্ম) প্রতি হালি ৪৮-৫০ ৪৮-৫০ ৫০-৫২ ৪৪-৪৬ -৩.৯২ +৮.৮৯
বিঃদ্রঃ উল্লিখিত মূল্য টিসিবির বাজার মনিটরিং টিম কর্তৃক সংগৃহীত।
`;

describe('TCB report parser', () => {
  it('finds the report date in Bangla digits', () => {
    expect(findReportDate(REPORT.split('\n'))).toBe('2026-10-29');
    expect(findReportDate(['তারিখ: ৫ নভেম্বর ২০২৬'])).toBe('2026-11-05');
    expect(findReportDate(['Date: 2026-11-03'])).toBe('2026-11-03');
    expect(findReportDate(['৩১/০২/২০২৬'])).toBeNull(); // impossible date
  });

  it('parses rows, ranges, units, blanks and percent columns', () => {
    const r = parseReportText(REPORT);
    expect(r.reportDate).toBe('2026-10-29');
    const by = Object.fromEntries(r.rows.map((x) => [x.commodity, x]));
    expect(Object.keys(by)).toEqual(expect.arrayContaining(['rice-fine', 'rice-coarse', 'soybean-oil-5l', 'potato', 'onion-local', 'egg-farm']));
    expect(by['rice-fine'].today).toEqual({ min: 70, max: 80 });
    expect(by['rice-fine'].yearAgo).toEqual({ min: 68, max: 78 });
    expect(by['soybean-oil-5l'].today).toEqual({ min: 850, max: 880 });
    expect(by['potato'].yearAgo).toEqual({ min: null, max: null });
    expect(by['egg-farm'].unitBn).toContain('হালি');
    expect(r.rows.every((x) => x.confidence >= 0.7)).toBe(true);
  });

  it('ignores headers and notes', () => {
    expect(parseLine('পণ্যের নাম মাপের একক আজকের মূল্য')).toBeNull();
    expect(parseLine('বিঃদ্রঃ উল্লিখিত মূল্য টিসিবির')).toBeNull();
  });

  it('matches names even when vowel signs come out of order (PDF extraction artefact)', () => {
    expect(skeleton('িচিন')).toBe(skeleton('চিনি'));
    expect(matchCommodity('িচিন')?.commodity.key).toBe('sugar');
    expect(matchCommodity('পিয়াজ দেশি')?.commodity.key).toBe('onion-local');
    expect(matchCommodity('মশুর ডাল (বড় দানা)')?.commodity.key).toBe('lentil-large');
  });

  it('maps unreadable names by the previous report row order, flagged for review', () => {
    const garbled = 'Pvj †gvUv 50 55 50 55 50 56 48 52 -0.94 +5.00\nAvjy 25 30 25 30 28 32 20 22 -8 +10';
    const r = parseReportText(`2026-10-30\n${garbled}`, ['rice-coarse', 'potato']);
    expect(r.rows.map((x) => x.commodity)).toEqual(['rice-coarse', 'potato']);
    expect(r.rows.every((x) => x.confidence <= 0.55)).toBe(true);
    expect(r.warnings.join(' ')).toContain('যাচাই');
  });

  it('parses CSV with keys or Bangla names', () => {
    const r = parseCsv('commodity,unit,min,max,date\nrice-coarse,কেজি,50,55,2026-10-29\nআলু,কেজি,২৫,৩০,2026-10-29\nunknown thing,,1,2,2026-10-29');
    expect(r.reportDate).toBe('2026-10-29');
    expect(r.rows[0]).toMatchObject({ commodity: 'rice-coarse', today: { min: 50, max: 55 } });
    expect(r.rows[1]).toMatchObject({ commodity: 'potato', today: { min: 25, max: 30 } });
    expect(r.rows[2].commodity).toBeNull();
  });
});

describe('real PDF extraction (pdf.js) of a Bangla table', () => {
  it('extracts and parses a generated TCB-style PDF', async () => {
    const pdf = await makeTcbPdf('২৯ অক্টোবর ২০২৬', [
      { name: 'চাল (মোটা)', unit: 'কেজি', nums: ['৫০', '৫৫', '৫০', '৫৫', '৫০', '৫৬', '৪৮', '৫২'], pct: ['-0.94', '+5.00'] },
      { name: 'চিনি', unit: 'কেজি', nums: ['১১০', '১১৫', '১১০', '১১৫', '১২০', '১২৫', '১৩০', '১৩৫'], pct: ['-8.16', '-15.09'] },
      { name: 'মসুর ডাল (বড় দানা)', unit: 'কেজি', nums: ['১০৫', '১১০', '১০৫', '১১০', '১০৫', '১১০', '১০০', '১০৫'], pct: ['0.00', '+4.88'] },
      { name: 'পিঁয়াজ (দেশি)', unit: 'কেজি', nums: ['১০০', '১১০', '৯০', '১০০', '৮০', '৯০', '১০০', '১২০'], pct: ['+23.53', '-4.55'] },
    ]);
    const { lines, hasText } = await pdfToLines(new Uint8Array(pdf));
    expect(hasText).toBe(true);
    const r = parseReportText(lines);
    expect(r.reportDate).toBe('2026-10-29');
    const keys = r.rows.map((x) => x.commodity);
    expect(keys).toEqual(expect.arrayContaining(['rice-coarse', 'sugar', 'lentil-large', 'onion-local']));
    const sugar = r.rows.find((x) => x.commodity === 'sugar')!;
    expect(sugar.today).toEqual({ min: 110, max: 115 });
    expect(sugar.yearAgo).toEqual({ min: 130, max: 135 });
  });
});

describe('price change maths', () => {
  it('compares the latest average with week/month/year points', () => {
    const pts: HistoryPoint[] = [
      { date: '2025-10-29', min: 48, max: 52, avg: 50, kind: 'reference' },
      { date: '2026-09-29', min: 50, max: 56, avg: 53, kind: 'reference' },
      { date: '2026-10-22', min: 50, max: 55, avg: 52.5, kind: 'reference' },
      { date: '2026-10-29', min: 50, max: 55, avg: 52.5, kind: 'daily' },
    ];
    const c = changes(pts)!;
    expect(c.week).toBe(0);
    expect(c.month).toBeCloseTo(-0.94, 2);
    expect(c.year).toBe(5);
  });
});
