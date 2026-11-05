/**
 * Pure calculator functions (no UI). Every function validates its inputs and
 * returns either a result or a Bangla error message. No agronomic rates are
 * built in — users supply recommendations themselves.
 */
import type { FertilizerProduct, LandUnit } from '@/types';

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string): Result<never> => ({ ok: false, error });
const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export function checkNumber(n: number, label: string, opts: { allowZero?: boolean; max?: number } = {}): string | null {
  if (!Number.isFinite(n)) return `${label} সঠিক সংখ্যায় লিখুন।`;
  if (n < 0) return `${label} ঋণাত্মক হতে পারে না।`;
  if (n === 0 && !opts.allowZero) return `${label} শূন্যের বেশি হতে হবে।`;
  if (opts.max !== undefined && n > opts.max) return `${label} সর্বোচ্চ ${opts.max} হতে পারে।`;
  return null;
}

/* ---------------- land area ---------------- */

export function toSqm(value: number, unit: LandUnit): number {
  return value * unit.sqm;
}

export function convertArea(value: number, from: LandUnit, to: LandUnit): Result<number> {
  const e = checkNumber(value, 'জমির পরিমাণ', { allowZero: true }) ?? checkNumber(from.sqm, `${from.nameBn}-এর মাপ`) ?? checkNumber(to.sqm, `${to.nameBn}-এর মাপ`);
  if (e) return fail(e);
  return ok((value * from.sqm) / to.sqm);
}

export function toHectare(value: number, unit: LandUnit): number {
  return (value * unit.sqm) / 10000;
}

/* ---------------- seed ---------------- */

export interface SeedInput {
  areaHa: number;
  rateKgPerHa: number;
  germinationPct?: number; // optional adjustment; 100 = no adjustment
}

export function seedQuantity(i: SeedInput): Result<{ kg: number; adjusted: boolean }> {
  const e = checkNumber(i.areaHa, 'জমির পরিমাণ') ?? checkNumber(i.rateKgPerHa, 'বীজ হার');
  if (e) return fail(e);
  let kg = i.areaHa * i.rateKgPerHa;
  let adjusted = false;
  if (i.germinationPct !== undefined && Number.isFinite(i.germinationPct) && i.germinationPct !== 100) {
    const g = checkNumber(i.germinationPct, 'অঙ্কুরোদগম হার', { max: 100 });
    if (g) return fail(g);
    kg = kg * (100 / i.germinationPct);
    adjusted = true;
  }
  return ok({ kg, adjusted });
}

/* ---------------- fertilizer ---------------- */

export type Nutrient = 'N' | 'P' | 'K' | 'S' | 'Zn' | 'B';
export const NUTRIENT_BN: Record<Nutrient, string> = { N: 'নাইট্রোজেন (N)', P: 'ফসফরাস (P)', K: 'পটাশিয়াম (K)', S: 'সালফার (S)', Zn: 'দস্তা (Zn)', B: 'বোরন (B)' };

export interface FertilizerInput {
  areaHa: number;
  /** user-supplied recommendation in kg of nutrient per hectare */
  nutrientKgPerHa: Partial<Record<Nutrient, number>>;
  /** product chosen to supply each nutrient */
  productFor: Partial<Record<Nutrient, string>>;
  products: FertilizerProduct[];
}

export interface FertilizerLine {
  productId: string;
  nameBn: string;
  kgTotal: number;
  kgPerHa: number;
  supplies: string;
}

/**
 * Converts nutrient requirements into product quantities.
 * If a multi-nutrient product (e.g. DAP) supplies P, its nitrogen is credited
 * against the N requirement before urea is calculated.
 */
export function fertilizerPlan(i: FertilizerInput): Result<{ lines: FertilizerLine[]; notes: string[] }> {
  const e = checkNumber(i.areaHa, 'জমির পরিমাণ');
  if (e) return fail(e);
  const entries = Object.entries(i.nutrientKgPerHa).filter(([, v]) => v !== undefined && !Number.isNaN(v)) as [Nutrient, number][];
  if (entries.length === 0) return fail('অন্তত একটি পুষ্টি উপাদানের সুপারিশকৃত মাত্রা লিখুন।');
  for (const [n, v] of entries) {
    const err = checkNumber(v, NUTRIENT_BN[n], { allowZero: true });
    if (err) return fail(err);
  }
  const req: Partial<Record<Nutrient, number>> = Object.fromEntries(entries);
  const notes: string[] = [];
  const lines: FertilizerLine[] = [];
  const getP = (id?: string) => i.products.find((p) => p.id === id);

  // Order: multi-nutrient sources first so their extra nutrients can be credited
  const order: Nutrient[] = ['P', 'K', 'S', 'Zn', 'B', 'N'];
  const remaining = { ...req };
  for (const n of order) {
    const need = remaining[n];
    if (!need) continue;
    const product = getP(i.productFor[n]);
    if (!product) return fail(`${NUTRIENT_BN[n]}-এর জন্য একটি সার নির্বাচন করুন।`);
    const frac = product.nutrients[n];
    if (!frac || frac <= 0) return fail(`${product.nameBn}-এ ${NUTRIENT_BN[n]} নেই—অন্য সার বাছুন।`);
    const kgPerHa = need / frac;
    // credit other nutrients this product supplies
    for (const [other, f] of Object.entries(product.nutrients) as [Nutrient, number][]) {
      if (other === n || !remaining[other]) continue;
      const supplied = kgPerHa * f;
      const before = remaining[other]!;
      remaining[other] = Math.max(0, before - supplied);
      notes.push(`${product.nameBn} থেকে প্রায় ${supplied.toFixed(1)} কেজি/হেক্টর ${NUTRIENT_BN[other]} পাওয়া যায়, তাই সেটি বাদ দিয়ে হিসাব করা হয়েছে।`);
    }
    remaining[n] = 0;
    lines.push({ productId: product.id, nameBn: product.nameBn, kgPerHa, kgTotal: kgPerHa * i.areaHa, supplies: NUTRIENT_BN[n] });
  }
  return ok({ lines, notes });
}

/* ---------------- cost & margin ---------------- */

export interface CostItem {
  id: string;
  labelBn: string;
  amount: number;
}

export function totalCost(items: CostItem[]): Result<number> {
  for (const it of items) {
    const e = checkNumber(it.amount, it.labelBn || 'খরচ', { allowZero: true });
    if (e) return fail(e);
  }
  return ok(items.reduce((s, it) => s + it.amount, 0));
}

export interface MarginInput {
  yieldKg: number;
  priceBdtPerKg: number;
  costBdt: number;
}

export interface MarginResult {
  revenue: number;
  margin: number;
  bcr: number | null;
  breakEvenPrice: number | null;
  breakEvenYield: number | null;
  costPerKg: number | null;
}

export function grossMargin(i: MarginInput): Result<MarginResult> {
  const e = checkNumber(i.yieldKg, 'ফলন', { allowZero: true }) ?? checkNumber(i.priceBdtPerKg, 'দাম', { allowZero: true }) ?? checkNumber(i.costBdt, 'মোট খরচ', { allowZero: true });
  if (e) return fail(e);
  const revenue = i.yieldKg * i.priceBdtPerKg;
  return ok({
    revenue,
    margin: revenue - i.costBdt,
    bcr: i.costBdt > 0 ? revenue / i.costBdt : null,
    breakEvenPrice: i.yieldKg > 0 ? i.costBdt / i.yieldKg : null,
    breakEvenYield: i.priceBdtPerKg > 0 ? i.costBdt / i.priceBdtPerKg : null,
    costPerKg: i.yieldKg > 0 ? i.costBdt / i.yieldKg : null,
  });
}

/* ---------------- feed ---------------- */

export interface FeedInput {
  animals: number;
  kgPerAnimalPerDay: number;
  days: number;
  pricePerKg: number;
}

export function feedCost(i: FeedInput): Result<{ totalKg: number; totalCost: number; perAnimalPerDay: number }> {
  const e =
    checkNumber(i.animals, 'পশুর সংখ্যা') ??
    (Number.isInteger(i.animals) ? null : 'পশুর সংখ্যা পূর্ণসংখ্যা হতে হবে।') ??
    checkNumber(i.kgPerAnimalPerDay, 'দৈনিক খাবার') ??
    checkNumber(i.days, 'দিন') ??
    checkNumber(i.pricePerKg, 'খাবারের দাম', { allowZero: true });
  if (e) return fail(e);
  const totalKg = i.animals * i.kgPerAnimalPerDay * i.days;
  return ok({ totalKg, totalCost: totalKg * i.pricePerKg, perAnimalPerDay: i.kgPerAnimalPerDay * i.pricePerKg });
}

/* ---------------- pond stocking ---------------- */

export interface StockingInput {
  areaDecimal: number;
  perDecimal: number;
  species: { nameBn: string; pct: number }[];
}

export function pondStocking(i: StockingInput): Result<{ total: number; bySpecies: { nameBn: string; count: number }[] }> {
  const e = checkNumber(i.areaDecimal, 'পুকুরের আয়তন') ?? checkNumber(i.perDecimal, 'প্রতি শতাংশে পোনা');
  if (e) return fail(e);
  const total = Math.round(i.areaDecimal * i.perDecimal);
  const species = i.species.filter((s) => s.nameBn.trim() && s.pct > 0);
  if (species.length) {
    const sum = species.reduce((s, x) => s + x.pct, 0);
    if (Math.abs(sum - 100) > 0.5) return fail(`প্রজাতির শতাংশের যোগফল ১০০ হতে হবে (এখন ${sum.toFixed(0)})।`);
  }
  return ok({ total, bySpecies: species.map((s) => ({ nameBn: s.nameBn, count: Math.round((total * s.pct) / 100) })) });
}
