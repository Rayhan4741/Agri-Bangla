import { Link } from 'react-router-dom';
import { Fish, Wind } from 'lucide-react';
import { buttonClass, PageHeader, SectionTitle } from '@/components/common/ui';
import { GuideCard } from '@/components/common/GuideCard';
import { VerifyWith } from '@/components/common/VerifyWith';
import { SpeakButton } from '@/components/common/SpeakButton';
import { fisheriesGuides } from '@/lib/data';
import { useHashScroll } from '@/hooks/useHashScroll';

const EMERGENCY = ['খাবার ও সার দেওয়া সাথে সাথে বন্ধ করুন', 'বাঁশ দিয়ে পানি পিটিয়ে বা সাঁতার কেটে বাতাস মেশান', 'সম্ভব হলে পরিষ্কার নতুন পানি দিন বা এয়ারেটর চালান', 'মরা মাছ দ্রুত সরিয়ে ফেলুন', 'সমস্যা চলতে থাকলে উপজেলা মৎস্য কর্মকর্তাকে জানান'];

export default function FisheriesPage() {
  const hash = useHashScroll();
  const order = ['pond-prep', 'species', 'feeding', 'water-quality', 'disease', 'harvest', 'season'];
  const list = [...fisheriesGuides].sort((a, b) => order.indexOf(a.topic) - order.indexOf(b.topic));
  return (
    <>
      <PageHeader eyebrow="মৎস্য চাষ" title="পুকুরে লাভজনক মাছ চাষ" description="পুকুর প্রস্তুতি থেকে আহরণ ও বাজারজাতকরণ পর্যন্ত।" icon={<Fish className="h-7 w-7 text-leaf" />}>
        <Link to="/calculator?tab=pond" className={buttonClass('gold')}>🐟 পোনা মজুদ হিসাব</Link>
      </PageHeader>
      <div className="container-page mt-8 space-y-12">
        <section className="overflow-hidden rounded-4xl bg-gradient-to-br from-[#1F7A8C] to-forest p-6 text-white shadow-lift sm:p-8" aria-labelledby="o2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                <Wind className="h-4 w-4" aria-hidden /> জরুরি অবস্থা
              </p>
              <h2 id="o2" className="mt-3 text-2xl font-bold text-white">ভোরে মাছ পানির ওপরে খাবি খাচ্ছে?</h2>
              <p className="mt-1 text-white/80">এটি সাধারণত অক্সিজেনের ঘাটতির লক্ষণ। এখনই করুন:</p>
            </div>
            <SpeakButton text={`ভোরে মাছ পানির ওপরে খাবি খেলে অক্সিজেনের ঘাটতি হতে পারে। ${EMERGENCY.join('। ')}`} />
          </div>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {EMERGENCY.map((s, i) => (
              <li key={s} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-harvest font-bold text-forest">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </section>
        <section>
          <SectionTitle title="ধাপে ধাপে মাছ চাষ" description="প্রতিটি কার্ডে ট্যাপ করে বিস্তারিত দেখুন।" />
          <div className="grid gap-4 lg:grid-cols-2">
            {list.map((g) => (
              <GuideCard key={g.id} guide={g} defaultOpen={hash === g.id} favHref={`/fisheries#${g.id}`} />
            ))}
          </div>
        </section>
        <VerifyWith ids={['dof']} />
      </div>
    </>
  );
}
