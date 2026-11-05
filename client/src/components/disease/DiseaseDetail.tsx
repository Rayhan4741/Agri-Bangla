import { useState } from 'react';
import { BadgeCheck, ChevronDown, ExternalLink, ShieldAlert } from 'lucide-react';
import type { CropDisease } from '@/types';
import { Badge, DataStatusBadge } from '@/components/common/ui';
import { SpeakButton } from '@/components/common/SpeakButton';
import { ShareButtons } from '@/components/common/ShareButtons';
import { VerifyWith } from '@/components/common/VerifyWith';
import { cropsForDisease, DISEASE_TYPE_BN } from '@/lib/data';
import { cn } from '@/lib/cn';

export function diseasePlainText(d: CropDisease) {
  return [
    `${d.nameBn}`,
    `লক্ষণ: ${d.symptomsBn.join('; ')}`,
    `কারণ: ${d.causeBn} ${d.favorableConditionsBn}`,
    `প্রতিরোধ: ${d.preventionBn.join('; ')}`,
    `এখন যা করবেন: ${d.safeNextStepsBn.join('; ')}`,
    d.whenToSeekHelpBn,
  ].join('\n');
}

export function DiseaseDetail({ d, defaultOpen = false, match }: { d: CropDisease; defaultOpen?: boolean; match?: 'high' | 'medium' | 'low' }) {
  const [open, setOpen] = useState(defaultOpen);
  const crops = cropsForDisease(d);
  return (
    <article id={`d-${d.id}`} className={cn('card scroll-mt-28 overflow-hidden', defaultOpen && 'ring-2 ring-primary/40')}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-4 p-5 text-left">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={d.type === 'pest' ? 'gold' : d.type === 'nutrient' ? 'blue' : 'red'}>{DISEASE_TYPE_BN[d.type]}</Badge>
            {match && (
              <Badge tone={match === 'high' ? 'green' : match === 'medium' ? 'gold' : 'grey'}>
                লক্ষণের মিল: {match === 'high' ? 'বেশি' : match === 'medium' ? 'মাঝারি' : 'কম'}
              </Badge>
            )}
            <span className="text-xs text-ink-soft">{crops.map((c) => `${c.icon} ${c.nameBn}`).join(' · ')}</span>
          </div>
          <h3 className="mt-2 text-lg font-bold text-forest">{d.nameBn}</h3>
          <p className="mt-1 text-ink-soft">{d.symptomsBn[0]}</p>
        </div>
        <ChevronDown className={cn('mt-1 h-5 w-5 shrink-0 text-ink-soft transition', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="grid gap-5 border-t border-forest/5 px-5 pb-6 pt-4 md:grid-cols-2">
          <div>
            <h4 className="font-bold">লক্ষণ</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {d.symptomsBn.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <h4 className="mt-4 font-bold">কারণ ও অনুকূল পরিবেশ</h4>
            <p className="mt-1">{d.causeBn} {d.favorableConditionsBn}</p>
            <h4 className="mt-4 font-bold">প্রতিরোধ</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {d.preventionBn.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="rounded-2xl bg-primary-50 p-4">
              <h4 className="font-bold text-primary-700">এখনই নিরাপদে যা করতে পারেন</h4>
              <ul className="mt-2 space-y-1.5">
                {d.safeNextStepsBn.map((s) => (
                  <li key={s} className="flex gap-2">
                    <span aria-hidden>✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-3 flex gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden /> {d.whenToSeekHelpBn}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <DataStatusBadge status={d.dataStatus} />
              <SpeakButton text={diseasePlainText(d)} />
              <ShareButtons title={d.nameBn} text={diseasePlainText(d)} />
            </div>
            <VerifyWith ids={d.verifyWithIds} className="mt-3" compact />
          </div>
          {d.sourcedFactsBn && d.sourcedFactsBn.length > 0 && (
            <div className="rounded-2xl bg-white p-4 ring-1 ring-primary/25 md:col-span-2">
              <h4 className="flex items-center gap-1.5 font-bold text-primary-700">
                <BadgeCheck className="h-5 w-5" aria-hidden /> সরকারি উৎস থেকে যাচাই করা তথ্য
              </h4>
              <ul className="mt-2 space-y-2">
                {d.sourcedFactsBn.map((f) => (
                  <li key={f.textBn} className="text-sm">
                    <p>{f.textBn}</p>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline">
                      উৎস: {f.sourceBn} <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                    <span className="ml-1 text-xs text-ink-soft">· যাচাই {f.checked}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
