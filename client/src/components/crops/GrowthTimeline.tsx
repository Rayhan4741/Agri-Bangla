import { lazy, Suspense, useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { CheckCircle2, Sprout } from 'lucide-react';
import type { Crop } from '@/types';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { toBnDigits } from '@/lib/formatting';
import { cn } from '@/lib/cn';

const GrowthScene = lazy(() => import('./GrowthScene'));

function canWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Interactive growth timeline: drag the slider to grow the 3D plant through each stage. */
export function GrowthTimeline({ crop }: { crop: Crop }) {
  const n = crop.stages.length;
  const [growth, setGrowth] = useState(0.08);
  const [show3d, setShow3d] = useState(false);
  const reduce = useReducedMotion();
  const stageIndex = Math.min(n - 1, Math.floor(growth * n));

  useEffect(() => {
    setShow3d(canWebGL() && !reduce);
  }, [reduce]);

  const goTo = (i: number) => setGrowth((i + 0.55) / n);
  const stage = crop.stages[stageIndex];

  return (
    <section className="card overflow-hidden" aria-labelledby="growth-title">
      <div className="grid lg:grid-cols-[1.05fr_1fr]">
        <div className="relative bg-[#f2efe2]">
          <div className="aspect-[4/3] w-full">
            {show3d ? (
              <ErrorBoundary fallback={<StaticPlant growth={growth} icon={crop.icon} />} onError={() => setShow3d(false)}>
                <Suspense fallback={<StaticPlant growth={growth} icon={crop.icon} />}>
                  <GrowthScene model={crop.growthModel} cropId={crop.id} growth={growth} />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <StaticPlant growth={growth} icon={crop.icon} />
            )}
          </div>
          <div className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-forest shadow-soft backdrop-blur">
            {show3d ? '৩ডি · ঘুরিয়ে দেখুন' : 'ছবি'} · বৃদ্ধি {toBnDigits(Math.round(growth * 100))}%
          </div>
          <div className="px-5 pb-5 pt-3">
            <label htmlFor="growth-slider" className="mb-2 flex items-center justify-between text-sm font-semibold text-forest">
              <span>স্লাইডার টেনে ফসলের বৃদ্ধি দেখুন</span>
              <span className="text-primary">{stage.nameBn}</span>
            </label>
            <input
              id="growth-slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={growth}
              onChange={(e) => setGrowth(Number(e.target.value))}
              aria-valuetext={`${stage.nameBn} পর্যায়`}
              className="h-3 w-full cursor-pointer accent-primary"
            />
            <div className="mt-1 flex justify-between text-[11px] text-ink-soft" aria-hidden>
              {crop.stages.map((s, i) => (
                <span key={i} className={cn('max-w-[5rem] truncate', i === stageIndex && 'font-bold text-primary')}>
                  {s.nameBn}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <h2 id="growth-title" className="flex items-center gap-2 text-xl font-bold">
            <Sprout className="h-5 w-5 text-primary" aria-hidden /> চাষের ধাপ
          </h2>
          {crop.durationBn && <p className="mt-1 text-sm text-ink-soft">মোট সময়: {crop.durationBn}</p>}
          <ol className="mt-4 space-y-2">
            {crop.stages.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === stageIndex ? 'step' : undefined}
                  className={cn('w-full rounded-2xl p-3 text-left transition', i === stageIndex ? 'bg-primary-50 ring-2 ring-primary/30' : 'hover:bg-cream')}
                >
                  <span className="flex items-center gap-3">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', i < stageIndex ? 'bg-primary text-white' : i === stageIndex ? 'bg-harvest text-forest' : 'bg-cream text-ink-soft')}>
                      {i < stageIndex ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : toBnDigits(i + 1)}
                    </span>
                    <span>
                      <span className="block font-semibold text-forest">{s.nameBn}</span>
                      {s.durationBn && <span className="block text-xs text-ink-soft">{s.durationBn}</span>}
                    </span>
                  </span>
                  {i === stageIndex && (
                    <ul className="mt-3 space-y-1.5 pl-11 text-[15px]">
                      {s.tasksBn.map((t) => (
                        <li key={t} className="list-disc">
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function StaticPlant({ growth, icon }: { growth: number; icon: string }) {
  return (
    <div className="flex h-full w-full items-end justify-center bg-gradient-to-b from-[#eef4e6] to-[#e5d9bd] pb-10">
      <span aria-hidden style={{ fontSize: `${3 + growth * 6}rem`, transition: 'font-size .3s' }}>
        {growth < 0.2 ? '🌱' : icon}
      </span>
    </div>
  );
}
