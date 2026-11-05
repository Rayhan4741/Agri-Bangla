import mongoose from 'mongoose';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { loadConfig } from '../config.js';
import { stripDoses } from '../lib/ai/prompts.js';
import { extractJson, generateWithFallback, providerChain } from '../lib/ai/provider.js';
import { __setFetch, AiError } from '../lib/ai/types.js';
import { searchKnowledge } from '../lib/knowledge.js';
import { matchDisease } from '../routes/ai.js';
import { loadRealContent } from './helpers/bundle.js';

mongoose.set('bufferCommands', false); // no DB in these tests: DB calls fail fast and are handled

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];
function stubFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  calls = [];
  __setFetch((async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init: init ?? {} });
    return handler(url, init ?? {});
  }) as typeof fetch);
}
const sseBody = (chunks: string[]) =>
  new Response(chunks.map((t) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] } }] })}\r\n\r\n`).join(''), {
    headers: { 'Content-Type': 'text/event-stream' },
  });
const geminiJson = (text: string) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }), { headers: { 'Content-Type': 'application/json' } });

beforeAll(() => {
  loadRealContent();
});
afterEach(() => __setFetch(null));

describe('knowledge retrieval', () => {
  it('finds rice disease guides for a Bangla question', async () => {
    const hits = await searchKnowledge('আমার ধানের পাতা হলুদ হচ্ছে কেন', { cropId: 'aman-rice' });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.doc.kind === 'disease' || h.doc.kind === 'faq')).toBe(true);
  });
  it('does not confuse "yellow" (হলুদ) with the turmeric crop', async () => {
    const hits = await searchKnowledge('আমার ধানের পাতা হলুদ হচ্ছে কেন', { cropId: 'aman-rice' });
    expect(hits.map((h) => h.doc.id)).not.toContain('turmeric');
  });
  it('includes BRRI-sourced facts and their URLs for the AI', async () => {
    const hits = await searchKnowledge('ধানের ব্লাস্ট রোগ ঝড় বৃষ্টি');
    const blast = hits.find((h) => h.doc.id === 'rice-blast')!;
    expect(blast.doc.text).toContain('উৎস: বাংলাদেশ ধান গবেষণা ইনস্টিটিউট');
    expect(blast.doc.sourceUrls.some((u) => u.includes('brri.portal.gov.bd'))).toBe(true);
  });
  it('finds fish guidance', async () => {
    const hits = await searchKnowledge('পুকুরের মাছ পানির ওপরে ভাসছে');
    expect(hits[0].doc.kind === 'fisheries' || hits[0].doc.kind === 'faq').toBe(true);
  });
});

describe('Gemini adapter + fallback chain', () => {
  it('sends the key in a header (never in the URL), system prompt and contents', async () => {
    stubFetch(() => geminiJson('উত্তর'));
    const r = await generateWithFallback({ system: 'SYS', messages: [{ role: 'user', text: 'প্রশ্ন' }] });
    expect(r.text).toBe('উত্তর');
    expect(calls[0].url).toContain('/models/gemini-test-main:generateContent');
    expect(calls[0].url).not.toContain('test-key');
    expect((calls[0].init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-key');
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.system_instruction.parts[0].text).toBe('SYS');
    expect(body.contents[0]).toEqual({ role: 'user', parts: [{ text: 'প্রশ্ন' }] });
  });

  it('falls back to the second model on 429', async () => {
    stubFetch((url) => (url.includes('gemini-test-main') ? new Response('quota', { status: 429 }) : geminiJson('lite answer')));
    const r = await generateWithFallback({ system: 's', messages: [{ role: 'user', text: 'q' }] });
    expect(r.text).toBe('lite answer');
    expect(r.provider.model).toBe('gemini-test-lite');
  });

  it('does not retry on a safety block', async () => {
    stubFetch(() => new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } })));
    await expect(generateWithFallback({ system: 's', messages: [{ role: 'user', text: 'q' }] })).rejects.toMatchObject({ code: 'BLOCKED' });
    expect(calls.length).toBe(1);
  });

  it('reports NOT_CONFIGURED without keys', async () => {
    const empty = loadConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv);
    expect(providerChain(empty)).toHaveLength(0);
    await expect(generateWithFallback({ system: 's', messages: [{ role: 'user', text: 'q' }] }, empty)).rejects.toBeInstanceOf(AiError);
  });

  it('adds an OpenAI-compatible backup when configured', () => {
    const c = loadConfig({ NODE_ENV: 'test', GEMINI_API_KEY: 'k', FALLBACK_AI_BASE_URL: 'https://api.groq.com/openai/v1', FALLBACK_AI_API_KEY: 'g', FALLBACK_AI_MODEL: 'llama' } as NodeJS.ProcessEnv);
    expect(providerChain(c).map((p) => p.name)).toEqual(['Google Gemini', 'Google Gemini', 'OpenAI-compatible']);
    expect(providerChain(c, true).map((p) => p.name)).toEqual(['Google Gemini', 'Google Gemini']);
  });

  it('extracts JSON even with code fences', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here: {"a":2} ok')).toEqual({ a: 2 });
  });
});

describe('POST /api/ai/chat', () => {
  const app = createApp();

  it('streams SSE with sources from the knowledge base and puts context in the system prompt', async () => {
    stubFetch(() => sseBody(['ধানের পাতা হলুদ ', 'হওয়ার কারণ [১]।']));
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ messages: [{ role: 'user', text: 'আমার ধানের পাতা হলুদ হচ্ছে কেন?' }], cropId: 'aman-rice', districtId: 'rangpur' })
      .buffer(true)
      .parse((r, cb) => {
        let d = '';
        r.on('data', (c: Buffer) => (d += c.toString()));
        r.on('end', () => cb(null, d));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    const text = res.body as string;
    expect(text).toContain('event: meta');
    expect(text).toContain('"sources":[{"n":1');
    expect(text).toContain('হওয়ার কারণ');
    expect(text).toContain('event: done');
    const sent = JSON.parse(String(calls[0].init.body));
    const sys: string = sent.system_instruction.parts[0].text;
    expect(sys).toContain('কৃষকবন্ধু');
    expect(sys).toContain('জ্ঞানভান্ডার');
    expect(sys).toContain('আমন ধান');
    expect(calls[0].url).toContain(':streamGenerateContent?alt=sse');
  });

  it('never invents prices: tells the model none are published when the DB has none', async () => {
    stubFetch(() => geminiJson('দাম জানা নেই'));
    const res = await request(app).post('/api/ai/chat').send({ messages: [{ role: 'user', text: 'আজ আলুর দাম কত?' }], stream: false });
    expect(res.status).toBe(200);
    const sys: string = JSON.parse(String(calls[0].init.body)).system_instruction.parts[0].text;
    expect(sys).toMatch(/দাম বানিয়ে বলবে না/);
  });

  it('returns 503 AI_UNAVAILABLE JSON (not SSE) when every provider fails to start', async () => {
    stubFetch(() => new Response('bad key', { status: 401 }));
    const res = await request(app).post('/api/ai/chat').send({ messages: [{ role: 'user', text: 'প্রশ্ন' }] });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
  });

  it('validates input', async () => {
    const res = await request(app).post('/api/ai/chat').send({ messages: [] });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/ai/diagnose', () => {
  const app = createApp();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

  it('sends the image + candidates, returns structured possibilities matched to guides, strips doses', async () => {
    const ai = {
      imageQuality: 'good',
      cropSeenBn: 'ধান',
      summaryBn: 'পাতায় চোখের মতো দাগ',
      possibilities: [
        { nameBn: 'ধানের ব্লাস্ট', nameEn: 'Rice Blast', likelihood: 'high', reasonsBn: ['মাকু আকৃতির দাগ'], checkBn: ['দাগের মাঝখান ধূসর কিনা দেখুন'] },
        { nameBn: 'বাদামি দাগ', nameEn: 'Brown spot', likelihood: 'low', reasonsBn: ['ছোট বাদামি দাগ'], checkBn: [] },
      ],
      safeStepsBn: ['আক্রান্ত পাতা সরান', 'ট্রাইসাইক্লাজল ০.৬ গ্রাম/লিটার পানিতে স্প্রে করুন', 'ইউরিয়া উপরি-প্রয়োগ আপাতত বন্ধ রাখুন'],
      seeExpertBn: 'উপজেলা কৃষি অফিসে যোগাযোগ করুন',
    };
    stubFetch(() => geminiJson(JSON.stringify(ai)));
    const res = await request(app).post('/api/ai/diagnose').field('cropId', 'aman-rice').field('symptoms', 'পাতায় দাগ').attach('image', png, { filename: 'leaf.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.result.possibilities[0].nameEn).toBe('Rice Blast');
    expect(res.body.matches[0]?.diseaseId).toBe('rice-blast');
    expect(res.body.result.safeStepsBn.join(' ')).not.toContain('গ্রাম/লিটার');
    expect(res.body.dosesRemoved).toBe(true);
    const sent = JSON.parse(String(calls[0].init.body));
    expect(sent.contents[0].parts[1].inline_data.mime_type).toBe('image/png');
    expect(sent.generationConfig.response_mime_type).toBe('application/json');
    expect(sent.contents[0].parts[0].text).toContain('Rice Blast');
  });

  it('rejects non-images', async () => {
    const res = await request(app).post('/api/ai/diagnose').attach('image', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });
});

describe('safety helpers', () => {
  it('strips dose-like lines', () => {
    expect(stripDoses(['২ মিলি প্রতি লিটার পানিতে মিশিয়ে', 'আক্রান্ত গাছ তুলে ফেলুন', 'use 2 ml/L']).kept).toEqual(['আক্রান্ত গাছ তুলে ফেলুন']);
  });
  it('matches AI names to disease guides', () => {
    const ds = [
      { id: 'rice-blast', nameBn: 'ব্লাস্ট রোগ', nameEn: 'Rice Blast', cropIds: ['aman-rice'] },
      { id: 'late-blight', nameBn: 'নাবি ধসা', nameEn: 'Late Blight', cropIds: ['potato'] },
    ];
    expect(matchDisease({ nameEn: 'rice blast (Magnaporthe)', nameBn: '' }, ds)?.id).toBe('rice-blast');
    expect(matchDisease({ nameEn: 'Unknown', nameBn: 'অজানা' }, ds)).toBeNull();
  });
});

describe('weather proxy', () => {
  const app = createApp();
  it('restricts to Bangladesh coordinates and returns provider + retrieval time', async () => {
    stubFetch(() => new Response(JSON.stringify({ current: { temperature_2m: 30 } })));
    const bad = await request(app).get('/api/weather?lat=40&lon=-74');
    expect(bad.status).toBe(400);
    const ok = await request(app).get('/api/weather?lat=23.81&lon=90.41');
    expect(ok.status).toBe(200);
    expect(ok.body.provider.name).toBe('Open-Meteo');
    expect(ok.body.retrievedAt).toBeTruthy();
    expect(calls[0].url).toContain('timezone=Asia%2FDhaka');
  });
});
