import { Link } from 'react-router-dom';
import { Calculator, FlaskConical } from 'lucide-react';
import { buttonClass, Notice, PageHeader, SectionTitle } from '@/components/common/ui';
import { GuideCard } from '@/components/common/GuideCard';
import { VerifyWith } from '@/components/common/VerifyWith';
import { fertilizerGuides, irrigationGuides } from '@/lib/data';
import { useHashScroll } from '@/hooks/useHashScroll';

export default function FertilizerPage() {
  const hash = useHashScroll();
  return (
    <>
      <PageHeader eyebrow="মাটি, সার ও সেচ" title="সুস্থ মাটি, সঠিক সার" description="মাটি পরীক্ষা, সুষম ও জৈব সার, নিরাপদ ব্যবহার এবং পানি সাশ্রয়ী সেচ।" icon={<FlaskConical className="h-7 w-7 text-leaf" />}>
        <Link to="/calculator?tab=fertilizer" className={buttonClass('gold')}>
          <Calculator className="h-5 w-5" aria-hidden /> সারের পরিমাণ হিসাব করুন
        </Link>
      </PageHeader>
      <div className="container-page mt-8 space-y-14">
        <Notice tone="sample" title="কৃষিবাংলা কোনো সারের মাত্রা সুপারিশ করে না">
          ফসল, জাত, মৌসুম ও মাটির উর্বরতাভেদে সারের পরিমাণ ভিন্ন হয়। মাটি পরীক্ষা করে উপজেলা কৃষি অফিস বা বিএআরসি-র সার সুপারিশ নির্দেশিকা থেকে মাত্রা জেনে নিন, তারপর হিসাব পাতায় বসান।
        </Notice>
        <section>
          <SectionTitle eyebrow="মাটি ও সার" title="সার ব্যবস্থাপনা নির্দেশিকা" />
          <div className="grid gap-4 lg:grid-cols-2">
            {fertilizerGuides.map((g) => (
              <GuideCard key={g.id} guide={g} defaultOpen={hash === g.id} favHref={`/fertilizer#${g.id}`} />
            ))}
          </div>
        </section>
        <section>
          <SectionTitle eyebrow="সেচ ও পানি" title="সেচ ও পানি ব্যবস্থাপনা" />
          <div className="grid gap-4 lg:grid-cols-2">
            {irrigationGuides.map((g) => (
              <GuideCard key={g.id} guide={g} defaultOpen={hash === g.id} favHref={`/fertilizer#${g.id}`} />
            ))}
          </div>
        </section>
        <VerifyWith ids={['dae', 'barc', 'brri', 'bari']} />
      </div>
    </>
  );
}
