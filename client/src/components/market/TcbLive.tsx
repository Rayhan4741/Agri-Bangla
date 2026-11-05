import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ExternalLink, Info, Minus, RefreshCw, Search, ServerOff, Store } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type DotProps } from 'recharts';
import { Card, Spinner } from '@/components/common/ui';
import { api, ApiError } from '@/lib/api';
import { useServer } from '@/context/ServerContext';
import { formatBn, toBnDigits } from '@/lib/formatting';
import { normalize } from '@/lib/search';
import { cn } from '@/lib/cn';

interface Change {
  date: string;
  avg: number | null;
  week: number | null;
  month: number | null;
  year: number | null;
}
interface LatestItem {
  commodity: string;
  nameBn: string;
  unitBn: string;
  date: string;
  min: number | null;
  max: number | null;
  category?: string;
  sourceUrl: string;
  change: Change | null;
}
interface Source {
  nameBn: string;
  url: string;
  scopeBn: string;
}
interface Point {
  date: string;
  min: number | null;
  max: number | null;
  avg: number | null;
  kind: 'daily' | 'reference';
}

const CATS: Record<string, string> = {
  all: 'সব',
  rice: 'চাল',
  flour: 'আটা-ময়দা',
  oil: 'তেল',
  pulses: 'ডাল',
  vegetables: 'সবজি',
  spices: 'মসলা',
  'fish-meat': 'মাছ-মাংস',
  'egg-dairy': 'ডিম-দুধ',
  other: 'অন্যান্য',
};
const RANGES = [
  { days: 30, label: '৩০ দিন' },
  { days: 90, label: '৩ মাস' },
  { days: 365, label: '১ বছর' },
  { days: 730, label: '২ বছর' },
];
const AXIS = { fontSize: 12, fill: '#4A6357' };

export const dateBn = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${toBnDigits(d)} ${['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'][m - 1]} ${toBnDigits(y)}`;
};
const daysAgo = (n: number) => new Date(Date.now() + 6 * 3600_000 - n * 86400_000).toISOString().slice(0, 10);

function Delta({ v, label }: { v: number | null; label: string }) {
  if (v == null) return <span className="text-xs text-ink-soft">{label}: —</span>;
  const up = v > 0.05;
  const down = v < -0.05;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', up ? 'text-red-700' : down ? 'text-primary-700' : 'text-ink-soft')} title={`${label} তুলনায়`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label} {up ? '+' : ''}
      {formatBn(v, 1)}%
    </span>
  );
}

function RefDot(props: DotProps & { payload?: Point }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  return payload?.kind === 'reference' ? <circle cx={cx} cy={cy} r={4} fill="#fff" stroke="#21864A" strokeWidth={2} /> : <circle cx={cx} cy={cy} r={2.5} fill="#21864A" />;
}

export function TcbLive() {
  const server = useServer();
  const [state, setState] = useState<{ status: 'loading' | 'ok' | 'error'; items: LatestItem[]; latestDate: string | null; stale: boolean | null; source?: Source; message?: string }>({
    status: 'loading',
    items: [],
    latestDate: null,
    stale: null,
  });
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [days, setDays] = useState(365);
  const [hist, setHist] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; points: Point[] }>({ status: 'idle', points: [] });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (server.status !== 'online') return;
    let alive = true;
    setState((s) => ({ ...s, status: 'loading' }));
    api<{ items: LatestItem[]; latestDate: string | null; stale: boolean | null; source: Source }>('/market/latest')
      .then((r) => {
        if (!alive) return;
        setState({ status: 'ok', ...r });
        setSelected((cur) => cur ?? r.items.find((i) => i.commodity === 'rice-coarse')?.commodity ?? r.items[0]?.commodity ?? null);
      })
      .catch((e) => alive && setState((s) => ({ ...s, status: 'error', message: e instanceof ApiError ? e.message : 'দর আনা যায়নি।' })));
    return () => {
      alive = false;
    };
  }, [server.status, reload]);

  useEffect(() => {
    if (!selected || server.status !== 'online') return;
    let alive = true;
    setHist((h) => ({ ...h, status: 'loading' }));
    api<{ points: Point[] }>(`/market/history?commodity=${encodeURIComponent(selected)}&from=${daysAgo(days)}`)
      .then((r) => alive && setHist({ status: 'ok', points: r.points }))
      .catch(() => alive && setHist({ status: 'error', points: [] }));
    return () => {
      alive = false;
    };
  }, [selected, days, server.status]);

  const items = useMemo(
    () => state.items.filter((i) => (cat === 'all' || i.category === cat) && (!q || normalize(i.nameBn).includes(normalize(q)))),
    [state.items, cat, q],
  );
  const sel = state.items.find((i) => i.commodity === selected);
  const hasRef = hist.points.some((p) => p.kind === 'reference');

  if (server.status === 'checking') return null;
  if (server.status === 'offline') {
    return (
      <Card className="flex items-start gap-3 p-5">
        <ServerOff className="mt-0.5 h-6 w-6 shrink-0 text-ink-soft" aria-hidden />
        <div>
          <p className="font-bold">লাইভ TCB বাজারদর এখন দেখা যাচ্ছে না</p>
          <p className="text-sm text-ink-soft">কৃষিবাংলার সার্ভারে সংযোগ নেই (অফলাইন বা শুধু স্থির সংস্করণ চালু)। নিচের চার্টগুলো শুধু নমুনা।</p>
        </div>
      </Card>
    );
  }

  return (
    <section aria-labelledby="tcb-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="tcb-title" className="flex items-center gap-2 text-2xl font-bold text-forest">
            <Store className="h-6 w-6 text-primary" aria-hidden /> আজকের বাজারদর (TCB)
          </h2>
          <p className="text-sm text-ink-soft">
            উৎস: {state.source?.nameBn ?? 'ট্রেডিং কর্পোরেশন অব বাংলাদেশ (টিসিবি)'} — {state.source?.scopeBn ?? 'ঢাকা মহানগরীর খুচরা বাজার দর'}
            {state.latestDate && <> · সর্বশেষ প্রতিবেদন: <strong>{dateBn(state.latestDate)}</strong></>}
          </p>
        </div>
        <div className="flex gap-2">
          {state.source?.url && (
            <a href={state.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-primary-700 ring-1 ring-primary/20 hover:bg-primary-50">
              TCB ওয়েবসাইট <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          )}
          <button type="button" onClick={() => setReload((r) => r + 1)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold ring-1 ring-forest/10 hover:bg-cream" aria-label="আবার আনুন">
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {state.status === 'loading' && (
        <Card className="flex justify-center p-10">
          <Spinner />
        </Card>
      )}
      {state.status === 'error' && <Card className="p-5 text-red-800">{state.message}</Card>}
      {state.status === 'ok' && !state.items.length && (
        <Card className="flex items-start gap-3 p-5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <p>এখনও কোনো TCB দর প্রকাশ করা হয়নি। অ্যাডমিন প্রতিদিনের TCB প্রতিবেদন আপলোড ও যাচাই করে প্রকাশ করলে এখানে দেখা যাবে। আমরা কোনো দাম বানিয়ে দেখাই না।</p>
        </Card>
      )}

      {state.status === 'ok' && state.items.length > 0 && (
        <>
          {state.stale && (
            <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200" role="status">
              সর্বশেষ দর {dateBn(state.latestDate!)} তারিখের — কয়েক দিন হালনাগাদ হয়নি। আজকের দর বাজারে যাচাই করুন।
            </p>
          )}
          <Card className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap gap-2" role="group" aria-label="পণ্যের ধরন">
              {Object.entries(CATS)
                .filter(([k]) => k === 'all' || state.items.some((i) => i.category === k))
                .map(([k, label]) => (
                  <button key={k} type="button" className={cn('chip', cat === k && 'chip-active')} aria-pressed={cat === k} onClick={() => setCat(k)}>
                    {label}
                  </button>
                ))}
            </div>
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden />
              <label htmlFor="tcb-q" className="sr-only">পণ্য খুঁজুন</label>
              <input id="tcb-q" className="field pl-12" placeholder="পণ্য খুঁজুন (যেমন: চাল, আলু)" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((i) => (
                <li key={i.commodity}>
                  <button
                    type="button"
                    onClick={() => setSelected(i.commodity)}
                    aria-pressed={selected === i.commodity}
                    className={cn('w-full rounded-2xl p-3 text-left ring-1 transition', selected === i.commodity ? 'bg-primary-50 ring-primary/40' : 'bg-white ring-forest/10 hover:bg-cream')}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-forest">{i.nameBn}</span>
                      <span className="whitespace-nowrap text-lg font-bold">
                        ৳{i.min != null ? formatBn(i.min, 0) : '—'}
                        {i.max != null && i.max !== i.min ? `–${formatBn(i.max, 0)}` : ''}
                        <span className="text-xs font-normal text-ink-soft">/{i.unitBn}</span>
                      </span>
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <Delta v={i.change?.week ?? null} label="সপ্তাহ" />
                      <Delta v={i.change?.month ?? null} label="মাস" />
                      <Delta v={i.change?.year ?? null} label="বছর" />
                    </span>
                    {i.date !== state.latestDate && <span className="mt-1 block text-xs text-amber-800">দর {dateBn(i.date)} তারিখের</span>}
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {sel && (
            <Card className="p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">{sel.nameBn}: দামের ইতিহাস</h3>
                  <p className="text-sm text-ink-soft">টাকা প্রতি {sel.unitBn} · সর্বনিম্ন, সর্বোচ্চ ও গড়</p>
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="সময়কাল">
                  {RANGES.map((r) => (
                    <button key={r.days} type="button" className={cn('chip', days === r.days && 'chip-active')} aria-pressed={days === r.days} onClick={() => setDays(r.days)}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              {hist.status === 'loading' && (
                <div className="flex h-72 items-center justify-center">
                  <Spinner />
                </div>
              )}
              {hist.status === 'error' && <p className="text-red-800">ইতিহাস আনা যায়নি।</p>}
              {hist.status === 'ok' && hist.points.length < 2 && <p className="py-10 text-center text-ink-soft">এই সময়ের মধ্যে চার্ট আঁকার মতো যথেষ্ট তথ্য নেই।</p>}
              {hist.status === 'ok' && hist.points.length >= 2 && (
                <>
                  <div className="h-72" role="img" aria-label={`${sel.nameBn}-এর দামের রেখাচিত্র`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={hist.points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke="#e7eadf" vertical={false} />
                        <XAxis dataKey="date" tick={AXIS} tickFormatter={(d: string) => dateBn(d).split(' ').slice(0, 2).join(' ')} minTickGap={24} />
                        <YAxis tick={AXIS} width={52} tickFormatter={(v: number) => `৳${formatBn(v, 0)}`} domain={['auto', 'auto']} />
                        <Tooltip
                          labelFormatter={(d) => dateBn(String(d))}
                          formatter={(v, name) => [`৳${formatBn(Number(v), 1)}`, name === 'avg' ? 'গড়' : name === 'min' ? 'সর্বনিম্ন' : 'সর্বোচ্চ']}
                        />
                        <Line type="monotone" dataKey="max" stroke="#E9B44C" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />
                        <Line type="monotone" dataKey="min" stroke="#77C66E" strokeWidth={1.5} dot={false} strokeDasharray="4 3" connectNulls />
                        <Line type="monotone" dataKey="avg" stroke="#21864A" strokeWidth={2.5} dot={<RefDot />} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-3 text-xs text-ink-soft">
                    ভরাট বিন্দু = প্রতিদিনের TCB প্রতিবেদনের দর।
                    {hasRef && ' ফাঁকা বিন্দু = কোনো প্রতিবেদনে ছাপা “এক সপ্তাহ/মাস/বছর আগের” দর (দৈনিক তথ্য সংগ্রহ শুরুর আগের ইতিহাস)।'} TCB ঢাকা মহানগরীর খুচরা বাজারের দর প্রকাশ করে; আপনার এলাকার দর আলাদা হতে পারে।
                  </p>
                </>
              )}
            </Card>
          )}
        </>
      )}
    </section>
  );
}
