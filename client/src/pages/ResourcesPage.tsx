import { useState } from 'react';
import { ExternalLink, Landmark } from 'lucide-react';
import { DataStatusBadge, Notice, PageHeader } from '@/components/common/ui';
import { governmentResources } from '@/lib/data';
import { formatDateBn } from '@/lib/formatting';
import type { GovernmentResource } from '@/types';
import { cn } from '@/lib/cn';

const CAT_BN: Record<GovernmentResource['category'], string> = {
  ministry: 'মন্ত্রণালয়',
  extension: 'সম্প্রসারণ ও তথ্য',
  research: 'গবেষণা',
  livestock: 'প্রাণিসম্পদ',
  fisheries: 'মৎস্য',
  market: 'বাজার',
  weather: 'আবহাওয়া',
  university: 'বিশ্ববিদ্যালয়',
};

export default function ResourcesPage() {
  const [cat, setCat] = useState<GovernmentResource['category'] | 'all'>('all');
  const cats = [...new Set(governmentResources.map((r) => r.category))];
  const list = governmentResources.filter((r) => cat === 'all' || r.category === cat);
  return (
    <>
      <PageHeader eyebrow="সরকারি সেবা" title="সরকারি কৃষি প্রতিষ্ঠান" description="পরামর্শ, প্রশিক্ষণ, গবেষণা ও সতর্কবার্তার জন্য সরকারি ওয়েবসাইট।" icon={<Landmark className="h-7 w-7 text-leaf" />} />
      <div className="container-page mt-8 space-y-6">
        <Notice tone="info" title="যেভাবে যাচাই করা হয়েছে">
          প্রতিটি ঠিকানার পাশে যাচাইয়ের ধরন ও তারিখ লেখা আছে। কৃষিবাংলা কোনো ফোন নম্বর, সেবার প্রাপ্যতা, যোগ্যতা বা আবেদনের সময়সীমা দেয় না—এসব তথ্য সরাসরি প্রতিষ্ঠানের ওয়েবসাইট বা আপনার উপজেলা অফিস থেকে জেনে নিন।
        </Notice>
        <div className="flex flex-wrap gap-2" role="group" aria-label="ধরন">
          <button type="button" onClick={() => setCat('all')} aria-pressed={cat === 'all'} className={cn('chip', cat === 'all' && 'chip-active')}>
            সব
          </button>
          {cats.map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={cn('chip', cat === c && 'chip-active')}>
              {CAT_BN[c]}
            </button>
          ))}
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {list.map((r) => (
            <li key={r.id} className="card flex flex-col p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-semibold text-forest">{CAT_BN[r.category]}</span>
                <DataStatusBadge status={r.verificationStatus} />
              </div>
              <h2 className="mt-3 text-xl font-bold">{r.nameBn}</h2>
              <p className="font-en text-sm text-ink-soft">{r.nameEn}</p>
              <p className="mt-2 flex-1">{r.descriptionBn}</p>
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-[44px] w-fit items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-white hover:bg-primary-700">
                <span className="font-en">{r.url.replace(/^https:\/\//, '').replace(/\/$/, '')}</span>
                <ExternalLink className="h-4 w-4" aria-hidden />
                <span className="sr-only">(নতুন ট্যাবে খুলবে)</span>
              </a>
              <p className="mt-3 text-xs text-ink-soft">
                {r.verificationNoteBn} {r.lastVerified && `· যাচাইয়ের তারিখ: ${formatDateBn(new Date(`${r.lastVerified}T00:00:00`))}`}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
