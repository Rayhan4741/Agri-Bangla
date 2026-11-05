import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models/User.js';
import { clearAuthCookie, requireAuth, setAuthCookie, signToken } from '../lib/auth.js';
import { HttpError, unauthorized } from '../lib/httpError.js';
import { parse } from '../lib/validate.js';

export const authRouter = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(8, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।').max(128),
});
const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(128) });

/** Only non-sensitive, size-limited preferences may be stored in a profile. */
export const profileSchema = z
  .object({
    districtId: z.string().max(60).nullable().optional(),
    upazilaId: z.string().max(60).nullable().optional(),
    language: z.enum(['bn', 'en']).optional(),
    cropIds: z.array(z.string().max(60)).max(40).optional(),
    cropStages: z.record(z.string().max(60), z.string().max(80)).optional(),
    favorites: z.array(z.string().max(120)).max(200).optional(),
    farmSizeDecimal: z.number().min(0).max(1_000_000).nullable().optional(),
  })
  .strict();

const publicUser = (u: { _id: unknown; name: string; email: string; role: string; profile?: unknown }) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  role: u.role,
  profile: u.profile ?? {},
});

authRouter.post('/register', authLimiter, async (req, res) => {
  const body = parse(registerSchema, req.body);
  if (await User.exists({ email: body.email })) throw new HttpError(409, 'EMAIL_TAKEN', 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে।');
  const user = await User.create({ name: body.name, email: body.email, passwordHash: await bcrypt.hash(body.password, 12), role: 'farmer' });
  setAuthCookie(res, signToken({ id: String(user._id), role: 'farmer', name: user.name }));
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const body = parse(loginSchema, req.body);
  const user = await User.findOne({ email: body.email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) throw unauthorized('ইমেইল বা পাসওয়ার্ড সঠিক নয়।');
  user.lastLoginAt = new Date();
  await user.save();
  setAuthCookie(res, signToken({ id: String(user._id), role: user.role as 'farmer' | 'admin', name: user.name }));
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get('/me', async (req, res) => {
  if (!req.user) return res.json({ user: null });
  const user = await User.findById(req.user.id).lean();
  if (!user) {
    clearAuthCookie(res);
    return res.json({ user: null });
  }
  res.json({ user: publicUser(user) });
});

authRouter.put('/me/profile', requireAuth, async (req, res) => {
  const profile = parse(profileSchema, req.body);
  const user = await User.findByIdAndUpdate(req.user!.id, { $set: { profile } }, { new: true }).lean();
  if (!user) throw unauthorized();
  res.json({ user: publicUser(user) });
});

authRouter.delete('/me', requireAuth, async (req, res) => {
  const { DiaryEntry } = await import('../models/Misc.js');
  await DiaryEntry.deleteMany({ userId: req.user!.id });
  await User.deleteOne({ _id: req.user!.id });
  clearAuthCookie(res);
  res.json({ ok: true });
});
