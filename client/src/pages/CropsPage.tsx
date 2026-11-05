import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Sprout, X } from 'lucide-react';
import { EmptyState, PageHeader } from '@/components/common/ui';
import { CropCard } from '@/components/crops/CropCard';
import { cropCategories, crops, SEASON_BN } from '@/lib/data';
import { normalize } from '@/lib/search';
import { toBnDigits } from '@/lib/formatting';
import type { SeasonId } from '@/types';
import { cn } from '@/lib/cn';

const SEASONS: (SeasonId | 'all')[] = ['all', 'rabi', 'kharif-1', 'kharif-2', 'year-round'];

export default function CropsPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const cat = params.get('cat') ?? 'all';
  const season = (params.get('season') ?? 'all') as SeasonId | 'all';

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === 'all') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const list = useMemo(() => {
    const nq = normalize(q);
    return crops.filter(
      (c) =>
        (cat === 'all' || c.category === cat) &&
        (season === 'all' || c.seasons.includes(season)) &&
        (!nq || normalize([c.nameBn, c.nameEn, ...c.keywords].join(' ')).includes(nq)),
    );
  }, [q, cat, season]);

  return (
    <>
      <PageHeader eyebrow="ফসলের নির্দেশিকা" title="ফসল নির্বাচন করুন" description={`${toBnDigits(crops.length)}টি ফসলের ধাপে ধাপে চাষ পদ্ধতি, রোগ-পোকা ও সংরক্ষণ।`} icon={<Sprout className="h-7 w-7 text-leaf" />}>
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden />
          <label htmlFor="crop-q" className="sr-only">ফসল খুঁজুন</label>
          <input id="crop-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ফসলের নাম লিখুন, যেমন: আলু" className="field pl-12 pr-12" />
          {q && (
            <button type="button" onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-soft hover:bg-cream" aria-label="মুছুন">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </PageHeader>

      <div className="container-page mt-8">
        <div className="flex flex-col gap-3">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="ধরন অনুযায়ী">
            <button type="button" onClick={() => set('cat', 'all')} className={cn('chip shrink-0', cat === 'all' && 'chip-active')} aria-pressed={cat === 'all'}>
              সব ধরন
            </button>
            {cropCategories.map((c) => (
              <button key={c.id} type="button" onClick={() => set('cat', c.id)} className={cn('chip shrink-0', cat === c.id && 'chip-active')} aria-pressed={cat === c.id}>
                <span aria-hidden>{c.icon}</span> {c.nameBn}
              </button>
            ))}
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="মৌসুম অনুযায়ী">
            {SEASONS.map((s) => (
              <button key={s} type="button" onClick={() => set('season', s)} className={cn('chip shrink-0', season === s && 'chip-active')} aria-pressed={season === s}>
                {s === 'all' ? 'সব মৌসুম' : SEASON_BN[s]}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-5 text-sm text-ink-soft" aria-live="polite">
          {toBnDigits(list.length)}টি ফসল পাওয়া গেছে
        </p>
        {list.length ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((c) => (
              <CropCard key={c.id} crop={c} />
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState icon={<Search className="h-8 w-8" />} title="কোনো ফসল পাওয়া যায়নি">
              অন্য নাম লিখে বা ফিল্টার বদলে দেখুন।
            </EmptyState>
          </div>
        )}
      </div>
    </>
  );
}
