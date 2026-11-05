import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth.js';
import { notFound } from '../lib/httpError.js';
import { parse } from '../lib/validate.js';
import { DiaryEntry } from '../models/Misc.js';

export const diaryRouter = Router();
diaryRouter.use(requireAuth);

const entry = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: z.enum(['task', 'expense', 'note', 'income']),
  text: z.string().trim().min(1).max(500),
  amount: z.number().min(0).max(100_000_000).nullable().optional(),
  cropId: z.string().max(60).nullable().optional(),
  done: z.boolean().optional(),
  clientId: z.string().max(80).nullable().optional(),
});

diaryRouter.get('/', async (req, res) => {
  const items = await DiaryEntry.find({ userId: req.user!.id }).sort({ date: -1, createdAt: -1 }).limit(1000).lean();
  res.json({ items });
});

diaryRouter.post('/', async (req, res) => {
  const body = parse(entry, req.body);
  const count = await DiaryEntry.countDocuments({ userId: req.user!.id });
  if (count >= 5000) throw notFound('ডায়েরির সীমা পূর্ণ।');
  if (body.clientId) {
    // idempotent for synced entries
    const item = await DiaryEntry.findOneAndUpdate({ userId: req.user!.id, clientId: body.clientId }, { $set: { ...body, userId: req.user!.id } }, { upsert: true, new: true }).lean();
    return res.status(201).json({ item });
  }
  const item = await DiaryEntry.create({ ...body, userId: req.user!.id });
  res.status(201).json({ item });
});

diaryRouter.put('/:id', async (req, res) => {
  const body = parse(entry.partial(), req.body);
  const item = await DiaryEntry.findOneAndUpdate({ _id: req.params.id, userId: req.user!.id }, { $set: body }, { new: true })
    .lean()
    .catch(() => null);
  if (!item) throw notFound();
  res.json({ item });
});

diaryRouter.delete('/:id', async (req, res) => {
  const r = await DiaryEntry.deleteOne({ _id: req.params.id, userId: req.user!.id }).catch(() => null);
  if (!r?.deletedCount) throw notFound();
  res.json({ ok: true });
});
