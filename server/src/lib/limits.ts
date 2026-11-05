import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

const msg = (bn: string) => ({ error: { code: 'RATE_LIMITED', message: bn } });

/** Per-IP minute + day limits that keep the free AI quota from being exhausted by one user. */
export const chatLimits = [
  rateLimit({ windowMs: 60_000, limit: config.AI_CHAT_PER_MINUTE, standardHeaders: 'draft-7', legacyHeaders: false, message: msg('অনেক দ্রুত প্রশ্ন করা হচ্ছে। এক মিনিট পর আবার চেষ্টা করুন।') }),
  rateLimit({ windowMs: 24 * 3600_000, limit: config.AI_CHAT_PER_DAY, standardHeaders: false, legacyHeaders: false, message: msg('আজকের AI প্রশ্নের সীমা শেষ। আগামীকাল আবার চেষ্টা করুন বা অফলাইন উত্তর দেখুন।') }),
];
export const diagnoseLimits = [
  rateLimit({ windowMs: 60_000, limit: config.AI_DIAGNOSE_PER_MINUTE, standardHeaders: 'draft-7', legacyHeaders: false, message: msg('অনেক দ্রুত ছবি পাঠানো হচ্ছে। এক মিনিট পর চেষ্টা করুন।') }),
  rateLimit({ windowMs: 24 * 3600_000, limit: config.AI_DIAGNOSE_PER_DAY, standardHeaders: false, legacyHeaders: false, message: msg('আজকের ছবি বিশ্লেষণের সীমা শেষ।') }),
];
