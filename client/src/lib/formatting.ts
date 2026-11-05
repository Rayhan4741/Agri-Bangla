const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Convert ASCII digits in any string to Bangla digits. */
export function toBnDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** Convert Bangla digits to ASCII digits (for parsing user input typed with a Bangla keyboard). */
export function fromBnDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/** Parse a user-entered number that may contain Bangla digits or commas. Returns NaN when invalid. */
export function parseNumber(input: string): number {
  const cleaned = fromBnDigits(input).replace(/,/g, '').trim();
  if (cleaned === '') return NaN;
  return Number(cleaned);
}

/** Format a number in Bangla with grouping, e.g. 123456.7 → "১,২৩,৪৫৬.৭" */
export function formatBn(value: number, maxFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('bn-BD', { maximumFractionDigits: maxFractionDigits }).format(value);
}

export function formatTaka(value: number): string {
  return `৳ ${formatBn(value, 0)}`;
}

export const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

export const BN_WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

export function formatDateBn(date: Date): string {
  return `${toBnDigits(date.getDate())} ${BN_MONTHS[date.getMonth()]} ${toBnDigits(date.getFullYear())}`;
}

export function formatTimeBn(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h < 12 ? 'সকাল' : h < 16 ? 'দুপুর' : h < 18 ? 'বিকেল' : 'রাত';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${toBnDigits(h12)}:${toBnDigits(String(m).padStart(2, '0'))}`;
}
