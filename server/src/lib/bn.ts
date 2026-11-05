/** Bangla text helpers shared by the parsers and the knowledge search. */

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export function bnToAsciiDigits(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

export function toBnDigits(s: string | number): string {
  return String(s).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** Lower-cases, unifies digits, strips punctuation and zero-width joiners for matching. */
export function normalizeText(s: string): string {
  return bnToAsciiDigits(s.normalize('NFC'))
    .toLowerCase()
    .replace(/[‌‍]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(
  'এবং ও কি কী কেন কিভাবে কীভাবে করব করবো করতে আমার আমি আমাদের হচ্ছে হয় হলে হবে না নেই যে এর এই সে তা থেকে জন্য দিয়ে দিয়ে একটি এক কোন কোনো কত what why how the a an of to in is are my for on and or'.split(' '),
);

/** Tokens for search; also adds 3-char prefixes so inflected Bangla words still match (ধানের → ধান). */
export function tokens(s: string): string[] {
  const out = new Set<string>();
  for (const w of normalizeText(s).split(' ')) {
    if (!w || STOP.has(w)) continue;
    out.add(w);
    const chars = [...w];
    if (chars.length > 3) out.add(chars.slice(0, Math.max(2, chars.length - 2)).join(''));
  }
  return [...out];
}
