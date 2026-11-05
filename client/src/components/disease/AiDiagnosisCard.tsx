import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, CheckCircle2, ClipboardCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { LIKELIHOOD_BN, type DiagnoseResponse } from '@/lib/api';
import { getDisease } from '@/lib/data';
import { cn } from '@/lib/cn';
import { SpeakButton } from '@/components/common/SpeakButton';

const TONE = {
  high: 'bg-red-50 text-red-800 ring-red-200',
  medium: 'bg-amber-50 text-amber-900 ring-amber-200',
  low: 'bg-slate-50 text-slate-700 ring-slate-200',
} as const;

export function diagnosisToText(d: DiagnoseResponse) {
  const r = d.result;
  return [
    r.summaryBn,
    ...r.possibilities.map((p, i) => `${i + 1}. ${p.nameBn} (${LIKELIHOOD_BN[p.likelihood]}) — ${p.reasonsBn.join(', ')}`),
    r.safeStepsBn.length ? `করণীয়: ${r.safeStepsBn.join('। ')}` : '',
    r.seeExpertBn,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Shows an AI photo assessment as possibilities — never as a diagnosis. */
export function AiDiagnosisCard({ data, compact = false }: { data: DiagnoseResponse; compact?: boolean }) {
  const r = data.result;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
          <Sparkles className="h-3.5 w-3.5" aria-hidden /> AI-এর সম্ভাব্য অনুমান · {data.model}
        </span>
        <SpeakButton text={diagnosisToText(data)} compact />
      </div>

      {r.imageQuality !== 'good' && (
        <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          {r.imageQuality === 'not-a-plant'
            ? 'ছবিতে গাছ বা পাতা স্পষ্ট বোঝা যাচ্ছে না। আক্রান্ত অংশের কাছ থেকে, দিনের আলোয় আবার ছবি তুলুন।'
            : 'ছবিটি পরিষ্কার নয়, তাই অনুমান দুর্বল। কাছ থেকে, ফোকাস করে, দিনের আলোয় আবার ছবি তুলুন।'}
        </p>
      )}

      {r.summaryBn && <p className="leading-relaxed">{r.summaryBn}</p>}

      {r.possibilities.length > 0 ? (
        <ol className="space-y-3">
          {r.possibilities.map((p, i) => {
            const match = data.matches[i];
            const guide = match ? getDisease(match.diseaseId) : undefined;
            return (
              <li key={`${p.nameEn}-${i}`} className="rounded-2xl bg-white p-4 ring-1 ring-forest/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-forest">
                    {i + 1}. {p.nameBn} <span className="text-sm font-normal text-ink-soft">({p.nameEn})</span>
                  </p>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', TONE[p.likelihood])}>{LIKELIHOOD_BN[p.likelihood]}</span>
                </div>
                {p.reasonsBn.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {p.reasonsBn.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                )}
                {!compact && p.checkBn.length > 0 && (
                  <div className="mt-3 rounded-xl bg-cream p-3 text-sm">
                    <p className="mb-1 flex items-center gap-1.5 font-semibold">
                      <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden /> নিশ্চিত হতে মাঠে দেখুন
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      {p.checkBn.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {guide && match && (
                  <Link to={match.href} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline">
                    <BookOpen className="h-4 w-4" aria-hidden /> কৃষিবাংলার নির্দেশিকা: {guide.nameBn}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-ink-soft">ছবি থেকে কোনো নির্দিষ্ট সমস্যা অনুমান করা যায়নি।</p>
      )}

      {r.safeStepsBn.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> এখনই যা করা নিরাপদ
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {r.safeStepsBn.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
        <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          {data.disclaimerBn}
          {r.seeExpertBn ? ` ${r.seeExpertBn}` : ''}
          {data.dosesRemoved ? ' (AI-এর দেওয়া রাসায়নিকের মাত্রা নিরাপত্তার জন্য সরিয়ে রাখা হয়েছে—লেবেল ও কৃষি অফিসারের পরামর্শ মানুন।)' : ''}
        </span>
      </p>
    </div>
  );
}
