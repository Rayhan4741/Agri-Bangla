/**
 * E2E harness (not part of the app): real Express app + real content in memory,
 * no MongoDB, and a stubbed Gemini that streams a canned answer.
 * Run: npx tsx src/tests/helpers/demoServer.ts
 */
import mongoose from 'mongoose';
import { createApp } from '../../app.js';
import { __setFetch } from '../../lib/ai/types.js';
import { loadRealContent } from './bundle.js';

process.env.GEMINI_API_KEY ||= 'stub';
mongoose.set('bufferCommands', false);
loadRealContent();

const enc = new TextEncoder();
__setFetch((async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.includes(':streamGenerateContent')) {
    const parts = ['ধানের পাতা হলুদ হওয়ার কয়েকটি সাধারণ কারণ আছে — নাইট্রোজেনের ঘাটতি, ', 'জিংকের অভাব (খয়রা) বা ব্যাকটেরিয়াজনিত পাতা পোড়া রোগ [১][২]।\n\n', '১. পুরো জমির পাতা হালকা হলুদ হলে সাধারণত নাইট্রোজেনের ঘাটতি।\n২. পাতায় মরিচা রঙের দাগ থাকলে জিংকের অভাব হতে পারে।\n\n', 'নিশ্চিত হতে উপসহকারী কৃষি কর্মকর্তাকে দেখান।'];
    const stream = new ReadableStream({
      async start(c) {
        for (const p of parts) {
          await new Promise((r) => setTimeout(r, 350));
          c.enqueue(enc.encode(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: p }] } }] })}\r\n\r\n`));
        }
        c.close();
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
  }
  if (url.includes(':generateContent')) {
    const body = JSON.parse(String(init?.body ?? '{}'));
    const hasImage = JSON.stringify(body).includes('inline_data');
    const json = hasImage
      ? {
          imageQuality: 'good',
          cropSeenBn: 'ধান',
          summaryBn: 'পাতায় মাকু আকৃতির ধূসর-কেন্দ্রের দাগ দেখা যাচ্ছে, যা ব্লাস্ট রোগের সঙ্গে মেলে।',
          possibilities: [
            { nameBn: 'ধানের ব্লাস্ট', nameEn: 'Rice Blast', likelihood: 'high', reasonsBn: ['চোখ/মাকু আকৃতির দাগ', 'দাগের মাঝখান ধূসর'], checkBn: ['সকালে দাগের কিনারা বাদামি কিনা দেখুন', 'শিষের গোড়ায় কালো দাগ আছে কিনা দেখুন'] },
            { nameBn: 'বাদামি দাগ রোগ', nameEn: 'Brown Spot', likelihood: 'low', reasonsBn: ['কিছু ছোট বাদামি দাগ'], checkBn: ['দাগ গোল ও তিলের মতো কিনা দেখুন'] },
          ],
          safeStepsBn: ['আক্রান্ত পাতা তুলে নষ্ট করুন', 'ইউরিয়া উপরি-প্রয়োগ আপাতত বন্ধ রাখুন', 'ট্রাইসাইক্লাজল ০.৬ গ্রাম/লিটার পানিতে স্প্রে করুন'],
          seeExpertBn: 'দ্রুত উপজেলা কৃষি অফিসে যোগাযোগ করুন।',
        }
      : null;
    const text = json ? JSON.stringify(json) : 'ঠিক আছে।';
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }));
  }
  return new Response('not stubbed', { status: 502 });
}) as typeof fetch);

const port = Number(process.env.PORT ?? 5055);
createApp().listen(port, () => console.log(`demo server on http://localhost:${port}`));
