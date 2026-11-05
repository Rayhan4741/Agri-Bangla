/**
 * Full API tests against a real MongoDB.
 * Uses MONGO_TEST_URI if set, otherwise starts mongodb-memory-server (downloads a mongod
 * binary on first run). If neither is possible, the suite is skipped with a message.
 */
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { invalidateBundle } from '../lib/contentStore.js';
import { Content } from '../models/Content.js';
import { User } from '../models/User.js';
import { readSeedDocs } from '../scripts/seed.js';

let stop: (() => Promise<void>) | null = null;
let available = false;

beforeAll(async () => {
  try {
    let uri = process.env.MONGO_TEST_URI;
    if (!uri) {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const m = await MongoMemoryServer.create();
      uri = m.getUri('agribangla-test');
      stop = async () => {
        await m.stop();
      };
    }
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    await mongoose.connection.db!.dropDatabase();
    await Content.insertMany(readSeedDocs().map((d) => ({ ...d, dataStatus: (d.data.dataStatus as string) ?? 'illustrative' })));
    await User.syncIndexes();
    await User.create({ name: 'Admin', email: 'admin@example.com', role: 'admin', passwordHash: await bcrypt.hash('admin-password-123', 10) });
    invalidateBundle();
    available = true;
  } catch (e) {
    console.warn(`\n[db.integration] skipped — no MongoDB available (${(e as Error).message.split('\n')[0]}).\n  Set MONGO_TEST_URI=mongodb://127.0.0.1:27017/agribangla-test to run against a local server.\n`);
  }
}, 180_000);

afterAll(async () => {
  if (available) await mongoose.disconnect();
  await stop?.();
});

const app = createApp();
const agent = () => request.agent(app);

describe('with MongoDB', () => {
  it('serves the seeded content bundle with an ETag', async (ctx) => {
    if (!available) return ctx.skip();
    const r = await request(app).get('/api/content/bundle');
    expect(r.status).toBe(200);
    expect(r.body.files.crops.length).toBeGreaterThan(20);
    expect(r.body.files.weatherGuides.guides.length).toBeGreaterThan(0);
    const again = await request(app).get('/api/content/bundle').set('If-None-Match', r.headers.etag);
    expect(again.status).toBe(304);
  });

  it('registers, logs in with an httpOnly cookie, saves a profile, rejects bad profile fields', async (ctx) => {
    if (!available) return ctx.skip();
    const a = agent();
    const reg = await a.post('/api/auth/register').send({ name: 'রহিম', email: 'rahim@example.com', password: 'secret-pass-1' });
    expect(reg.status).toBe(201);
    expect(String(reg.headers['set-cookie'])).toMatch(/ab_token=.*HttpOnly/i);
    const dup = await request(app).post('/api/auth/register').send({ name: 'x y', email: 'rahim@example.com', password: 'secret-pass-1' });
    expect(dup.status).toBe(409);
    expect((await a.get('/api/auth/me')).body.user.email).toBe('rahim@example.com');
    const p = await a.put('/api/auth/me/profile').send({ districtId: 'rangpur', cropIds: ['aman-rice'] });
    expect(p.body.user.profile.districtId).toBe('rangpur');
    expect((await a.put('/api/auth/me/profile').send({ password: 'x' })).status).toBe(400);
    expect((await request(app).post('/api/auth/login').send({ email: 'rahim@example.com', password: 'wrong' })).status).toBe(401);
  });

  it('keeps diary entries private to their owner', async (ctx) => {
    if (!available) return ctx.skip();
    const a = agent();
    await a.post('/api/auth/register').send({ name: 'করিম', email: 'karim@example.com', password: 'secret-pass-2' });
    const e = await a.post('/api/diary').send({ date: '2026-10-30', kind: 'expense', text: 'ইউরিয়া কেনা', amount: 900 });
    expect(e.status).toBe(201);
    const b = agent();
    await b.post('/api/auth/register').send({ name: 'অন্য', email: 'other@example.com', password: 'secret-pass-3' });
    expect((await b.get('/api/diary')).body.items).toHaveLength(0);
    expect((await b.delete(`/api/diary/${e.body.item._id}`)).status).toBe(404);
    expect((await request(app).get('/api/diary')).status).toBe(401);
  });

  it('only admins can edit content; edits appear in the bundle', async (ctx) => {
    if (!available) return ctx.skip();
    const farmer = agent();
    await farmer.post('/api/auth/login').send({ email: 'rahim@example.com', password: 'secret-pass-1' });
    const crop = (await request(app).get('/api/content/crops')).body.data[0];
    expect((await farmer.put(`/api/content/crops/${crop.id}`).send(crop)).status).toBe(403);
    const admin = agent();
    await admin.post('/api/auth/login').send({ email: 'admin@example.com', password: 'admin-password-123' });
    const edited = { ...crop, descriptionBn: 'সম্পাদিত বিবরণ', dataStatus: 'verified', lastVerified: '2026-10-30' };
    expect((await admin.put(`/api/content/crops/${crop.id}`).send(edited)).status).toBe(200);
    const b = await request(app).get('/api/content/bundle');
    expect(b.body.files.crops.find((c: { id: string }) => c.id === crop.id).descriptionBn).toBe('সম্পাদিত বিবরণ');
    expect((await admin.put(`/api/content/crops/${crop.id}`).send({ ...edited, id: 'other' })).status).toBe(400);
  });

  it('TCB flow: upload pasted report → review → publish → latest + history with reference points', async (ctx) => {
    if (!available) return ctx.skip();
    const admin = agent();
    await admin.post('/api/auth/login').send({ email: 'admin@example.com', password: 'admin-password-123' });
    // SYNTHETIC test values
    const text = 'তারিখ: ২৮/১০/২০২৬\nচাল মোটা প্রতি কেজি ৫০-৫৫ ৪৯-৫৪ ৫০-৫৬ ৪৮-৫২ -০.৯৪ +৫.০০\nআলু প্রতি কেজি ২৫-৩০ ২৫-৩০ ২৮-৩২ ২০-২২ -৮.৩৩ +২৬.১৯';
    const up = await admin.post('/api/admin/market/uploads').field('text', text);
    expect(up.status).toBe(201);
    const u = up.body.upload;
    expect(u.reportDate).toBe('2026-10-28');
    expect(u.rows).toHaveLength(2);
    // farmer cannot publish
    const farmer = agent();
    await farmer.post('/api/auth/login').send({ email: 'rahim@example.com', password: 'secret-pass-1' });
    expect((await farmer.post(`/api/admin/market/uploads/${u._id}/publish`)).status).toBe(403);
    // admin edits one value, then publishes
    u.rows[0].today.max = 56;
    expect((await admin.put(`/api/admin/market/uploads/${u._id}`).send({ reportDate: u.reportDate, sourceUrl: 'https://tcb.gov.bd/', rows: u.rows })).status).toBe(200);
    const pub = await admin.post(`/api/admin/market/uploads/${u._id}/publish`);
    expect(pub.body).toMatchObject({ ok: true, daily: 2, reference: 6 });
    const latest = await request(app).get('/api/market/latest');
    const rice = latest.body.items.find((i: { commodity: string }) => i.commodity === 'rice-coarse');
    expect(rice).toMatchObject({ date: '2026-10-28', min: 50, max: 56 });
    expect(rice.change.year).not.toBeNull();
    const h = await request(app).get('/api/market/history?commodity=potato&from=2025-01-01&to=2026-12-31');
    expect(h.body.points.map((p: { kind: string }) => p.kind)).toEqual(['reference', 'reference', 'reference', 'daily']);
    // a later daily upload overrides the reference point on the same date
    const up2 = await admin.post('/api/admin/market/uploads').field('text', 'তারিখ: ২১/১০/২০২৬\nআলু প্রতি কেজি ২৬-৩০ ২৫-৩০ ২৮-৩২ ২০-২২ -৮ +২৬');
    await admin.post(`/api/admin/market/uploads/${up2.body.upload._id}/publish`);
    const h2 = await request(app).get('/api/market/history?commodity=potato&from=2026-10-20&to=2026-10-22');
    expect(h2.body.points).toEqual([expect.objectContaining({ date: '2026-10-21', min: 26, kind: 'daily' })]);
    // discarding a published upload removes its prices
    await admin.post(`/api/admin/market/uploads/${up2.body.upload._id}/discard`);
    const h3 = await request(app).get('/api/market/history?commodity=potato&from=2026-10-20&to=2026-10-22');
    expect(h3.body.points[0]?.kind).toBe('reference');
  });

  it('refuses future dates and unmapped rows', async (ctx) => {
    if (!available) return ctx.skip();
    const admin = agent();
    await admin.post('/api/auth/login').send({ email: 'admin@example.com', password: 'admin-password-123' });
    const up = await admin.post('/api/admin/market/uploads').field('text', 'তারিখ: ০১/০১/২০৯৯\nঅজানা পণ্য প্রতি কেজি ১০-১২ ১০-১২ ১০-১২ ১০-১২ ০ ০');
    const u = up.body.upload;
    u.rows[0].include = true;
    await admin.put(`/api/admin/market/uploads/${u._id}`).send({ reportDate: '2099-01-01', rows: u.rows });
    expect((await admin.post(`/api/admin/market/uploads/${u._id}/publish`)).status).toBe(400);
  });

  it('admin stats', async (ctx) => {
    if (!available) return ctx.skip();
    const admin = agent();
    await admin.post('/api/auth/login').send({ email: 'admin@example.com', password: 'admin-password-123' });
    const s = await admin.get('/api/admin/stats');
    expect(s.status).toBe(200);
    expect(s.body.content).toBeGreaterThan(100);
    expect(s.body.dailyPrices).toBeGreaterThanOrEqual(2);
  });
});
