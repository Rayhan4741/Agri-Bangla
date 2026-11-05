import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { PlantPart, SymptomColor, SymptomPattern } from '@/types';
import { crops, diseases } from '@/lib/data';
import { SpeakButton } from '@/components/common/SpeakButton';
import { DiseaseDetail } from './DiseaseDetail';
import { EmptyState, Notice } from '@/components/common/ui';
import { cn } from '@/lib/cn';

const PARTS: { id: PlantPart; label: string; icon: string }[] = [
  { id: 'leaf', label: 'পাতা', icon: '🍃' },
  { id: 'stem', label: 'কাণ্ড/ডগা', icon: '🌿' },
  { id: 'fruit', label: 'ফল', icon: '🍅' },
  { id: 'grain', label: 'শীষ/দানা', icon: '🌾' },
  { id: 'root', label: 'শিকড়/গোড়া', icon: '🥕' },
  { id: 'whole', label: 'পুরো গাছ', icon: '🪴' },
];
const COLORS: { id: SymptomColor; label: string; hex: string }[] = [
  { id: 'yellow', label: 'হলুদ', hex: '#E9C33B' },
  { id: 'brown', label: 'বাদামি', hex: '#8B5A2B' },
  { id: 'black', label: 'কালো', hex: '#222' },
  { id: 'white', label: 'সাদা', hex: '#F4F4F0' },
  { id: 'grey', label: 'ধূসর', hex: '#9aa0a6' },
  { id: 'red', label: 'লাল/বেগুনি', hex: '#B03A48' },
  { id: 'green', label: 'সবুজই আছে', hex: '#4f9a35' },
];
const PATTERNS: { id: SymptomPattern; label: string; icon: string }[] = [
  { id: 'spots', label: 'দাগ/ছোপ', icon: '⚫' },
  { id: 'stripes', label: 'লম্বা দাগ/শিরা', icon: '〰️' },
  { id: 'curl', label: 'কোঁকড়ানো', icon: '🌀' },
  { id: 'wilting', label: 'ঢলে পড়া', icon: '🥀' },
  { id: 'dry', label: 'শুকিয়ে যাওয়া', icon: '🍂' },
  { id: 'rot', label: 'পচন', icon: '🦠' },
  { id: 'holes', label: 'ছিদ্র', icon: '🕳️' },
  { id: 'powder', label: 'পাউডারের মতো', icon: '🌫️' },
  { id: 'stunted', label: 'গাছ খাটো', icon: '📉' },
  { id: 'insects', label: 'পোকা দেখা যায়', icon: '🐛' },
];

/** Picture-based symptom finder for users who prefer tapping over typing. */
export function SymptomWizard() {
  const [cropId, setCropId] = useState('');
  const [part, setPart] = useState<PlantPart | null>(null);
  const [color, setColor] = useState<SymptomColor | null>(null);
  const [pattern, setPattern] = useState<SymptomPattern | null>(null);
  const step = !part ? 1 : !color ? 2 : !pattern ? 3 : 4;

  const results = useMemo(() => {
    if (step < 4) return [];
    return diseases
      .map((d) => {
        let s = 0;
        if (part && d.parts.includes(part)) s += 1;
        if (color && d.colors.includes(color)) s += 1;
        if (pattern && d.patterns.includes(pattern)) s += 1.2;
        if (cropId) s += d.cropIds.includes(cropId) ? 2 : -3;
        return { d, s };
      })
      .filter((x) => x.s >= (cropId ? 3.2 : 2))
      .sort((a, b) => b.s - a.s)
      .slice(0, 5);
  }, [step, part, color, pattern, cropId]);

  const reset = () => {
    setPart(null);
    setColor(null);
    setPattern(null);
  };
  const tile = 'flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center font-semibold transition';

  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="wz-crop" className="label">ফসল (ঐচ্ছিক)</label>
            <select id="wz-crop" className="field" value={cropId} onChange={(e) => setCropId(e.target.value)}>
              <option value="">সব ফসল</option>
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.nameBn}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={reset} className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-4 font-semibold text-ink-soft hover:bg-cream">
            <RotateCcw className="h-4 w-4" aria-hidden /> আবার শুরু
          </button>
        </div>

        <ol className="mt-5 flex gap-2 text-sm" aria-label="ধাপ">
          {['অংশ', 'রং', 'ধরন', 'ফলাফল'].map((s, i) => (
            <li key={s} className={cn('flex-1 rounded-full py-1.5 text-center font-semibold', step > i + 1 ? 'bg-primary text-white' : step === i + 1 ? 'bg-harvest text-forest' : 'bg-cream text-ink-soft')}>
              {s}
            </li>
          ))}
        </ol>

        <fieldset className="mt-6">
          <legend className="mb-3 flex items-center gap-2 text-lg font-bold text-forest">
            ১. গাছের কোন অংশে সমস্যা? <SpeakButton compact text="গাছের কোন অংশে সমস্যা? পাতা, কাণ্ড, ফল, শীষ, শিকড় না পুরো গাছ?" />
          </legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {PARTS.map((p) => (
              <button key={p.id} type="button" aria-pressed={part === p.id} onClick={() => setPart(p.id)} className={cn(tile, part === p.id ? 'border-primary bg-primary-50' : 'border-transparent bg-cream hover:border-primary/30')}>
                <span className="text-3xl" aria-hidden>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>

        {part && (
          <fieldset className="mt-6">
            <legend className="mb-3 text-lg font-bold text-forest">২. আক্রান্ত অংশের রং কেমন?</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
              {COLORS.map((c) => (
                <button key={c.id} type="button" aria-pressed={color === c.id} onClick={() => setColor(c.id)} className={cn(tile, color === c.id ? 'border-primary bg-primary-50' : 'border-transparent bg-cream hover:border-primary/30')}>
                  <span className="h-9 w-9 rounded-full ring-2 ring-white" style={{ background: c.hex, boxShadow: '0 0 0 1px rgba(0,0,0,.15)' }} aria-hidden />
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {color && (
          <fieldset className="mt-6">
            <legend className="mb-3 text-lg font-bold text-forest">৩. কেমন দেখাচ্ছে?</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {PATTERNS.map((p) => (
                <button key={p.id} type="button" aria-pressed={pattern === p.id} onClick={() => setPattern(p.id)} className={cn(tile, pattern === p.id ? 'border-primary bg-primary-50' : 'border-transparent bg-cream hover:border-primary/30')}>
                  <span className="text-3xl" aria-hidden>{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      {step === 4 && (
        <section aria-live="polite" className="space-y-4">
          <Notice tone="warn" title="সম্ভাব্য কারণ — নিশ্চিত রোগ নির্ণয় নয়">
            বাছাই করা লক্ষণের সাথে মিল আছে এমন রোগ-পোকা দেখানো হচ্ছে। একই লক্ষণ অন্য কারণেও হতে পারে। নিশ্চিত হতে উপসহকারী কৃষি কর্মকর্তাকে দেখান।
          </Notice>
          {results.length ? (
            results.map(({ d, s }, i) => <DiseaseDetail key={d.id} d={d} defaultOpen={i === 0} match={s >= (cropId ? 5 : 3) ? 'high' : s >= (cropId ? 4 : 2.2) ? 'medium' : 'low'} />)
          ) : (
            <EmptyState title="মিল পাওয়া যায়নি">ভিন্ন রং বা ধরন বেছে দেখুন, অথবা “লক্ষণ লিখে খুঁজুন” অংশে লক্ষণ লিখুন।</EmptyState>
          )}
        </section>
      )}
    </div>
  );
}
