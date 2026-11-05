import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { config } from '../../config.js';
import { getFetch } from '../ai/types.js';
import { PriceUpload } from '../../models/Price.js';
import { bdHour, bdToday } from '../time.js';
import { pdfToLines } from './pdfText.js';
import { lastRowTemplate } from './service.js';
import { parseReportText } from './tcbParser.js';

/**
 * OPTIONAL automatic collector — OFF by default (TCB_AUTOFETCH=false).
 *
 * As of October 2026 the TCB website's robots.txt disallows automated access, so this
 * must stay off unless TCB grants permission. Even when enabled it:
 *   - checks robots.txt before every request and stops if disallowed,
 *   - fetches at most once per day with an identifying User-Agent,
 *   - only creates a DRAFT upload; an admin still reviews and publishes it.
 * The page structure of tcb.gov.bd could not be inspected while building this, so
 * link discovery is a best-effort heuristic and must be tested after permission is granted.
 */
type Robots = { isAllowed(url: string, ua?: string): boolean | undefined };
const robotsParser = createRequire(import.meta.url)('robots-parser') as (url: string, txt: string) => Robots;

const UA = 'AgriBanglaBot/2.0 (+contact: site admin; daily TCB price draft)';

export async function robotsAllows(url: string): Promise<boolean> {
  const u = new URL(url);
  const robotsUrl = `${u.origin}/robots.txt`;
  try {
    const r = await getFetch()(robotsUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    if (r.status >= 400 && r.status < 500) return true; // no robots.txt → allowed by convention
    if (!r.ok) return false; // server error → be conservative
    const robots = robotsParser(robotsUrl, await r.text());
    return robots.isAllowed(url, UA) === true;
  } catch {
    return false;
  }
}

/** Finds PDF links that look like daily retail price reports on a listing page. */
export function findReportLinks(html: string, base: string): string[] {
  const out: string[] = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, ' ');
    if (/\.pdf(\?|$)/i.test(href) || /খুচরা|বাজার\s*দর|rmp/i.test(text + href)) {
      try {
        out.push(new URL(href, base).toString());
      } catch {
        /* skip malformed */
      }
    }
  }
  return [...new Set(out)];
}

export async function runTcbFetchOnce(): Promise<{ status: string; uploadId?: string }> {
  const listUrl = config.TCB_LIST_URL;
  if (!(await robotsAllows(listUrl))) return { status: 'robots-disallowed' };
  const page = await getFetch()(listUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!page.ok) return { status: `list-http-${page.status}` };
  const links = findReportLinks(await page.text(), listUrl).filter((l) => l.toLowerCase().includes('.pdf'));
  if (!links.length) return { status: 'no-pdf-links' };
  const pdfUrl = links[0];
  if (!(await robotsAllows(pdfUrl))) return { status: 'robots-disallowed-pdf' };
  const pdf = await getFetch()(pdfUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
  if (!pdf.ok) return { status: `pdf-http-${pdf.status}` };
  const buf = new Uint8Array(await pdf.arrayBuffer());
  const fileHash = createHash('sha256').update(buf).digest('hex');
  if (await PriceUpload.exists({ fileHash })) return { status: 'already-have' };
  const { lines } = await pdfToLines(buf);
  const parsed = parseReportText(lines, await lastRowTemplate());
  const doc = await PriceUpload.create({
    reportDate: parsed.reportDate, fileName: pdfUrl.split('/').pop(), fileHash, format: 'autofetch', sourceUrl: pdfUrl,
    rows: parsed.rows, warnings: ['স্বয়ংক্রিয়ভাবে সংগৃহীত খসড়া — যাচাই করে প্রকাশ করুন।', ...parsed.warnings], createdBy: 'autofetch',
  });
  return { status: 'draft-created', uploadId: String(doc._id) };
}

let lastRunDay = '';
export function startTcbScheduler(log: (m: string) => void) {
  if (!config.TCB_AUTOFETCH) return null;
  log('TCB autofetch enabled — checks robots.txt before each run; creates drafts only.');
  const tick = async () => {
    const day = bdToday();
    if (day === lastRunDay || bdHour() < config.TCB_FETCH_HOUR_BD) return;
    lastRunDay = day;
    try {
      const r = await runTcbFetchOnce();
      log(`TCB autofetch: ${r.status}`);
    } catch (e) {
      log(`TCB autofetch failed: ${(e as Error).message}`);
    }
  };
  return setInterval(tick, 30 * 60_000);
}
