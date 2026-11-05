import { Router } from 'express';
import { z } from 'zod';
import { config, aiConfigured } from '../config.js';
import { notFound } from '../lib/httpError.js';
import { parse } from '../lib/validate.js';
import { Content } from '../models/Content.js';
import { Usage } from '../models/Misc.js';
import { Price, PriceUpload } from '../models/Price.js';
import { User } from '../models/User.js';

export const adminRouter = Router();

adminRouter.get('/stats', async (_req, res) => {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const [users, admins, content, statusAgg, prices, lastDaily, drafts, usage] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    Content.countDocuments(),
    Content.aggregate([{ $group: { _id: '$dataStatus', n: { $sum: 1 } } }]),
    Price.countDocuments({ kind: 'daily' }),
    Price.findOne({ kind: 'daily' }).sort({ date: -1 }).select('date').lean(),
    PriceUpload.countDocuments({ status: 'draft' }),
    Usage.find({ day: { $gte: since } }).sort({ day: 1 }).lean(),
  ]);
  res.json({
    users,
    admins,
    content,
    contentByStatus: Object.fromEntries(statusAgg.map((s: { _id: string; n: number }) => [s._id, s.n])),
    dailyPrices: prices,
    lastPriceDate: lastDaily?.date ?? null,
    draftUploads: drafts,
    usage,
    ai: { configured: aiConfigured(), model: config.GEMINI_API_KEY ? config.GEMINI_MODEL : config.FALLBACK_AI_MODEL || null },
    tcbAutofetch: config.TCB_AUTOFETCH,
  });
});

adminRouter.get('/users', async (_req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 }).limit(500).select('name email role createdAt lastLoginAt').lean();
  res.json({ users });
});

adminRouter.put('/users/:id/role', async (req, res) => {
  const { role } = parse(z.object({ role: z.enum(['farmer', 'admin']) }), req.body);
  if (req.params.id === req.user!.id && role !== 'admin') {
    const admins = await User.countDocuments({ role: 'admin' });
    if (admins <= 1) throw notFound('শেষ অ্যাডমিনের ভূমিকা পরিবর্তন করা যায় না।');
  }
  const u = await User.findByIdAndUpdate(req.params.id, { $set: { role } }, { new: true }).select('name email role').lean().catch(() => null);
  if (!u) throw notFound();
  res.json({ user: u });
});
