import { createHash } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAdmin } from '../lib/auth.js';
import { badRequest, notFound } from '../lib/httpError.js';
import { COMMODITIES, COMMODITY_MAP } from '../lib/market/commodities.js';
import { pdfToLines } from '../lib/market/pdfText.js';
import { changes, history, lastRowTemplate, latestPrices, publishRows } from '../lib/market/service.js';
import { parseCsv, parseReportText } from '../lib/market/tcbParser.js';
import { addDays, bdToday } from '../lib/time.js';
import { parse } from '../lib/validate.js';
import { Price, PriceUpload } from '../models/Price.js';

export const marketRouter = Router();
export const adminMarketRouter = Router();

const SOURCE = {
  nameBn: 'ট্রেডিং কর্পোরেশন অব বাংলাদেশ (টিসিবি)',
  nameEn: 'Trading Corporation of Bangladesh (TCB)',
  url: 'https://tcb.gov.bd/pages/daily-rmps',
  scopeBn: 'ঢাকা মহানগরীর নিত্য প্রয়োজনীয় পণ্যের খুচরা বাজার দর',
};

marketRouter.get('/commodities', (_req, res) => {
  res.json({ commodities: COMMODITIES.map(({ aliases: _a, ...c }) => c), source: SOURCE });
});

/** Latest price for every commodity + changes vs. last week / month / year. */
marketRouter.get('/latest', async (_req, res) => {
  const latest = await latestPrices();
  const latestDate = latest.reduce((m, r) => (r.date > m ? r.date : m), '');
  const out = [];
  for (const r of latest) {
    const pts = await history(r.commodity, addDays(r.date, -400), r.date);
    out.push({ ...r, category: COMMODITY_MAP.get(r.commodity)?.category, change: changes(pts) });
  }
  res.json({ latestDate: latestDate || null, items: out, source: SOURCE, stale: latestDate ? latestDate < addDays(bdToday(), -3) : null });
});

const histQuery = z.object({
  commodity: z.string().refine((k) => COMMODITY_MAP.has(k), 'অজানা পণ্য'),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

marketRouter.get('/history', async (req, res) => {
  const q = parse(histQuery, req.query);
  const to = q.to ?? bdToday();
  const from = q.from ?? addDays(to, -365);
  const points = await history(q.commodity, from, to);
  res.json({ commodity: COMMODITY_MAP.get(q.commodity), from, to, points, change: changes(points), source: SOURCE });
});

/** Compare several commodities over the same window (average of min/max). */
marketRouter.get('/compare', async (req, res) => {
  const keys = String(req.query.commodities ?? '')
    .split(',')
    .filter((k) => COMMODITY_MAP.has(k))
    .slice(0, 6);
  if (!keys.length) throw badRequest('commodities দিন, যেমন ?commodities=rice-coarse,potato');
  const to = bdToday();
  const from = addDays(to, Math.max(-730, -Number(req.query.days ?? 90)));
  const series = await Promise.all(keys.map(async (k) => ({ commodity: k, nameBn: COMMODITY_MAP.get(k)!.nameBn, points: await history(k, from, to) })));
  res.json({ from, to, series, source: SOURCE });
});

// ── Admin: upload → review → publish ─────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });

adminMarketRouter.post('/uploads', upload.single('file'), async (req, res) => {
  const sourceUrl = String(req.body?.sourceUrl ?? '').slice(0, 500);
  const pasted = String(req.body?.text ?? '');
  let result;
  let format: 'pdf' | 'csv' | 'manual';
  let fileHash = '';
  const template = await lastRowTemplate();
  if (req.file) {
    fileHash = createHash('sha256').update(req.file.buffer).digest('hex');
    const name = req.file.originalname.toLowerCase();
    if (req.file.mimetype === 'application/pdf' || name.endsWith('.pdf')) {
      format = 'pdf';
      let extracted;
      try {
        extracted = await pdfToLines(new Uint8Array(req.file.buffer));
      } catch {
        throw badRequest('PDF ফাইলটি খোলা যায়নি।');
      }
      result = parseReportText(extracted.lines, template);
      if (!extracted.hasText) result.warnings.unshift('এই PDF-এ কোনো লেখা নেই (সম্ভবত স্ক্যান করা ছবি)। দাম হাতে লিখুন বা CSV দিন।');
    } else if (name.endsWith('.csv') || req.file.mimetype.includes('csv') || req.file.mimetype === 'text/plain') {
      format = 'csv';
      result = parseCsv(req.file.buffer.toString('utf8'));
    } else throw badRequest('PDF বা CSV ফাইল দিন।');
  } else if (pasted.trim()) {
    format = 'manual';
    result = parseReportText(pasted, template);
  } else {
    // empty manual sheet: one row per commodity for hand entry
    format = 'manual';
    result = {
      reportDate: null,
      warnings: [],
      rows: COMMODITIES.map((c) => ({
        line: '', rawName: c.nameBn, commodity: c.key, unitBn: c.unitBn,
        today: { min: null, max: null }, weekAgo: { min: null, max: null }, monthAgo: { min: null, max: null }, yearAgo: { min: null, max: null },
        confidence: 1, include: true,
      })),
    };
  }
  const reportDate = (req.body?.reportDate as string) || result.reportDate;
  if (fileHash) {
    const dup = await PriceUpload.findOne({ fileHash, status: 'published' }).select('reportDate').lean();
    if (dup) result.warnings.unshift(`এই ফাইলটি আগেই প্রকাশিত হয়েছে (${dup.reportDate})।`);
  }
  const doc = await PriceUpload.create({
    reportDate: reportDate && /^\d{4}-\d{2}-\d{2}$/.test(reportDate) ? reportDate : null,
    fileName: req.file?.originalname ?? (pasted ? 'pasted-text' : 'manual-entry'),
    fileHash,
    format,
    sourceUrl,
    rows: result.rows,
    warnings: result.warnings,
    createdBy: req.user!.name,
  });
  res.status(201).json({ upload: doc });
});

adminMarketRouter.get('/uploads', async (_req, res) => {
  const uploads = await PriceUpload.find({}).sort({ createdAt: -1 }).limit(60).select('-rows.line').lean();
  res.json({ uploads: uploads.map((u) => ({ ...u, rowCount: u.rows?.length ?? 0, rows: undefined })) });
});

adminMarketRouter.get('/uploads/:id', async (req, res) => {
  const u = await PriceUpload.findById(req.params.id).lean().catch(() => null);
  if (!u) throw notFound();
  res.json({ upload: u });
});

const range = z.object({ min: z.number().nonnegative().max(100000).nullable(), max: z.number().nonnegative().max(100000).nullable() });
const editSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  sourceUrl: z.string().max(500).optional().default(''),
  rows: z
    .array(
      z.object({
        rawName: z.string().max(200).default(''),
        line: z.string().max(1000).optional().default(''),
        commodity: z.string().nullable(),
        unitBn: z.string().max(40).default(''),
        today: range,
        weekAgo: range,
        monthAgo: range,
        yearAgo: range,
        confidence: z.number().min(0).max(1).default(1),
        include: z.boolean(),
      }),
    )
    .max(300),
});

adminMarketRouter.put('/uploads/:id', async (req, res) => {
  const body = parse(editSchema, req.body);
  const u = await PriceUpload.findById(req.params.id).catch(() => null);
  if (!u) throw notFound();
  if (u.status !== 'draft') throw badRequest('শুধু খসড়া সম্পাদনা করা যায়।');
  u.set({ reportDate: body.reportDate, sourceUrl: body.sourceUrl, rows: body.rows });
  await u.save();
  res.json({ upload: u });
});

adminMarketRouter.post('/uploads/:id/publish', async (req, res) => {
  const u = await PriceUpload.findById(req.params.id).catch(() => null);
  if (!u) throw notFound();
  if (u.status !== 'draft') throw badRequest('এটি আগেই প্রকাশিত বা বাতিল।');
  if (!u.reportDate) throw badRequest('প্রকাশের আগে প্রতিবেদনের তারিখ দিন।');
  if (u.reportDate > bdToday()) throw badRequest('ভবিষ্যতের তারিখে দর প্রকাশ করা যায় না।');
  const rows = (u.toObject().rows ?? []) as unknown as Parameters<typeof publishRows>[0]['rows'];
  const bad = rows.filter((r) => r.include && (!r.commodity || !COMMODITY_MAP.has(r.commodity)));
  if (bad.length) throw badRequest(`${bad.length}টি নির্বাচিত সারিতে পণ্য বাছাই করা হয়নি।`);
  const stats = await publishRows({ uploadId: u._id, reportDate: u.reportDate, rows, sourceUrl: u.sourceUrl || SOURCE.url });
  u.set({ status: 'published', publishedBy: req.user!.name, publishedAt: new Date() });
  await u.save();
  res.json({ ok: true, ...stats });
});

adminMarketRouter.post('/uploads/:id/discard', async (req, res) => {
  const u = await PriceUpload.findById(req.params.id).catch(() => null);
  if (!u) throw notFound();
  if (u.status === 'published') {
    // un-publishing removes the prices that came from this upload
    await Price.deleteMany({ uploadId: u._id });
  }
  u.set({ status: 'discarded' });
  await u.save();
  res.json({ ok: true });
});

export function mountMarket(api: Router) {
  api.use('/market', marketRouter);
  api.use('/admin/market', requireAdmin, adminMarketRouter);
}
