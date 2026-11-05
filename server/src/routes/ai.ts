import { Router, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { config } from '../config.js';
import { CHAT_SYSTEM, DIAGNOSE_SCHEMA, DIAGNOSE_SYSTEM, stripDoses } from '../lib/ai/prompts.js';
import { extractJson, generateWithFallback, streamWithFallback } from '../lib/ai/provider.js';
import { AiError, type AiProvider } from '../lib/ai/types.js';
import { getList } from '../lib/contentStore.js';
import { badRequest } from '../lib/httpError.js';
import { isPriceQuestion, searchKnowledge, type Hit } from '../lib/knowledge.js';
import { chatLimits, diagnoseLimits } from '../lib/limits.js';
import { COMMODITIES } from '../lib/market/commodities.js';
import { latestPrices } from '../lib/market/service.js';
import { matchCommodity } from '../lib/market/tcbParser.js';
import { bdToday, cropSeasonBn } from '../lib/time.js';
import { toBnDigits } from '../lib/bn.js';
import { parse } from '../lib/validate.js';
import { countUsage } from '../models/Misc.js';

export const aiRouter = Router();

const chatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(16),
  cropId: z.string().max(60).optional().nullable(),
  districtId: z.string().max(60).optional().nullable(),
  stream: z.boolean().optional(),
});

const STATUS_BN: Record<string, string> = {
  verified: 'যাচাইকৃত তথ্য',
  'link-checked': 'উৎস-লিংক যাচাইকৃত',
  illustrative: 'নমুনা তথ্য (শিক্ষামূলক)',
  unverified: 'অযাচাইকৃত',
};

export interface SourceRef {
  n: number;
  id: string;
  kind: string;
  titleBn: string;
  href: string;
  dataStatus: string;
  sourceUrls: string[];
}

async function buildContext(question: string, cropId?: string | null, districtId?: string | null) {
  const hits: Hit[] = await searchKnowledge(question, { limit: 5, cropId: cropId ?? undefined });
  const sources: SourceRef[] = hits.map((h, i) => ({
    n: i + 1,
    id: h.doc.id,
    kind: h.doc.kind,
    titleBn: h.doc.titleBn,
    href: h.doc.href,
    dataStatus: h.doc.dataStatus,
    sourceUrls: h.doc.sourceUrls,
  }));
  const blocks = hits.map(
    (h, i) => `[${toBnDigits(i + 1)}] ${h.doc.titleBn} — (${STATUS_BN[h.doc.dataStatus] ?? h.doc.dataStatus}${h.doc.lastVerified ? `, যাচাই: ${h.doc.lastVerified}` : ''})\n${h.doc.text.slice(0, 1400)}`,
  );

  const today = bdToday();
  const ctx: string[] = [`আজকের তারিখ: ${today} (বাংলাদেশ সময়)। মৌসুম: ${cropSeasonBn(Number(today.slice(5, 7)))}।`];
  if (cropId) {
    const crop = (await getList<{ id: string; nameBn: string }>('crops')).find((c) => c.id === cropId);
    if (crop) ctx.push(`কৃষক যে ফসল বেছে নিয়েছেন: ${crop.nameBn}।`);
  }
  if (districtId) {
    const d = (await getList<{ id: string; nameBn: string; hazards?: string[] }>('districts')).find((x) => x.id === districtId);
    if (d) ctx.push(`কৃষকের জেলা: ${d.nameBn}।`);
  }

  let priceBlock = '';
  if (isPriceQuestion(question)) {
    const m = matchCommodity(question);
    const keys = m ? [m.commodity.key] : COMMODITIES.filter((c) => question.includes(c.nameBn.split(' ')[0])).map((c) => c.key);
    try {
      const rows = await latestPrices(keys.length ? keys : undefined);
      if (rows.length) {
        priceBlock =
          'আজকের TCB দর (ঢাকা মহানগরীর খুচরা বাজার, ট্রেডিং কর্পোরেশন অব বাংলাদেশ):\n' +
          rows
            .slice(0, 15)
            .map((r) => `- ${r.nameBn}: ${r.min ?? '?'}–${r.max ?? '?'} টাকা/${r.unitBn} (তারিখ ${r.date})`)
            .join('\n');
      } else priceBlock = 'আজকের TCB দর: ডাটাবেসে এখনও কোনো প্রকাশিত দর নেই — দাম বানিয়ে বলবে না।';
    } catch {
      priceBlock = 'আজকের TCB দর: এই মুহূর্তে পাওয়া যাচ্ছে না — দাম বানিয়ে বলবে না।';
    }
  }

  const system = [
    CHAT_SYSTEM,
    '\n--- প্রসঙ্গ ---',
    ctx.join('\n'),
    priceBlock,
    '\n--- জ্ঞানভান্ডার (কৃষিবাংলা ডাটাবেস) ---',
    blocks.length ? blocks.join('\n\n') : '(এই প্রশ্নের সঙ্গে মেলে এমন তথ্য পাওয়া যায়নি)',
  ]
    .filter(Boolean)
    .join('\n');
  return { system, sources };
}

function sse(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function aiErrorJson(res: Response, e: unknown) {
  if (e instanceof AiError) {
    const status = e.code === 'NOT_CONFIGURED' ? 503 : e.status;
    return res.status(status).json({ error: { code: e.code === 'NOT_CONFIGURED' ? 'AI_UNAVAILABLE' : e.code, message: e.message } });
  }
  throw e;
}

aiRouter.post('/chat', ...chatLimits, async (req, res) => {
  const body = parse(chatSchema, req.body);
  const last = body.messages[body.messages.length - 1];
  if (last.role !== 'user') throw badRequest('শেষ বার্তাটি ব্যবহারকারীর প্রশ্ন হতে হবে।');
  const prevUser = body.messages.filter((m) => m.role === 'user').slice(-2).map((m) => m.text).join(' ');
  const { system, sources } = await buildContext(prevUser, body.cropId, body.districtId);
  const opts = { system, messages: body.messages.slice(-10), temperature: 0.3, maxOutputTokens: 1400 };
  void countUsage('chat');

  if (body.stream === false) {
    try {
      const { text, provider } = await generateWithFallback(opts);
      return res.json({ text, sources, provider: provider.name, model: provider.model });
    } catch (e) {
      return aiErrorJson(res, e);
    }
  }

  let provider: AiProvider | null = null;
  const it = streamWithFallback(opts, config, (p) => (provider = p))[Symbol.asyncIterator]();
  let first: IteratorResult<string>;
  try {
    first = await it.next(); // fail with a normal JSON error before any SSE headers are sent
  } catch (e) {
    return aiErrorJson(res, e);
  }
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  sse(res, 'meta', { sources, provider: (provider as AiProvider | null)?.name, model: (provider as AiProvider | null)?.model });
  let closed = false;
  req.on('close', () => (closed = true));
  try {
    if (!first.done) sse(res, 'delta', { text: first.value });
    for (;;) {
      if (closed) break;
      const n = await it.next();
      if (n.done) break;
      sse(res, 'delta', { text: n.value });
    }
    sse(res, 'done', {});
  } catch (e) {
    sse(res, 'error', { message: e instanceof AiError ? e.message : 'উত্তর তৈরির সময় সমস্যা হয়েছে।' });
  }
  res.end();
});

// ── Photo diagnosis ──────────────────────────────────────────────────────────
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, IMAGE_TYPES.includes(file.mimetype)),
});

const diagSchema = z.object({
  cropId: z.string().max(60).optional().default(''),
  symptoms: z.string().max(600).optional().default(''),
  districtId: z.string().max(60).optional().default(''),
});

const resultSchema = z.object({
  imageQuality: z.enum(['good', 'unclear', 'not-a-plant']).catch('unclear'),
  cropSeenBn: z.string().optional().default(''),
  summaryBn: z.string().default(''),
  possibilities: z
    .array(
      z.object({
        nameBn: z.string().default(''),
        nameEn: z.string().default(''),
        likelihood: z.enum(['high', 'medium', 'low']).catch('low'),
        reasonsBn: z.array(z.string()).default([]),
        checkBn: z.array(z.string()).default([]),
      }),
    )
    .max(5)
    .default([]),
  safeStepsBn: z.array(z.string()).default([]),
  seeExpertBn: z.string().default(''),
});

type Disease = { id: string; nameBn: string; nameEn: string; cropIds: string[]; keywords?: string[] };
const simple = (s: string) => s.toLowerCase().replace(/[^a-zঀ-৿]+/g, ' ').trim();

export function matchDisease(p: { nameEn: string; nameBn: string }, diseases: Disease[], cropId?: string): Disease | null {
  const en = simple(p.nameEn);
  const bn = simple(p.nameBn);
  let best: { d: Disease; s: number } | null = null;
  for (const d of diseases) {
    let s = 0;
    const den = simple(d.nameEn);
    if (en && den && (en === den || en.includes(den) || den.includes(en))) s += 3;
    if (bn && d.nameBn && (bn.includes(simple(d.nameBn)) || simple(d.nameBn).includes(bn))) s += 2;
    if (!s) continue;
    if (cropId && d.cropIds?.includes(cropId)) s += 1;
    if (!best || s > best.s) best = { d, s };
  }
  return best?.d ?? null;
}

aiRouter.post('/diagnose', ...diagnoseLimits, upload.single('image'), async (req, res) => {
  if (!req.file) throw badRequest('JPG, PNG বা WEBP ছবি দিন (সর্বোচ্চ ৬ MB)।');
  const body = parse(diagSchema, req.body);
  const [diseases, crops] = await Promise.all([getList<Disease>('cropDiseases'), getList<{ id: string; nameBn: string; nameEn: string }>('crops')]);
  const crop = crops.find((c) => c.id === body.cropId);
  const candidates = (crop ? diseases.filter((d) => d.cropIds?.includes(crop.id)) : diseases).slice(0, 40);
  const userText = [
    crop ? `Crop selected by farmer: ${crop.nameEn} (${crop.nameBn}).` : 'Crop not specified.',
    body.symptoms ? `Farmer's notes (Bangla): ${body.symptoms}` : 'No notes.',
    `Month: ${bdToday().slice(0, 7)} in Bangladesh.`,
    `Candidate list (English name — Bangla name): ${candidates.map((d) => `${d.nameEn} — ${d.nameBn}`).join('; ')}`,
  ].join('\n');
  void countUsage('diagnose');
  try {
    const { text, provider } = await generateWithFallback({
      system: DIAGNOSE_SYSTEM,
      messages: [{ role: 'user', text: userText }],
      images: [{ mimeType: req.file.mimetype, base64: req.file.buffer.toString('base64') }],
      jsonSchema: DIAGNOSE_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 1600,
    });
    const result = resultSchema.parse(extractJson(text));
    const steps = stripDoses(result.safeStepsBn);
    result.safeStepsBn = steps.kept;
    result.possibilities = result.possibilities.slice(0, 3).map((p) => ({ ...p, checkBn: stripDoses(p.checkBn).kept }));
    const matches = result.possibilities.map((p) => {
      const d = matchDisease(p, diseases, body.cropId || undefined);
      return d ? { diseaseId: d.id, href: `/diseases?d=${d.id}` } : null;
    });
    res.json({
      result,
      matches,
      provider: provider.name,
      model: provider.model,
      dosesRemoved: steps.removed > 0,
      disclaimerBn: 'এটি AI-এর সম্ভাব্য অনুমান, নিশ্চিত রোগ নির্ণয় নয়। ছবি ও তথ্যের মান অনুযায়ী ভুল হতে পারে। নিশ্চিত হতে উপজেলা কৃষি অফিসার বা উপ-সহকারী কৃষি কর্মকর্তার পরামর্শ নিন।',
    });
  } catch (e) {
    return aiErrorJson(res, e);
  }
  // the image buffer is dropped here; photos are not stored
});
