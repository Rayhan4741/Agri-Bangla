import { useEffect, useState } from 'react';
import { AlertOctagon, Home, PawPrint, ShieldPlus, Sparkles, Utensils } from 'lucide-react';
import { DataStatusBadge, Notice, PageHeader } from '@/components/common/ui';
import { SpeakButton } from '@/components/common/SpeakButton';
import { ShareButtons } from '@/components/common/ShareButtons';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { VerifyWith } from '@/components/common/VerifyWith';
import { Link } from 'react-router-dom';
import { animals } from '@/lib/data';
import { useHashScroll } from '@/hooks/useHashScroll';
import type { AnimalGuide } from '@/types';
import { cn } from '@/lib/cn';

function plain(a: AnimalGuide) {
  return [a.nameBn, a.overviewBn, 'খাদ্য: ' + a.feedingBn.join('; '), 'সতর্কসংকেত: ' + a.warningSignsBn.join('; ')].join('\n');
}

function Section({ title, icon, items, tone = 'default' }: { title: string; icon: React.ReactNode; items: string[]; tone?: 'default' | 'warn' }) {
  return (
    <div className={cn('rounded-3xl p-5', tone === 'warn' ? 'bg-red-50 ring-1 ring-red-200' : 'bg-white shadow-soft ring-1 ring-forest/5')}>
      <h3 className={cn('flex items-center gap-2 text-lg font-bold', tone === 'warn' && 'text-red-800')}>
        {icon} {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden className={tone === 'warn' ? 'text-red-600' : 'text-primary'}>•</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LivestockPage() {
  const hash = useHashScroll();
  const [active, setActive] = useState(animals.find((a) => a.id === hash)?.id ?? 'cattle');
  useEffect(() => {
    if (animals.some((a) => a.id === hash)) setActive(hash);
  }, [hash]);
  const a = animals.find((x) => x.id === active)!;

  return (
    <>
      <PageHeader eyebrow="প্রাণিসম্পদ" title="গবাদিপশু ও হাঁস-মুরগি" description="খাদ্য, পরিচর্যা, স্বাস্থ্যবিধি, আবাসন এবং রোগের সতর্কসংকেত।" icon={<PawPrint className="h-7 w-7 text-leaf" />} />
      <div className="container-page mt-8">
        <Notice tone="danger" title="জরুরি অবস্থায় দেরি করবেন না">
          পশু-পাখি হঠাৎ অসুস্থ হলে, অনেকগুলো একসাথে অসুস্থ বা মারা গেলে দ্রুত উপজেলা প্রাণিসম্পদ অফিস বা রেজিস্টার্ড পশু চিকিৎসকের সাথে যোগাযোগ করুন। কৃষিবাংলা রোগ নির্ণয় বা ওষুধের মাত্রা দেয় না।
        </Notice>
        <div role="tablist" aria-label="প্রাণী নির্বাচন" className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4">
          {animals.map((x) => (
            <button
              key={x.id}
              role="tab"
              type="button"
              aria-selected={active === x.id}
              onClick={() => setActive(x.id)}
              className={cn('flex min-w-[96px] shrink-0 flex-col items-center gap-1 rounded-3xl p-3 font-semibold transition', active === x.id ? 'bg-forest text-white shadow-lift' : 'bg-white text-forest shadow-soft hover:bg-cream')}
            >
              <span className="text-4xl" aria-hidden>{x.icon}</span>
              {x.nameBn}
            </button>
          ))}
        </div>

        <article id={a.id} className="mt-6 scroll-mt-28 space-y-5" role="tabpanel">
          <div className="card flex flex-wrap items-center gap-4 p-6">
            <span className="text-6xl" aria-hidden>{a.icon}</span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold">{a.nameBn}</h2>
                <DataStatusBadge status={a.dataStatus} />
              </div>
              <p className="mt-1 text-ink-soft">{a.overviewBn}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SpeakButton text={plain(a)} />
              <FavoriteButton id={`/livestock#${a.id}`} title={a.nameBn} />
              <ShareButtons title={`${a.nameBn} পালন`} text={plain(a)} />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Section title="খাদ্য" icon={<Utensils className="h-5 w-5 text-harvest-700" aria-hidden />} items={a.feedingBn} />
            <Section title="রোগের সতর্কসংকেত" icon={<AlertOctagon className="h-5 w-5" aria-hidden />} items={a.warningSignsBn} tone="warn" />
            <Section title="পরিচর্যা ও টিকা" icon={<ShieldPlus className="h-5 w-5 text-primary" aria-hidden />} items={a.careBn} />
            <Section title="স্বাস্থ্যবিধি" icon={<Sparkles className="h-5 w-5 text-sky-600" aria-hidden />} items={a.hygieneBn} />
            <Section title="আবাসন" icon={<Home className="h-5 w-5 text-forest" aria-hidden />} items={a.housingBn} />
          </div>
          <section className="card overflow-hidden">
            <h3 className="border-b border-forest/5 p-5 text-lg font-bold">পরিচিত রোগ (লক্ষণ চেনার জন্য)</h3>
            <div className="divide-y divide-forest/5">
              {a.diseases.map((d) => (
                <div key={d.nameBn} className="grid gap-2 p-5 md:grid-cols-[200px_1fr_1fr]">
                  <p className="font-bold text-forest">{d.nameBn}</p>
                  <p><span className="text-sm font-semibold text-ink-soft">লক্ষণ: </span>{d.signsBn}</p>
                  <p className="text-sm"><span className="font-semibold text-red-800">করণীয়: </span>{d.actionBn}</p>
                </div>
              ))}
            </div>
          </section>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/calculator?tab=feed" className="chip">🧮 পশুখাদ্যের খরচ হিসাব</Link>
            <Link to="/ai-assistant" className="chip">💬 কৃষকবন্ধুকে প্রশ্ন করুন</Link>
          </div>
          <VerifyWith ids={a.verifyWithIds} />
        </article>
      </div>
    </>
  );
}
