import { Router } from 'express';
import { z } from 'zod';
import { Content, isContentType, isFileType } from '../models/Content.js';
import { requireAdmin } from '../lib/auth.js';
import { getBundle, invalidateBundle } from '../lib/contentStore.js';
import { badRequest, notFound } from '../lib/httpError.js';
import { parse } from '../lib/validate.js';
import { searchKnowledge } from '../lib/knowledge.js';

export const contentRouter = Router();

/** Everything the client needs in one cacheable response (≈60 KB gzipped). */
contentRouter.get('/bundle', async (req, res) => {
  const b = await getBundle();
  const etag = `"${b.version}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  if (req.headers['if-none-match'] === etag) return res.status(304).end();
  res.json(b);
});

contentRouter.get('/search', async (req, res) => {
  const q = String(req.query.q ?? '').slice(0, 200);
  if (q.trim().length < 2) return res.json({ results: [] });
  const hits = await searchKnowledge(q, { limit: 12 });
  res.json({ results: hits.map(({ doc, score }) => ({ ...doc, text: undefined, score })) });
});

contentRouter.get('/:type', async (req, res) => {
  const { type } = req.params as { type: string };
  if (!isContentType(type)) throw notFound('এই ধরনের তথ্য নেই।');
  const b = await getBundle();
  res.json({ type, data: b.files[type] ?? null });
});

contentRouter.get('/:type/:key', async (req, res) => {
  const { type, key } = req.params as { type: string; key: string };
  if (!isContentType(type)) throw notFound();
  const doc = await Content.findOne({ type, key }).lean();
  if (!doc) throw notFound();
  res.json({ type, key, data: doc.data, updatedAt: doc.updatedAt, updatedBy: doc.updatedBy });
});

const STATUS = z.enum(['verified', 'link-checked', 'illustrative', 'unverified']);
const recordSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/, 'id ছোট হাতের ইংরেজি অক্ষর, সংখ্যা ও - দিয়ে লিখুন'),
    dataStatus: STATUS.optional(),
    verificationStatus: STATUS.optional(),
    lastVerified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  })
  .passthrough();

/** Admin: create or replace one record. Body = the full record in its JSON-file shape. */
contentRouter.put('/:type/:key', requireAdmin, async (req, res) => {
  const { type, key } = req.params as { type: string; key: string };
  if (!isContentType(type)) throw notFound();
  let data: Record<string, unknown>;
  if (isFileType(type)) {
    if (key !== '_file') throw badRequest('এই ধরনের জন্য key হবে "_file"।');
    if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) throw badRequest('JSON অবজেক্ট দিন।');
    data = req.body as Record<string, unknown>;
  } else {
    data = parse(recordSchema, req.body);
    if (data.id !== key) throw badRequest('URL-এর key এবং রেকর্ডের id একই হতে হবে।');
  }
  const size = Buffer.byteLength(JSON.stringify(data));
  if (size > 400_000) throw badRequest('রেকর্ডটি খুব বড়।');
  const existing = await Content.findOne({ type, key }).select('order').lean();
  const order = existing?.order ?? (await Content.countDocuments({ type }));
  const status = (data.dataStatus ?? data.verificationStatus ?? 'illustrative') as string;
  await Content.updateOne(
    { type, key },
    { $set: { data, order, dataStatus: status, lastVerified: (data.lastVerified as string | null) ?? null, updatedBy: req.user!.name || req.user!.id } },
    { upsert: true },
  );
  invalidateBundle();
  res.json({ ok: true, type, key, created: !existing });
});

contentRouter.delete('/:type/:key', requireAdmin, async (req, res) => {
  const { type, key } = req.params as { type: string; key: string };
  if (!isContentType(type) || isFileType(type)) throw notFound();
  const r = await Content.deleteOne({ type, key });
  if (!r.deletedCount) throw notFound();
  invalidateBundle();
  res.json({ ok: true });
});
