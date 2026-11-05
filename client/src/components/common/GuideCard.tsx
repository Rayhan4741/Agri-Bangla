import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { TopicGuide } from '@/types';
import { DataStatusBadge } from './ui';
import { SpeakButton } from './SpeakButton';
import { VerifyWith } from './VerifyWith';
import { FavoriteButton } from './FavoriteButton';
import { cn } from '@/lib/cn';

/** Expandable card for fertilizer / irrigation / fisheries topic guides. */
export function GuideCard({ guide, defaultOpen = false, favHref }: { guide: TopicGuide; defaultOpen?: boolean; favHref: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const text = [guide.titleBn, guide.summaryBn, ...guide.pointsBn, guide.cautionBn ?? ''].join('। ');
  return (
    <article id={guide.id} className="card scroll-mt-28 overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-4 p-5 text-left sm:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cream text-2xl" aria-hidden>
          {guide.icon}
        </span>
        <span className="flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-forest">{guide.titleBn}</span>
            <DataStatusBadge status={guide.dataStatus} />
          </span>
          <span className="mt-1 block text-ink-soft">{guide.summaryBn}</span>
        </span>
        <ChevronDown className={cn('mt-1 h-5 w-5 shrink-0 text-ink-soft transition', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="border-t border-forest/5 px-5 pb-6 pt-4 sm:px-6">
          <ul className="space-y-2.5">
            {guide.pointsBn.map((p, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">{i + 1}</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          {guide.cautionBn && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">⚠️ {guide.cautionBn}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SpeakButton text={text} />
            <FavoriteButton id={favHref} title={guide.titleBn} />
          </div>
          <VerifyWith ids={guide.verifyWithIds} className="mt-4" compact />
        </div>
      )}
    </article>
  );
}
