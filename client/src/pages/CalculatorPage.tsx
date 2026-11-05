import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calculator, Info, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Notice, PageHeader } from '@/components/common/ui';
import { NumField, ResultBox, SelectField, UnitOptions, useLandUnits } from '@/components/calculators/fields';
import { calculatorsData } from '@/lib/data';
import { convertArea, feedCost, fertilizerPlan, grossMargin, NUTRIENT_BN, pondStocking, seedQuantity, toHectare, totalCost, type Nutrient } from '@/lib/calculators';
import { formatBn, formatTaka, parseNumber } from '@/lib/formatting';
import { STORE_KEYS, useStored } from '@/hooks/useStored';
import { cn } from '@/lib/cn';

const n = (s: string) => parseNumber(s);
const AREA_UNITS = ['decimal', 'bigha', 'katha', 'acre', 'hectare'];

function LandCalc() {
  const { units, custom, setCustom, get } = useLandUnits();
  const [v, setV] = useState('1');
  const [from, setFrom] = useState('bigha');
  const value = n(v);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="জমির পরিমাণ" value={v} onChange={setV} />
          <SelectField label="একক" value={from} onChange={setFrom}>
            <UnitOptions units={units} />
          </SelectField>
        </div>
        <div className="rounded-2xl bg-cream p-4">
          <p className="mb-2 font-semibold">আপনার এলাকার মাপ</p>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="১ বিঘা = কত শতাংশ?" value={custom.bighaDecimal ? String(custom.bighaDecimal) : ''} placeholder="ডিফল্ট ≈ ৩৩.০৬" onChange={(s) => setCustom({ ...custom, bighaDecimal: Math.max(0, n(s) || 0) })} />
            <NumField label="১ কাঠা = কত শতাংশ?" value={custom.kathaDecimal ? String(custom.kathaDecimal) : ''} placeholder="ডিফল্ট ≈ ১.৬৫" onChange={(s) => setCustom({ ...custom, kathaDecimal: Math.max(0, n(s) || 0) })} />
          </div>
          <p className="mt-2 text-xs text-ink-soft">{calculatorsData.landUnits.find((u) => u.id === 'bigha')?.noteBn}</p>
        </div>
      </div>
      <ResultBox error={Number.isFinite(value) && value < 0 ? 'জমির পরিমাণ ঋণাত্মক হতে পারে না।' : null}>
        {Number.isFinite(value) && value >= 0 && (
          <ul className="divide-y divide-forest/5">
            {units
              .filter((u) => u.id !== from)
              .map((u) => {
                const r = convertArea(value, get(from), u);
                return (
                  <li key={u.id} className="flex items-baseline justify-between py-2">
                    <span className="text-ink-soft">{u.nameBn}</span>
                    <strong className="text-xl text-forest">{r.ok ? formatBn(r.value, r.value < 10 ? 3 : 2) : '—'}</strong>
                  </li>
                );
              })}
          </ul>
        )}
      </ResultBox>
    </div>
  );
}

function AreaInput({ area, setArea, unit, setUnit, label = 'জমির পরিমাণ' }: { area: string; setArea: (s: string) => void; unit: string; setUnit: (s: string) => void; label?: string }) {
  const { units } = useLandUnits();
  return (
    <div className="grid grid-cols-2 gap-3">
      <NumField label={label} value={area} onChange={setArea} />
      <SelectField label="একক" value={unit} onChange={setUnit}>
        <UnitOptions units={units} only={AREA_UNITS} />
      </SelectField>
    </div>
  );
}

function SeedCalc() {
  const { get, units } = useLandUnits();
  const [area, setArea] = useState('');
  const [unit, setUnit] = useState('bigha');
  const [rate, setRate] = useState('');
  const [rateUnit, setRateUnit] = useState('hectare');
  const [germ, setGerm] = useState('');
  const ha = toHectare(n(area), get(unit));
  const rateHa = n(rate) / toHectare(1, get(rateUnit));
  const r = area && rate ? seedQuantity({ areaHa: ha, rateKgPerHa: rateHa, germinationPct: germ ? n(germ) : undefined }) : null;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <AreaInput area={area} setArea={setArea} unit={unit} setUnit={setUnit} />
        <div className="grid grid-cols-2 gap-3">
          <NumField label="সুপারিশকৃত বীজ হার" value={rate} onChange={setRate} suffix="কেজি" hint="প্যাকেট বা কৃষি অফিস থেকে" />
          <SelectField label="প্রতি" value={rateUnit} onChange={setRateUnit}>
            <UnitOptions units={units} only={AREA_UNITS} />
          </SelectField>
        </div>
        <NumField label="অঙ্কুরোদগম হার (ঐচ্ছিক)" value={germ} onChange={setGerm} suffix="%" hint="জানা থাকলে দিন; না দিলে সমন্বয় হবে না" />
      </div>
      <ResultBox error={r && !r.ok ? r.error : null}>
        {r?.ok && (
          <>
            <p className="text-ink-soft">মোট বীজ লাগবে প্রায়</p>
            <p className="text-4xl font-bold text-forest">{formatBn(r.value.kg, 2)} <span className="text-xl">কেজি</span></p>
            <p className="mt-1 text-sm text-ink-soft">= {formatBn(r.value.kg * 1000, 0)} গ্রাম {r.value.adjusted && '· অঙ্কুরোদগম হার অনুযায়ী সমন্বয় করা হয়েছে'}</p>
          </>
        )}
      </ResultBox>
    </div>
  );
}

const DEFAULT_PRODUCT: Record<Nutrient, string> = { N: 'urea', P: 'tsp', K: 'mop', S: 'gypsum', Zn: 'znso4-mono', B: 'boric-acid' };

function FertilizerCalc() {
  const { get, units } = useLandUnits();
  const products = calculatorsData.fertilizerProducts;
  const [mode, setMode] = useState<'product' | 'nutrient'>('product');
  const [area, setArea] = useState('');
  const [unit, setUnit] = useState('bigha');
  const [basis, setBasis] = useState('hectare');
  const [prod, setProd] = useState<Record<string, string>>({});
  const [nut, setNut] = useState<Partial<Record<Nutrient, string>>>({});
  const [choice, setChoice] = useState<Record<Nutrient, string>>(DEFAULT_PRODUCT);
  const areaHa = toHectare(n(area), get(unit));
  const basisHa = toHectare(1, get(basis));
  const areaOk = area.trim() !== '' && Number.isFinite(areaHa) && areaHa > 0;

  const nutrientResult = useMemo(() => {
    if (mode !== 'nutrient' || !areaOk) return null;
    const perHa: Partial<Record<Nutrient, number>> = {};
    (Object.keys(nut) as Nutrient[]).forEach((k) => {
      if (nut[k]?.trim()) perHa[k] = n(nut[k]!) / basisHa;
    });
    return fertilizerPlan({ areaHa, nutrientKgPerHa: perHa, productFor: choice, products });
  }, [mode, areaOk, nut, basisHa, areaHa, choice, products]);

  const productLines = products
    .filter((p) => prod[p.id]?.trim())
    .map((p) => ({ p, v: n(prod[p.id]) }))
    .map(({ p, v }) => ({ p, v, total: (v / basisHa) * areaHa }));
  const productErr = productLines.find((l) => !Number.isFinite(l.v) || l.v < 0) ? 'সারের পরিমাণ সঠিক সংখ্যায় লিখুন।' : null;

  return (
    <div className="space-y-5">
      <Notice tone="sample" title="এই হিসাব কোনো সারের মাত্রা সুপারিশ করে না">
        মাটি পরীক্ষা বা উপজেলা কৃষি অফিস/বিএআরসি-র সার সুপারিশ নির্দেশিকা থেকে পাওয়া মাত্রা লিখুন। এখানে শুধু আপনার দেওয়া মাত্রা থেকে মোট পরিমাণ বের করা হয়।
      </Notice>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <AreaInput area={area} setArea={setArea} unit={unit} setUnit={setUnit} />
          <SelectField label="সুপারিশটি কোন এককের জন্য দেওয়া?" value={basis} onChange={setBasis}>
            {units
              .filter((u) => AREA_UNITS.includes(u.id))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  প্রতি {u.nameBn}
                </option>
              ))}
          </SelectField>
          <div className="inline-flex rounded-2xl bg-cream p-1" role="radiogroup" aria-label="সুপারিশের ধরন">
            {(['product', 'nutrient'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={cn('min-h-[44px] rounded-xl px-4 text-sm font-semibold', mode === m ? 'bg-white shadow-soft' : 'text-ink-soft')}>
                {m === 'product' ? 'সারের নাম অনুযায়ী (কেজি)' : 'পুষ্টি উপাদান অনুযায়ী (N-P-K…)'}
              </button>
            ))}
          </div>
          {mode === 'product' ? (
            <div className="grid grid-cols-2 gap-3">
              {products.map((p) => (
                <NumField key={p.id} label={p.nameBn} value={prod[p.id] ?? ''} onChange={(s) => setProd((x) => ({ ...x, [p.id]: s }))} suffix="কেজি" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(Object.keys(NUTRIENT_BN) as Nutrient[]).map((k) => (
                <div key={k} className="grid grid-cols-[1fr_1fr] gap-3">
                  <NumField label={NUTRIENT_BN[k]} value={nut[k] ?? ''} onChange={(s) => setNut((x) => ({ ...x, [k]: s }))} suffix="কেজি" />
                  <SelectField label="কোন সার দিয়ে" value={choice[k]} onChange={(s) => setChoice((c) => ({ ...c, [k]: s }))}>
                    {products
                      .filter((p) => p.nutrients[k])
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nameBn} ({formatBn((p.nutrients[k] ?? 0) * 100, 0)}%)
                        </option>
                      ))}
                  </SelectField>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          {mode === 'product' ? (
            <ResultBox error={!areaOk && productLines.length ? 'জমির পরিমাণ শূন্যের বেশি লিখুন।' : productErr}>
              {areaOk && productLines.length > 0 && !productErr && (
                <ul className="divide-y divide-forest/5">
                  {productLines.map(({ p, total }) => (
                    <li key={p.id} className="flex items-baseline justify-between py-2">
                      <span>{p.nameBn}</span>
                      <strong className="text-xl">{formatBn(total, 2)} কেজি</strong>
                    </li>
                  ))}
                </ul>
              )}
            </ResultBox>
          ) : (
            <ResultBox error={nutrientResult && !nutrientResult.ok ? nutrientResult.error : null}>
              {nutrientResult?.ok && (
                <>
                  <ul className="divide-y divide-forest/5">
                    {nutrientResult.value.lines.map((l) => (
                      <li key={l.productId} className="flex items-baseline justify-between py-2">
                        <span>
                          {l.nameBn} <span className="text-xs text-ink-soft">({l.supplies})</span>
                        </span>
                        <strong className="text-xl">{formatBn(l.kgTotal, 2)} কেজি</strong>
                      </li>
                    ))}
                  </ul>
                  {nutrientResult.value.notes.map((t) => (
                    <p key={t} className="mt-2 text-xs text-ink-soft">ℹ️ {t}</p>
                  ))}
                </>
              )}
            </ResultBox>
          )}
          <p className="mt-3 text-xs text-ink-soft">পুষ্টির হার সাধারণ মান ধরে হিসাব করা; প্যাকেটে লেখা হার ভিন্ন হলে সেটিই সঠিক। {products.find((p) => p.id === 'dap')?.noteBn}</p>
        </div>
      </div>
    </div>
  );
}

interface CostRow {
  id: string;
  labelBn: string;
  amount: string;
}
const DEFAULT_ROWS = ['জমি চাষ', 'বীজ/চারা', 'সার', 'সেচ', 'বালাইনাশক', 'শ্রমিক', 'পরিবহন', 'জমির ভাড়া'].map((l, i) => ({ id: `r${i}`, labelBn: l, amount: '' }));

function CostCalc() {
  const [rows, setRows] = useState<CostRow[]>(DEFAULT_ROWS);
  const [yieldKg, setYieldKg] = useState('');
  const [, setExpenses] = useStored<{ id: string; date: string; item: string; amount: number }[]>(STORE_KEYS.expenses, []);
  const [saved, setSaved] = useState(false);
  const items = rows.filter((r) => r.amount.trim()).map((r) => ({ id: r.id, labelBn: r.labelBn, amount: n(r.amount) }));
  const r = items.length ? totalCost(items) : null;
  const y = n(yieldKg);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={row.id} className="grid grid-cols-[1fr_140px_auto] items-end gap-2">
            <div>
              <label htmlFor={`cl-${row.id}`} className="sr-only">খাতের নাম</label>
              <input id={`cl-${row.id}`} className="field" value={row.labelBn} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, labelBn: e.target.value } : x)))} />
            </div>
            <div>
              <label htmlFor={`ca-${row.id}`} className="sr-only">{row.labelBn} খরচ (টাকা)</label>
              <input id={`ca-${row.id}`} inputMode="decimal" className="field" placeholder="৳ ০" value={row.amount} onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
            </div>
            <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-ink-soft hover:bg-red-50 hover:text-red-700" aria-label={`${row.labelBn} মুছুন`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, { id: `r${Date.now()}`, labelBn: 'অন্যান্য', amount: '' }])}>
          <Plus className="h-4 w-4" aria-hidden /> খাত যোগ করুন
        </Button>
        <NumField label="মোট ফলন (ঐচ্ছিক)" value={yieldKg} onChange={setYieldKg} suffix="কেজি" hint="দিলে প্রতি কেজি উৎপাদন খরচ দেখাবে" />
      </div>
      <div className="space-y-3">
        <ResultBox error={r && !r.ok ? r.error : null}>
          {r?.ok && (
            <>
              <p className="text-ink-soft">মোট উৎপাদন খরচ</p>
              <p className="text-4xl font-bold text-forest">{formatTaka(r.value)}</p>
              {yieldKg && Number.isFinite(y) && y > 0 && <p className="mt-2">প্রতি কেজি খরচ: <strong>{formatTaka(r.value / y)}</strong> ({formatBn(r.value / y, 2)} টাকা)</p>}
              <ul className="mt-4 space-y-1.5">
                {items
                  .filter((it) => it.amount > 0)
                  .map((it) => (
                    <li key={it.id} className="flex items-center gap-3 text-sm">
                      <span className="w-24 shrink-0 truncate">{it.labelBn}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-forest/5">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${(it.amount / r.value) * 100}%` }} />
                      </span>
                      <span className="w-12 text-right text-ink-soft">{formatBn((it.amount / r.value) * 100, 0)}%</span>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </ResultBox>
        {r?.ok && r.value > 0 && (
          <Button
            variant="outline"
            onClick={() => {
              const date = new Date().toISOString().slice(0, 10);
              setExpenses((ex) => [...ex, ...items.filter((it) => it.amount > 0).map((it) => ({ id: `${Date.now()}-${it.id}`, date, item: it.labelBn, amount: it.amount }))]);
              setSaved(true);
            }}
          >
            {saved ? 'আমার খামারে যোগ হয়েছে ✓' : 'খরচগুলো আমার খামারের হিসাবে যোগ করুন'}
          </Button>
        )}
      </div>
    </div>
  );
}

function MarginCalc() {
  const [yieldV, setYieldV] = useState('');
  const [yUnit, setYUnit] = useState('kg');
  const [price, setPrice] = useState('');
  const [pUnit, setPUnit] = useState('kg');
  const [cost, setCost] = useState('');
  const f = (u: string) => (u === 'maund' ? 40 : 1);
  const ready = yieldV && price && cost;
  const r = ready ? grossMargin({ yieldKg: n(yieldV) * f(yUnit), priceBdtPerKg: n(price) / f(pUnit), costBdt: n(cost) }) : null;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <NumField label="মোট ফলন" value={yieldV} onChange={setYieldV} />
          <SelectField label="একক" value={yUnit} onChange={setYUnit}>
            <option value="kg">কেজি</option>
            <option value="maund">মণ (৪০ কেজি)</option>
          </SelectField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="বিক্রয় দাম (টাকা)" value={price} onChange={setPrice} />
          <SelectField label="প্রতি" value={pUnit} onChange={setPUnit}>
            <option value="kg">কেজি</option>
            <option value="maund">মণ</option>
          </SelectField>
        </div>
        <NumField label="মোট উৎপাদন খরচ" value={cost} onChange={setCost} suffix="টাকা" hint="‘উৎপাদন খরচ’ ট্যাব থেকে হিসাব করে নিন" />
      </div>
      <div className="space-y-3">
        <ResultBox error={r && !r.ok ? r.error : null}>
          {r?.ok && (
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-ink-soft">মোট আয়</dt>
                <dd className="text-2xl font-bold">{formatTaka(r.value.revenue)}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-soft">মোট লাভ (গ্রস মার্জিন)</dt>
                <dd className={cn('text-2xl font-bold', r.value.margin < 0 ? 'text-red-700' : 'text-primary-700')}>
                  {r.value.margin < 0 ? '−' : ''}
                  {formatTaka(Math.abs(r.value.margin))}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-ink-soft">আয়-খরচ অনুপাত</dt>
                <dd className="text-xl font-semibold">{r.value.bcr !== null ? formatBn(r.value.bcr, 2) : '—'}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-soft">লোকসান এড়াতে ন্যূনতম দাম</dt>
                <dd className="text-xl font-semibold">{r.value.breakEvenPrice !== null ? `${formatBn(r.value.breakEvenPrice, 2)} ৳/কেজি` : '—'}</dd>
              </div>
            </dl>
          )}
        </ResultBox>
        <p className="text-xs text-ink-soft">এটি আনুমানিক হিসাব। ফলন, দাম ও খরচ বাস্তবে বদলাতে পারে—লাভের কোনো নিশ্চয়তা নেই।</p>
      </div>
    </div>
  );
}

function FeedCalc() {
  const [animals, setAnimals] = useState('');
  const [kg, setKg] = useState('');
  const [days, setDays] = useState('30');
  const [price, setPrice] = useState('');
  const r = animals && kg && days && price ? feedCost({ animals: n(animals), kgPerAnimalPerDay: n(kg), days: n(days), pricePerKg: n(price) }) : null;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-3">
        <NumField label="পশু/পাখির সংখ্যা" value={animals} onChange={setAnimals} suffix="টি" />
        <NumField label="প্রতিটির দৈনিক খাবার" value={kg} onChange={setKg} suffix="কেজি" hint="গ্রামে জানলে ১০০০ দিয়ে ভাগ করুন" />
        <NumField label="কত দিনের হিসাব" value={days} onChange={setDays} suffix="দিন" />
        <NumField label="খাবারের দাম" value={price} onChange={setPrice} suffix="৳/কেজি" />
      </div>
      <ResultBox error={r && !r.ok ? r.error : null}>
        {r?.ok && (
          <>
            <p className="text-ink-soft">মোট খাবার</p>
            <p className="text-3xl font-bold">{formatBn(r.value.totalKg, 1)} কেজি</p>
            <p className="mt-3 text-ink-soft">মোট খরচ</p>
            <p className="text-4xl font-bold text-forest">{formatTaka(r.value.totalCost)}</p>
            <p className="mt-2 text-sm">প্রতিটির দৈনিক খাদ্য খরচ: {formatBn(r.value.perAnimalPerDay, 2)} টাকা</p>
          </>
        )}
      </ResultBox>
    </div>
  );
}

function PondCalc() {
  const { get } = useLandUnits();
  const [area, setArea] = useState('');
  const [unit, setUnit] = useState('decimal');
  const [per, setPer] = useState('');
  const [species, setSpecies] = useState([
    { nameBn: 'রুই', pct: '' },
    { nameBn: 'কাতলা', pct: '' },
    { nameBn: 'মৃগেল', pct: '' },
  ]);
  const areaDec = n(area) * (get(unit).sqm / get('decimal').sqm);
  const r = area && per ? pondStocking({ areaDecimal: areaDec, perDecimal: n(per), species: species.map((s) => ({ nameBn: s.nameBn, pct: n(s.pct) || 0 })) }) : null;
  return (
    <div className="space-y-5">
      <Notice tone="info">প্রতি শতাংশে কতটি পোনা ছাড়বেন তা চাষ পদ্ধতি, খাবার ও পানির গভীরতার ওপর নির্ভর করে—উপজেলা মৎস্য অফিসের সুপারিশ লিখুন।</Notice>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <AreaInput area={area} setArea={setArea} unit={unit} setUnit={setUnit} label="পুকুরের আয়তন" />
          <NumField label="প্রতি শতাংশে পোনা (সুপারিশ)" value={per} onChange={setPer} suffix="টি" />
          <fieldset className="space-y-2">
            <legend className="label">প্রজাতিভিত্তিক ভাগ (ঐচ্ছিক, মোট ১০০%)</legend>
            {species.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px] gap-2">
                <input aria-label="প্রজাতির নাম" className="field" value={s.nameBn} onChange={(e) => setSpecies((sp) => sp.map((x, j) => (j === i ? { ...x, nameBn: e.target.value } : x)))} />
                <input aria-label={`${s.nameBn} শতাংশ`} inputMode="decimal" className="field" placeholder="%" value={s.pct} onChange={(e) => setSpecies((sp) => sp.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))} />
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setSpecies((sp) => [...sp, { nameBn: '', pct: '' }])}>
              <Plus className="h-4 w-4" aria-hidden /> প্রজাতি যোগ
            </Button>
          </fieldset>
        </div>
        <ResultBox error={r && !r.ok ? r.error : null}>
          {r?.ok && (
            <>
              <p className="text-ink-soft">মোট পোনা</p>
              <p className="text-4xl font-bold text-forest">{formatBn(r.value.total, 0)} টি</p>
              <p className="text-sm text-ink-soft">পুকুর ≈ {formatBn(areaDec, 2)} শতাংশ</p>
              {r.value.bySpecies.length > 0 && (
                <ul className="mt-3 divide-y divide-forest/5">
                  {r.value.bySpecies.map((s) => (
                    <li key={s.nameBn} className="flex justify-between py-1.5">
                      <span>{s.nameBn}</span>
                      <strong>{formatBn(s.count, 0)} টি</strong>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </ResultBox>
      </div>
    </div>
  );
}

const PANELS: Record<string, () => JSX.Element> = { land: LandCalc, seed: SeedCalc, fertilizer: FertilizerCalc, cost: CostCalc, margin: MarginCalc, feed: FeedCalc, pond: PondCalc };

export default function CalculatorPage() {
  const [params, setParams] = useSearchParams();
  const tab = PANELS[params.get('tab') ?? ''] ? params.get('tab')! : 'land';
  const info = calculatorsData.calculators.find((c) => c.id === tab)!;
  const Panel = PANELS[tab];
  return (
    <>
      <PageHeader eyebrow="কৃষি হিসাব" title="সহজ কৃষি ক্যালকুলেটর" description="স্থানীয় এককে জমি, বীজ, সার, খরচ, লাভ, পশুখাদ্য ও পোনার হিসাব — সব আপনার ফোনেই হয়।" icon={<Calculator className="h-7 w-7 text-leaf" />} />
      <div className="container-page mt-8">
        <div role="tablist" aria-label="হিসাবের ধরন" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {calculatorsData.calculators.map((c) => (
            <button key={c.id} role="tab" type="button" aria-selected={tab === c.id} onClick={() => setParams({ tab: c.id }, { replace: true })} className={cn('flex min-h-[48px] shrink-0 items-center gap-2 rounded-2xl px-4 font-semibold transition', tab === c.id ? 'bg-forest text-white shadow-lift' : 'bg-white text-forest shadow-soft hover:bg-cream')}>
              <span aria-hidden>{c.icon}</span> {c.titleBn}
            </button>
          ))}
        </div>
        <Card className="mt-5" as="section">
          <h2 className="text-2xl font-bold">{info.titleBn}</h2>
          <p className="mt-1 text-ink-soft">{info.descriptionBn}</p>
          <div className="mt-6">
            <Panel />
          </div>
          <details className="mt-8 rounded-2xl bg-cream p-4">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold">
              <Info className="h-4 w-4" aria-hidden /> সূত্র ও অনুমান
            </summary>
            <p className="mt-3 text-sm">{info.formulaBn}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {info.assumptionsBn.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </details>
        </Card>
      </div>
    </>
  );
}
