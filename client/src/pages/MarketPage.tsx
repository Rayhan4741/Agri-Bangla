import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, FlaskConical, LineChart as LineIcon, Minus, Search } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, PageHeader } from '@/components/common/ui';
import { VerifyWith } from '@/components/common/VerifyWith';
import { marketData } from '@/lib/data';
import { normalize } from '@/lib/search';
import { formatBn, toBnDigits } from '@/lib/formatting';
import { cn } from '@/lib/cn';
import { TcbLive } from '@/components/market/TcbLive';

// Validated categorical palette (fixed order; colour follows the market, not its rank).
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const UNITS = [
  { id: 'kg', label: 'কেজি', factor: 1 },
  { id: 'maund', label: 'মণ (৪০ কেজি)', factor: 40 },
  { id: 'quintal', label: 'কুইন্টাল (১০০ কেজি)', factor: 100 },
];
const AXIS = { fontSize: 12, fill: '#4A6357' };

export default function MarketPage() {
  const [q, setQ] = useState('');
  const [commodity, setCommodity] = useState(marketData.commodities[0].id);
  const [selected, setSelected] = useState<string[]>(marketData.markets.map((m) => m.id));
  const [unitId, setUnitId] = useState('kg');
  const [period, setPeriod] = useState(12);
  const [showTable, setShowTable] = useState(false);
  const unit = UNITS.find((u) => u.id === unitId)!;
  const color = (marketId: string) => SERIES[marketData.markets.findIndex((m) => m.id === marketId) % SERIES.length];

  const commodities = marketData.commodities.filter((c) => !q || normalize(c.nameBn).includes(normalize(q)));
  const cName = marketData.commodities.find((c) => c.id === commodity)?.nameBn ?? '';
  const markets = marketData.markets.filter((m) => selected.includes(m.id));

  const recs = useMemo(() => marketData.records.filter((r) => r.commodityId === commodity), [commodity]);
  const price = (marketId: string, p: number) => {
    const r = recs.find((x) => x.marketId === marketId && x.period === p);
    return r ? r.priceBdtPerKg * unit.factor : null;
  };

  const trend = Array.from({ length: 12 }, (_, i) => {
    const row: Record<string, number | string | null> = { period: `নমুনা-${toBnDigits(i + 1)}` };
    markets.forEach((m) => (row[m.id] = price(m.id, i + 1)));
    return row;
  });
  const compare = markets.map((m) => ({ name: m.nameBn.replace(' (নমুনা বাজার)', ''), id: m.id, value: price(m.id, period) ?? 0 }));
  const fmt = (v: number) => `৳${formatBn(v, unit.factor === 1 ? 1 : 0)}`;

  return (
    <>
      <PageHeader eyebrow="বাজার তথ্য" title="বাজারদর" description="টিসিবির প্রতিদিনের খুচরা বাজারদর, দামের ইতিহাস ও পরিবর্তন।" icon={<LineIcon className="h-7 w-7 text-leaf" />} />
      <div className="container-page mt-8 space-y-6">
        <TcbLive />
        <h2 className="pt-6 text-xl font-bold text-forest">নমুনা চার্ট: বিভিন্ন বাজারের তুলনা (ডেমো)</h2>
        <div role="alert" className="flex items-start gap-3 rounded-3xl bg-harvest p-5 text-forest shadow-soft">
          <FlaskConical className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
          <div>
            <p className="text-lg font-bold">{marketData.noticeBn}</p>
            <p className="text-sm">
              এই পাতার সব দাম বানানো নমুনা সংখ্যা—চার্ট কীভাবে কাজ করে তা দেখানোর জন্য। কোনো লাইভ বাজারদর উৎস সংযুক্ত নেই। আসল দরের জন্য কৃষি বিপণন অধিদপ্তরের প্রকাশনা দেখুন ও স্থানীয় একাধিক আড়তে যাচাই করুন।
            </p>
          </div>
        </div>

        {/* filters: one row */}
        <Card className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_200px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden />
              <label htmlFor="mk-q" className="sr-only">পণ্য খুঁজুন</label>
              <input id="mk-q" className="field pl-12" placeholder="পণ্য খুঁজুন" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div>
              <label htmlFor="mk-unit" className="sr-only">দামের একক</label>
              <select id="mk-unit" className="field" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                {UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    প্রতি {u.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="mk-period" className="sr-only">তুলনার সময়কাল</label>
              <select id="mk-period" className="field" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {marketData.periodLabelBn} {toBnDigits(i + 1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" role="group" aria-label="পণ্য">
            {commodities.map((c) => (
              <button key={c.id} type="button" onClick={() => setCommodity(c.id)} aria-pressed={commodity === c.id} className={cn('chip shrink-0', commodity === c.id && 'chip-active')}>
                {c.nameBn}
              </button>
            ))}
            {!commodities.length && <p className="text-sm text-ink-soft">কোনো পণ্য মেলেনি।</p>}
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">বাজার</legend>
            <div className="flex flex-wrap gap-2">
              {marketData.markets.map((m) => {
                const on = selected.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelected((s) => (on ? (s.length > 1 ? s.filter((x) => x !== m.id) : s) : [...s, m.id]))}
                    className={cn('chip', on ? 'border-forest/30 bg-white' : 'opacity-50')}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ background: color(m.id) }} aria-hidden />
                    {m.nameBn.replace(' (নমুনা বাজার)', '')}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="p-4 sm:p-5">
            <h2 className="px-1 text-lg font-bold">{cName}: নমুনা দামের প্রবণতা</h2>
            <p className="px-1 text-sm text-ink-soft">প্রতি {unit.label} · টাকা · নমুনা সময়কাল ১–১২</p>
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ left: 0, right: 12, top: 8 }}>
                  <CartesianGrid stroke="#123D2B12" vertical={false} />
                  <XAxis dataKey="period" tick={AXIS} interval={1} />
                  <YAxis tick={AXIS} width={56} domain={['auto', 'auto']} tickFormatter={(v: number) => formatBn(v, 0)} />
                  <Tooltip formatter={(v: number, k: string) => [fmt(v), marketData.markets.find((m) => m.id === k)?.nameBn ?? k]} cursor={{ stroke: '#123D2B40', strokeWidth: 1 }} />
                  <Legend formatter={(k: string) => <span className="text-sm text-ink">{marketData.markets.find((m) => m.id === k)?.nameBn.replace(' (নমুনা বাজার)', '')}</span>} />
                  {markets.map((m) => (
                    <Line key={m.id} dataKey={m.id} stroke={color(m.id)} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-4 sm:p-5">
            <h2 className="px-1 text-lg font-bold">বাজারভেদে তুলনা</h2>
            <p className="px-1 text-sm text-ink-soft">{marketData.periodLabelBn} {toBnDigits(period)} · প্রতি {unit.label}</p>
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compare} layout="vertical" margin={{ left: 8, right: 40 }}>
                  <CartesianGrid stroke="#123D2B12" horizontal={false} />
                  <XAxis type="number" tick={AXIS} tickFormatter={(v: number) => formatBn(v, 0)} />
                  <YAxis type="category" dataKey="name" tick={AXIS} width={64} />
                  <Tooltip formatter={(v: number) => [fmt(v), cName]} cursor={{ fill: '#123D2B08' }} />
                  <Bar dataKey="value" fill="#21864A" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', formatter: (v: number) => formatBn(v, 0), fontSize: 12, fill: '#19352A' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="p-0 sm:p-0">
          <div className="flex items-center justify-between p-5">
            <h2 className="text-lg font-bold">টেবিল আকারে দেখুন</h2>
            <button type="button" className="chip" aria-expanded={showTable} onClick={() => setShowTable((s) => !s)}>
              {showTable ? 'লুকান' : 'দেখান'}
            </button>
          </div>
          {showTable && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <caption className="sr-only">{cName} — নমুনা দাম, প্রতি {unit.label}</caption>
                <thead className="bg-cream text-sm">
                  <tr>
                    <th scope="col" className="px-5 py-3">বাজার</th>
                    <th scope="col" className="px-5 py-3">নমুনা {toBnDigits(period)}</th>
                    <th scope="col" className="px-5 py-3">আগের সময়কাল থেকে পরিবর্তন</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.map((m) => {
                    const now = price(m.id, period);
                    const prev = period > 1 ? price(m.id, period - 1) : null;
                    const ch = now !== null && prev ? ((now - prev) / prev) * 100 : null;
                    return (
                      <tr key={m.id} className="border-t border-forest/5">
                        <th scope="row" className="px-5 py-3 font-semibold">
                          <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: color(m.id) }} aria-hidden />
                          {m.nameBn}
                        </th>
                        <td className="px-5 py-3">{now !== null ? fmt(now) : '—'}</td>
                        <td className="px-5 py-3">
                          {ch === null ? (
                            '—'
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              {ch > 0.5 ? <ArrowUpRight className="h-4 w-4" aria-hidden /> : ch < -0.5 ? <ArrowDownRight className="h-4 w-4" aria-hidden /> : <Minus className="h-4 w-4" aria-hidden />}
                              {ch > 0 ? 'বেড়েছে' : ch < 0 ? 'কমেছে' : 'অপরিবর্তিত'} {formatBn(Math.abs(ch), 1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <VerifyWith ids={['dam']} />
      </div>
    </>
  );
}
