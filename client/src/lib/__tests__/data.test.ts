import { describe, expect, it } from 'vitest';
import {
  advisories,
  animals,
  calendarData,
  calculatorsData,
  cropCategories,
  crops,
  diseases,
  faqs,
  fertilizerGuides,
  fisheriesGuides,
  getResource,
  glossary,
  governmentResources,
  irrigationGuides,
  learningResources,
  marketData,
  weatherData,
} from '../data';
import { districts, upazilas } from '../geo';

const STATUSES = ['verified', 'link-checked', 'illustrative', 'unverified'];

function checkMeta(r: { sourceIds: string[]; verifyWithIds: string[]; lastVerified: string | null; dataStatus: string }, where: string) {
  expect(STATUSES, where).toContain(r.dataStatus);
  expect(Array.isArray(r.sourceIds), where).toBe(true);
  for (const id of [...r.sourceIds, ...r.verifyWithIds]) expect(getResource(id), `${where} → ${id}`).toBeTruthy();
  if (r.lastVerified !== null) expect(r.lastVerified, where).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  // illustrative content must never claim a verification date
  if (r.dataStatus === 'illustrative') expect(r.lastVerified, where).toBeNull();
}

describe('JSON schema consistency', () => {
  it('has unique ids everywhere', () => {
    for (const list of [crops, diseases, faqs, fertilizerGuides, irrigationGuides, fisheriesGuides, animals, governmentResources, glossary, learningResources, advisories, districts, upazilas, cropCategories]) {
      const ids = list.map((x: { id: string }) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('crops reference valid categories, diseases and guides', () => {
    const cat = new Set(cropCategories.map((c) => c.id));
    const dz = new Set(diseases.map((d) => d.id));
    const fg = new Set(fertilizerGuides.map((g) => g.id));
    const ig = new Set(irrigationGuides.map((g) => g.id));
    expect(crops.length).toBeGreaterThanOrEqual(30);
    for (const c of crops) {
      expect(cat.has(c.category), c.id).toBe(true);
      c.diseaseIds.forEach((d) => expect(dz.has(d), `${c.id}→${d}`).toBe(true));
      c.fertilizerGuideIds.forEach((d) => expect(fg.has(d), `${c.id}→${d}`).toBe(true));
      c.irrigationGuideIds.forEach((d) => expect(ig.has(d), `${c.id}→${d}`).toBe(true));
      expect(c.stages.length, c.id).toBeGreaterThan(0);
      checkMeta(c, c.id);
    }
  });

  it('diseases reference valid crops and carry safe guidance', () => {
    const cids = new Set(crops.map((c) => c.id));
    for (const d of diseases) {
      d.cropIds.forEach((c) => expect(cids.has(c), `${d.id}→${c}`).toBe(true));
      expect(d.safeNextStepsBn.length).toBeGreaterThan(0);
      expect(d.whenToSeekHelpBn).toBeTruthy();
      checkMeta(d, d.id);
    }
  });

  it('all guides, FAQs, lessons and advisories carry metadata', () => {
    [...fertilizerGuides, ...irrigationGuides, ...fisheriesGuides, ...animals, ...faqs, ...learningResources, ...advisories, ...weatherData.guides].forEach((g) => checkMeta(g, g.id));
  });

  it('weather risk rules point to existing guides', () => {
    const ids = new Set(weatherData.guides.map((g) => g.id));
    weatherData.riskRules.forEach((r) => expect(ids.has(r.guideId), r.id).toBe(true));
  });

  it('government resources have https URLs and dated checks', () => {
    for (const r of governmentResources) {
      expect(r.url).toMatch(/^https:\/\//);
      expect(r.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['verified', 'link-checked']).toContain(r.verificationStatus);
    }
  });

  it('market data is labelled as sample and internally consistent', () => {
    expect(marketData.noticeBn).toBe('এটি নমুনা তথ্য, বর্তমান বাজারদর নয়।');
    expect(marketData.dataStatus).toBe('illustrative');
    const m = new Set(marketData.markets.map((x) => x.id));
    const c = new Set(marketData.commodities.map((x) => x.id));
    for (const r of marketData.records) {
      expect(m.has(r.marketId)).toBe(true);
      expect(c.has(r.commodityId)).toBe(true);
      expect(r.priceBdtPerKg).toBeGreaterThan(0);
    }
  });

  it('calendar covers 12 months with valid crop references', () => {
    const cids = new Set(crops.map((c) => c.id));
    expect(calendarData.months.map((m) => m.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    calendarData.months.flatMap((m) => m.tasks).forEach((t) => t.cropId && expect(cids.has(t.cropId), t.id).toBe(true));
    calendarData.cropTimelines.forEach((t) => expect(cids.has(t.cropId)).toBe(true));
  });

  it('64 districts with coordinates inside Bangladesh; upazilas map to districts', () => {
    expect(districts.length).toBe(64);
    districts.forEach((d) => {
      expect(d.lat).toBeGreaterThan(20.5);
      expect(d.lat).toBeLessThan(26.7);
      expect(d.lon).toBeGreaterThan(88);
      expect(d.lon).toBeLessThan(92.8);
    });
    const ds = new Set(districts.map((d) => d.id));
    upazilas.forEach((u) => expect(ds.has(u.districtId), u.id).toBe(true));
  });

  it('calculator config is sane', () => {
    const acre = calculatorsData.landUnits.find((u) => u.id === 'acre')!;
    const dec = calculatorsData.landUnits.find((u) => u.id === 'decimal')!;
    expect(acre.sqm / dec.sqm).toBeCloseTo(100, 1);
    calculatorsData.fertilizerProducts.forEach((p) => Object.values(p.nutrients).forEach((f) => expect(f).toBeGreaterThan(0)));
  });

  it('quiz answers point to an existing option', () => {
    learningResources.forEach((l) => l.quiz.forEach((q) => expect(q.optionsBn[q.answerIndex]).toBeTruthy()));
  });
});
