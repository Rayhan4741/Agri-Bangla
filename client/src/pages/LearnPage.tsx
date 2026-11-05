import { useMemo, useState } from 'react';
import { BookOpen, Check, Clock, Search, X } from 'lucide-react';
import { DataStatusBadge, PageHeader, SectionTitle } from '@/components/common/ui';
import { SpeakButton } from '@/components/common/SpeakButton';
import { VerifyWith } from '@/components/common/VerifyWith';
import { glossary, learningResources } from '@/lib/data';
import { normalize } from '@/lib/search';
import { toBnDigits } from '@/lib/formatting';
import { useHashScroll } from '@/hooks/useHashScroll';
import { useStored } from '@/hooks/useStored';
import type { LearningResource } from '@/types';
import { cn } from '@/lib/cn';

function Quiz({ lesson }: { lesson: LearningResource }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [, setScores] = useStored<Record<string, number>>('quizScores', {});
  const score = Object.entries(answers).filter(([q, a]) => lesson.quiz[Number(q)].answerIndex === a).length;
  const finished = Object.keys(answers).length === lesson.quiz.length;
  return (
    <div className="mt-5 space-y-4 rounded-3xl bg-cream p-4 sm:p-5">
      <p className="font-bold">যাচাই করুন কতটা শিখলেন</p>
      {lesson.quiz.map((q, qi) => {
        const chosen = answers[qi];
        return (
          <fieldset key={qi}>
            <legend className="mb-2 font-semibold">{toBnDigits(qi + 1)}. {q.qBn}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {q.optionsBn.map((o, oi) => {
                const isAns = oi === q.answerIndex;
                const picked = chosen === oi;
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={chosen !== undefined}
                    onClick={() => {
                      const next = { ...answers, [qi]: oi };
                      setAnswers(next);
                      if (Object.keys(next).length === lesson.quiz.length) {
                        const s = Object.entries(next).filter(([k, v]) => lesson.quiz[Number(k)].answerIndex === v).length;
                        setScores((sc) => ({ ...sc, [lesson.id]: Math.max(sc[lesson.id] ?? 0, s) }));
                      }
                    }}
                    className={cn(
                      'flex min-h-[48px] items-center justify-between gap-2 rounded-2xl border-2 bg-white px-4 text-left font-medium transition disabled:cursor-default',
                      chosen === undefined && 'border-transparent hover:border-primary/40',
                      chosen !== undefined && isAns && 'border-primary bg-primary-50',
                      picked && !isAns && 'border-red-300 bg-red-50',
                      chosen !== undefined && !isAns && !picked && 'border-transparent opacity-60',
                    )}
                  >
                    {o}
                    {chosen !== undefined && isAns && <Check className="h-5 w-5 text-primary" aria-label="সঠিক" />}
                    {picked && !isAns && <X className="h-5 w-5 text-red-600" aria-label="ভুল" />}
                  </button>
                );
              })}
            </div>
            {chosen !== undefined && <p className="mt-2 text-sm text-ink-soft" role="status">{q.explainBn}</p>}
          </fieldset>
        );
      })}
      {finished && (
        <p className="rounded-2xl bg-white p-3 font-bold text-primary-700" role="status">
          আপনার স্কোর: {toBnDigits(score)}/{toBnDigits(lesson.quiz.length)} {score === lesson.quiz.length ? '🎉 চমৎকার!' : ''}
        </p>
      )}
    </div>
  );
}

export default function LearnPage() {
  const hash = useHashScroll();
  const [open, setOpen] = useState<string | null>(learningResources.find((l) => l.id === hash)?.id ?? null);
  const [q, setQ] = useState('');
  const [scores] = useStored<Record<string, number>>('quizScores', {});
  const terms = useMemo(() => glossary.filter((g) => !q || normalize(`${g.termBn} ${g.termEn} ${g.definitionBn}`).includes(normalize(q))), [q]);

  return (
    <>
      <PageHeader eyebrow="শিখন কেন্দ্র" title="ছোট পাঠ, বড় শিক্ষা" description="কয়েক মিনিটের সহজ পাঠ ও কুইজ, আর কৃষি শব্দকোষ।" icon={<BookOpen className="h-7 w-7 text-leaf" />} />
      <div className="container-page mt-8 space-y-14">
        <section>
          <SectionTitle title="পাঠসমূহ" />
          <div className="grid gap-4 lg:grid-cols-2">
            {learningResources.map((l) => {
              const isOpen = open === l.id;
              return (
                <article key={l.id} id={l.id} className={cn('card scroll-mt-28 p-5 sm:p-6', isOpen && 'lg:col-span-2')}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : l.id)} aria-expanded={isOpen} className="flex w-full items-start gap-4 text-left">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cream text-3xl" aria-hidden>{l.icon}</span>
                    <span className="flex-1">
                      <span className="block text-lg font-bold text-forest">{l.titleBn}</span>
                      <span className="block text-ink-soft">{l.summaryBn}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden /> {toBnDigits(l.minutes)} মিনিট</span>
                        {scores[l.id] !== undefined && <span className="font-semibold text-primary">সেরা স্কোর {toBnDigits(scores[l.id])}/{toBnDigits(l.quiz.length)}</span>}
                      </span>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="mt-5">
                      <ul className="space-y-3">
                        {l.contentBn.map((p, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">{toBnDigits(i + 1)}</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <DataStatusBadge status={l.dataStatus} />
                        <SpeakButton text={[l.titleBn, ...l.contentBn].join('। ')} />
                      </div>
                      <Quiz lesson={l} />
                      <VerifyWith ids={l.verifyWithIds} className="mt-4" compact />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
        <section id="glossary" className="scroll-mt-28">
          <SectionTitle title="কৃষি শব্দকোষ" description={`${toBnDigits(glossary.length)}টি প্রচলিত কৃষি শব্দের সহজ ব্যাখ্যা।`} />
          <div className="relative mb-5 max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden />
            <label htmlFor="gl-q" className="sr-only">শব্দ খুঁজুন</label>
            <input id="gl-q" className="field pl-12" placeholder="শব্দ খুঁজুন" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {terms.map((g) => (
              <div key={g.id} className="card p-4">
                <dt className="font-bold text-forest">
                  {g.termBn} <span className="font-en text-xs font-medium text-ink-soft">{g.termEn}</span>
                </dt>
                <dd className="mt-1 text-sm">{g.definitionBn}</dd>
              </div>
            ))}
          </dl>
          {!terms.length && <p className="text-ink-soft">কোনো শব্দ মেলেনি।</p>}
        </section>
      </div>
    </>
  );
}
