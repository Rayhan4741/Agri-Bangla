import { describe, expect, it } from 'vitest';
import { checkNumber, convertArea, feedCost, fertilizerPlan, grossMargin, pondStocking, seedQuantity, totalCost } from '../calculators';
import { calculatorsData } from '../data';

const unit = (id: string) => calculatorsData.landUnits.find((u) => u.id === id)!;

describe('land conversion', () => {
  it('1 acre = 100 decimal', () => {
    const r = convertArea(1, unit('acre'), unit('decimal'));
    expect(r.ok && r.value).toBeCloseTo(100, 2);
  });
  it('1 hectare ≈ 2.471 acres', () => {
    const r = convertArea(1, unit('hectare'), unit('acre'));
    expect(r.ok && r.value).toBeCloseTo(2.471, 3);
  });
  it('default bigha (20 katha) ≈ 33 decimal', () => {
    const r = convertArea(1, unit('bigha'), unit('decimal'));
    expect(r.ok && r.value).toBeCloseTo(33.06, 1);
    const k = convertArea(1, unit('bigha'), unit('katha'));
    expect(k.ok && k.value).toBeCloseTo(20, 1);
  });
  it('supports a user-edited bigha size', () => {
    const custom = { ...unit('bigha'), sqm: 50 * unit('decimal').sqm };
    const r = convertArea(2, custom, unit('decimal'));
    expect(r.ok && r.value).toBeCloseTo(100, 4);
  });
  it('rejects negative values', () => {
    expect(convertArea(-1, unit('acre'), unit('decimal')).ok).toBe(false);
  });
  it('allows zero area', () => {
    const r = convertArea(0, unit('acre'), unit('decimal'));
    expect(r.ok && r.value).toBe(0);
  });
});

describe('validation helper', () => {
  it('flags NaN, negative and zero', () => {
    expect(checkNumber(NaN, 'x')).toBeTruthy();
    expect(checkNumber(-2, 'x')).toBeTruthy();
    expect(checkNumber(0, 'x')).toBeTruthy();
    expect(checkNumber(0, 'x', { allowZero: true })).toBeNull();
    expect(checkNumber(120, 'x', { max: 100 })).toBeTruthy();
  });
});

describe('seed quantity', () => {
  it('multiplies area by rate', () => {
    const r = seedQuantity({ areaHa: 0.5, rateKgPerHa: 40 });
    expect(r.ok && r.value.kg).toBeCloseTo(20);
  });
  it('adjusts for germination', () => {
    const r = seedQuantity({ areaHa: 1, rateKgPerHa: 40, germinationPct: 80 });
    expect(r.ok && r.value.kg).toBeCloseTo(50);
  });
  it('rejects germination above 100%', () => {
    expect(seedQuantity({ areaHa: 1, rateKgPerHa: 40, germinationPct: 120 }).ok).toBe(false);
  });
});

describe('fertilizer plan', () => {
  const products = calculatorsData.fertilizerProducts;
  it('converts nutrient need to product (urea 46% N)', () => {
    const r = fertilizerPlan({ areaHa: 1, nutrientKgPerHa: { N: 46 }, productFor: { N: 'urea' }, products });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.lines[0].kgTotal).toBeCloseTo(100);
  });
  it('credits DAP nitrogen against urea', () => {
    const r = fertilizerPlan({ areaHa: 1, nutrientKgPerHa: { N: 46, P: 20 }, productFor: { N: 'urea', P: 'dap' }, products });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const dap = r.value.lines.find((l) => l.productId === 'dap')!;
      const urea = r.value.lines.find((l) => l.productId === 'urea')!;
      expect(dap.kgPerHa).toBeCloseTo(100); // 20 / 0.20
      expect(urea.kgPerHa).toBeCloseTo((46 - 18) / 0.46); // DAP supplied 18 kg N
      expect(r.value.notes.length).toBe(1);
    }
  });
  it('scales by area', () => {
    const r = fertilizerPlan({ areaHa: 0.25, nutrientKgPerHa: { K: 50 }, productFor: { K: 'mop' }, products });
    expect(r.ok && r.value.lines[0].kgTotal).toBeCloseTo(25);
  });
  it('errors with no recommendation', () => {
    expect(fertilizerPlan({ areaHa: 1, nutrientKgPerHa: {}, productFor: {}, products }).ok).toBe(false);
  });
  it('errors when product lacks nutrient', () => {
    expect(fertilizerPlan({ areaHa: 1, nutrientKgPerHa: { K: 10 }, productFor: { K: 'urea' }, products }).ok).toBe(false);
  });
});

describe('costs and margins', () => {
  it('sums cost items', () => {
    const r = totalCost([
      { id: 'a', labelBn: 'বীজ', amount: 1000 },
      { id: 'b', labelBn: 'সার', amount: 2500.5 },
    ]);
    expect(r.ok && r.value).toBeCloseTo(3500.5);
  });
  it('rejects negative cost', () => {
    expect(totalCost([{ id: 'a', labelBn: 'বীজ', amount: -1 }]).ok).toBe(false);
  });
  it('computes margin, BCR and break-even', () => {
    const r = grossMargin({ yieldKg: 1000, priceBdtPerKg: 30, costBdt: 20000 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.revenue).toBe(30000);
      expect(r.value.margin).toBe(10000);
      expect(r.value.bcr).toBeCloseTo(1.5);
      expect(r.value.breakEvenPrice).toBeCloseTo(20);
      expect(r.value.breakEvenYield).toBeCloseTo(666.67, 1);
    }
  });
  it('handles zero yield without dividing by zero', () => {
    const r = grossMargin({ yieldKg: 0, priceBdtPerKg: 30, costBdt: 100 });
    expect(r.ok && r.value.breakEvenPrice).toBeNull();
  });
});

describe('feed and pond', () => {
  it('feed cost', () => {
    const r = feedCost({ animals: 3, kgPerAnimalPerDay: 2, days: 30, pricePerKg: 50 });
    expect(r.ok && r.value.totalKg).toBe(180);
    expect(r.ok && r.value.totalCost).toBe(9000);
  });
  it('rejects fractional animal count', () => {
    expect(feedCost({ animals: 2.5, kgPerAnimalPerDay: 2, days: 30, pricePerKg: 50 }).ok).toBe(false);
  });
  it('pond stocking splits by species', () => {
    const r = pondStocking({ areaDecimal: 33, perDecimal: 40, species: [{ nameBn: 'রুই', pct: 30 }, { nameBn: 'কাতলা', pct: 30 }, { nameBn: 'মৃগেল', pct: 40 }] });
    expect(r.ok && r.value.total).toBe(1320);
    expect(r.ok && r.value.bySpecies[2].count).toBe(528);
  });
  it('rejects species split not summing to 100', () => {
    expect(pondStocking({ areaDecimal: 10, perDecimal: 40, species: [{ nameBn: 'রুই', pct: 50 }] }).ok).toBe(false);
  });
});
