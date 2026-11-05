import { useState } from 'react';
import { CalendarDays, CalendarPlus, CheckCircle2, Circle } from 'lucide-react';
import { Button, Card, DataStatusBadge, Notice, PageHeader, SectionTitle } from '@/components/common/ui';
import { VerifyWith } from '@/components/common/VerifyWith';
import { calendarData, crops, getCrop, SEASON_BN } from '@/lib/data';
import { buildIcs, downloadText } from '@/lib/ics';
import { BN_MONTHS, toBnDigits } from '@/lib/formatting';
import { STORE_KEYS, useStored } from '@/hooks/useStored';
import type { SeasonId } from '@/types';
import { cn } from '@/lib/cn';

const SEG_COLORS = ['#77C66E', '#21864A', '#E9B44C'];

function nextDateForMonth(month: number) {
  const now = new Date();
  const year = month - 1 < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(year, month - 1, 1);
}

export default function CalendarPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [season, setSeason] = useState<SeasonId | 'all'>('all');
  const [cropId, setCropId] = useState('');
  const [done, setDone] = useStored<Record<string, boolean>>(STORE_KEYS.calendarDone, {});
  const year = nextDateForMonth(month).getFullYear();
  const m = calendarData.months.find((x) => x.month === month)!;
  const tasks = m.tasks.filter((t) => !cropId || t.cropId === cropId);
  const key = (id: string) => `${year}:${id}`;
  const doneCount = tasks.filter((t) => done[key(t.id)]).length;

  const timelines = calendarData.cropTimelines.filter((t) => {
    const c = getCrop(t.cropId);
    if (!c) return false;
    if (cropId && t.cropId !== cropId) return false;
    if (season !== 'all' && !c.seasons.includes(season)) return false;
    return true;
  });

  const exportIcs = (scope: 'month' | 'year') => {
    const months = scope === 'month' ? [m] : calendarData.months;
    const events = months.flatMap((mm) =>
      mm.tasks
        .filter((t) => !cropId || t.cropId === cropId)
        .map((t) => ({
          uid: `${t.id}-${nextDateForMonth(mm.month).getFullYear()}`,
          title: `${getCrop(t.cropId)?.nameBn ?? t.stageBn}: ${t.taskBn}`,
          description: `${mm.focusBn}\n${calendarData.variationNoteBn}\n— কৃষিবাংলা (নমুনা তথ্য)`,
          date: nextDateForMonth(mm.month),
        })),
    );
    downloadText(scope === 'month' ? `krishibangla-${m.month}.ics` : 'krishibangla-calendar.ics', buildIcs(events));
  };

  return (
    <>
      <PageHeader eyebrow="কৃষি ক্যালেন্ডার" title="মাসভিত্তিক কৃষি কাজ" description="কোন মাসে কী করবেন, কোন ফসল কোন পর্যায়ে — এক নজরে।" icon={<CalendarDays className="h-7 w-7 text-leaf" />} />
      <div className="container-page mt-8 space-y-10">
        <Notice tone="sample">{calendarData.variationNoteBn}</Notice>

        <div className="flex flex-wrap items-end gap-4">
          <div className="no-scrollbar -mx-4 flex flex-1 gap-1.5 overflow-x-auto px-4" role="tablist" aria-label="মাস">
            {calendarData.months.map((x) => (
              <button
                key={x.month}
                role="tab"
                type="button"
                aria-selected={month === x.month}
                onClick={() => setMonth(x.month)}
                className={cn(
                  'relative min-h-[48px] shrink-0 rounded-2xl px-3.5 text-sm font-semibold transition',
                  month === x.month ? 'bg-forest text-white shadow-lift' : 'bg-white text-forest shadow-soft hover:bg-cream',
                )}
              >
                {x.nameBn}
                {x.month === now.getMonth() + 1 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-harvest" aria-label="এই মাস" />}
              </button>
            ))}
          </div>
          <div className="w-full sm:w-64">
            <label htmlFor="cal-crop" className="label">ফসল</label>
            <select id="cal-crop" className="field" value={cropId} onChange={(e) => setCropId(e.target.value)}>
              <option value="">সব ফসল</option>
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.nameBn}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-4xl bg-forest p-6 text-white shadow-lift sm:p-8">
            <p className="text-sm text-leaf">{m.banglaMonthsBn} · {SEASON_BN[m.seasonId]} মৌসুম</p>
            <h2 className="mt-2 text-4xl font-bold text-white">{m.nameBn}</h2>
            <p className="mt-3 text-lg text-white/85">{m.focusBn}</p>
            <div className="mt-6">
              <div className="mb-1 flex justify-between text-sm text-white/75">
                <span>অগ্রগতি</span>
                <span>{toBnDigits(doneCount)}/{toBnDigits(tasks.length)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-harvest transition-all" style={{ width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="gold" onClick={() => exportIcs('month')}>
                <CalendarPlus className="h-4 w-4" aria-hidden /> এই মাস ফোনের ক্যালেন্ডারে
              </Button>
              <Button variant="glass" onClick={() => exportIcs('year')}>
                সারা বছর (.ics)
              </Button>
            </div>
            <p className="mt-3 text-xs text-white/60">.ics ফাইলটি খুললে Google Calendar বা ফোনের ক্যালেন্ডারে রিমাইন্ডারসহ কাজগুলো যোগ হবে।</p>
          </div>
          <Card>
            <h3 className="text-lg font-bold">কাজের তালিকা</h3>
            {tasks.length ? (
              <ul className="mt-4 space-y-2">
                {tasks.map((t) => {
                  const c = getCrop(t.cropId);
                  const isDone = !!done[key(t.id)];
                  return (
                    <li key={t.id}>
                      <button type="button" onClick={() => setDone((d) => ({ ...d, [key(t.id)]: !isDone }))} aria-pressed={isDone} className={cn('flex w-full items-start gap-3 rounded-2xl p-3 text-left transition', isDone ? 'bg-primary-50' : 'hover:bg-cream')}>
                        {isDone ? <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden /> : <Circle className="mt-0.5 h-6 w-6 shrink-0 text-ink-soft/50" aria-hidden />}
                        <span>
                          <span className="block text-sm font-semibold text-primary-700">
                            {c ? `${c.icon} ${c.nameBn}` : '📌'} · {t.stageBn}
                          </span>
                          <span className={cn('block', isDone && 'text-ink-soft line-through')}>{t.taskBn}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-ink-soft">এই মাসে নির্বাচিত ফসলের কোনো কাজ তালিকায় নেই।</p>
            )}
            <div className="mt-4 flex items-center gap-2">
              <DataStatusBadge status={calendarData.dataStatus} />
              <span className="text-xs text-ink-soft">টিক চিহ্ন শুধু এই ব্রাউজারে সংরক্ষিত হয়।</span>
            </div>
          </Card>
        </div>

        <section>
          <SectionTitle title="ফসলের পর্যায়ের সময়রেখা" description="প্রতিটি সারি একটি ফসল; রঙিন অংশ সেই পর্যায়ের আনুমানিক মাস।" />
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="মৌসুম">
            {(['all', 'rabi', 'kharif-1', 'kharif-2', 'year-round'] as const).map((s) => (
              <button key={s} type="button" aria-pressed={season === s} onClick={() => setSeason(s)} className={cn('chip', season === s && 'chip-active')}>
                {s === 'all' ? 'সব মৌসুম' : SEASON_BN[s]}
              </button>
            ))}
          </div>
          <Card className="overflow-x-auto p-4">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[140px_repeat(12,1fr)] gap-y-2 text-xs">
                <div />
                {BN_MONTHS.map((mn, i) => (
                  <div key={mn} className={cn('text-center font-semibold', i + 1 === month ? 'text-primary' : 'text-ink-soft')}>
                    {mn.slice(0, 3)}
                  </div>
                ))}
                {timelines.map((tl) => {
                  const c = getCrop(tl.cropId)!;
                  const cells: { col: number; span: number; label: string; color: string }[] = [];
                  tl.segments.forEach((sg, i) => {
                    const color = SEG_COLORS[i % SEG_COLORS.length];
                    if (sg.endMonth >= sg.startMonth) cells.push({ col: sg.startMonth, span: sg.endMonth - sg.startMonth + 1, label: sg.stageBn, color });
                    else {
                      cells.push({ col: sg.startMonth, span: 12 - sg.startMonth + 1, label: sg.stageBn, color });
                      cells.push({ col: 1, span: sg.endMonth, label: sg.stageBn, color });
                    }
                  });
                  return (
                    <div key={tl.cropId} className="contents">
                      <div className="flex items-center gap-1.5 pr-2 text-sm font-semibold text-forest" style={{ gridColumn: 1 }}>
                        <span aria-hidden>{c.icon}</span> {c.nameBn}
                      </div>
                      <div className="relative h-9 rounded-xl bg-cream" style={{ gridColumn: '2 / span 12' }}>
                        <div className="absolute inset-0 grid grid-cols-12 gap-0.5 p-0.5">
                          {cells.map((cell, k) => (
                            <div key={k} className="flex items-center overflow-hidden rounded-lg px-1.5 text-[11px] font-semibold text-forest" style={{ gridColumn: `${cell.col} / span ${cell.span}`, gridRow: 1, background: cell.color }} title={`${c.nameBn}: ${cell.label}`}>
                              <span className="truncate">{cell.label}</span>
                            </div>
                          ))}
                        </div>
                        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-red-500/60" style={{ left: `${((now.getMonth() + now.getDate() / 31) / 12) * 100}%` }} aria-hidden />
                      </div>
                    </div>
                  );
                })}
              </div>
              {!timelines.length && <p className="p-4 text-ink-soft">এই ফিল্টারে কোনো সময়রেখা নেই।</p>}
              <p className="mt-3 text-xs text-ink-soft">লাল দাগ = আজকের তারিখ। মাসের নাম সংক্ষেপে দেখানো।</p>
            </div>
          </Card>
        </section>
        <VerifyWith ids={calendarData.verifyWithIds} />
      </div>
    </>
  );
}
