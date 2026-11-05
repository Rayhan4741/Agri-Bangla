import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bug, Droplets, Layers, Lightbulb, Package, Plus, Check } from 'lucide-react';
import { Badge, DataStatusBadge, EmptyState, LinkButton, Notice } from '@/components/common/ui';
import { GrowthTimeline } from '@/components/crops/GrowthTimeline';
import { SpeakButton } from '@/components/common/SpeakButton';
import { ShareButtons } from '@/components/common/ShareButtons';
import { FavoriteButton } from '@/components/common/FavoriteButton';
import { VerifyWith } from '@/components/common/VerifyWith';
import { diseasesForCrop, getCategory, getCrop, getFertilizerGuide, getIrrigationGuide, DISEASE_TYPE_BN, SEASON_BN } from '@/lib/data';
import { STORE_KEYS, useStored } from '@/hooks/useStored';

export interface MyCrop {
  cropId: string;
  stageIndex: number;
  addedAt: string;
}

export default function CropDetailPage() {
  const { slug } = useParams();
  const crop = getCrop(slug);
  const [myCrops, setMyCrops] = useStored<MyCrop[]>(STORE_KEYS.myCrops, []);

  if (!crop) {
    return (
      <div className="container-page pb-10 pt-32">
        <EmptyState title="এই ফসলটি পাওয়া যায়নি">
          <LinkButton to="/crops" variant="outline" className="mt-4">
            সব ফসল দেখুন
          </LinkButton>
        </EmptyState>
      </div>
    );
  }

  const cat = getCategory(crop.category);
  const ds = diseasesForCrop(crop.id);
  const fert = crop.fertilizerGuideIds.map(getFertilizerGuide).filter(Boolean);
  const irr = crop.irrigationGuideIds.map(getIrrigationGuide).filter(Boolean);
  const mine = myCrops.some((m) => m.cropId === crop.id);
  const plain = [
    `${crop.nameBn}: ${crop.descriptionBn}`,
    ...crop.stages.map((s, i) => `${i + 1}. ${s.nameBn}${s.durationBn ? ` (${s.durationBn})` : ''}: ${s.tasksBn.join('; ')}`),
    ...(crop.tipsBn.length ? ['পরামর্শ: ' + crop.tipsBn.join('; ')] : []),
    'নমুনা তথ্য — প্রয়োগের আগে স্থানীয় কৃষি অফিসে যাচাই করুন।',
  ].join('\n');

  return (
    <>
      <header className="relative overflow-hidden bg-forest pb-12 pt-28 text-white">
        <div aria-hidden className="decor absolute -right-10 top-10 select-none text-[14rem] leading-none opacity-[0.12] sm:text-[18rem]">
          {crop.icon}
        </div>
        <div className="container-page relative">
          <Link to="/crops" className="no-print mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white/75 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden /> সব ফসল
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {cat && <Badge tone="gold">{cat.icon} {cat.nameBn}</Badge>}
            {crop.seasons.map((s) => (
              <span key={s} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-white/15">
                {SEASON_BN[s]}
              </span>
            ))}
            <DataStatusBadge status={crop.dataStatus} />
          </div>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">
            <span aria-hidden className="mr-2">{crop.icon}</span>
            {crop.nameBn}
          </h1>
          <p className="font-en text-white/60">{crop.nameEn}</p>
          <p className="mt-3 max-w-2xl text-lg text-white/85">{crop.descriptionBn}</p>
          <div className="no-print mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMyCrops((l) => (mine ? l.filter((m) => m.cropId !== crop.id) : [...l, { cropId: crop.id, stageIndex: 0, addedAt: new Date().toISOString() }]))}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-harvest px-3 text-sm font-bold text-forest hover:brightness-105"
              aria-pressed={mine}
            >
              {mine ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
              {mine ? 'আমার ফসলে আছে' : 'আমার ফসলে যোগ করুন'}
            </button>
            <SpeakButton text={plain} />
            <FavoriteButton id={`/crops/${crop.id}`} title={crop.nameBn} />
            <ShareButtons title={`${crop.nameBn} চাষ নির্দেশিকা`} text={plain} />
          </div>
        </div>
      </header>

      <div className="container-page mt-8 space-y-8">
        <p className="print-only text-sm">কৃষিবাংলা · নমুনা তথ্য — প্রয়োগের আগে স্থানীয় কৃষি অফিসে যাচাই করুন।</p>
        <GrowthTimeline crop={crop} />

        <div className="grid gap-5 md:grid-cols-2">
          <section className="card p-6" aria-labelledby="soil">
            <h2 id="soil" className="flex items-center gap-2 text-xl font-bold">
              <Layers className="h-5 w-5 text-harvest-700" aria-hidden /> মাটি ও সার
            </h2>
            {crop.soilTypes.length > 0 && (
              <p className="mt-3">
                <span className="font-semibold">উপযোগী মাটি:</span> {crop.soilTypes.join(', ')}
              </p>
            )}
            <ul className="mt-3 space-y-2">
              {fert.map((g) => (
                <li key={g!.id}>
                  <Link to={`/fertilizer#${g!.id}`} className="flex items-center gap-2 rounded-xl p-2 font-medium text-primary-700 hover:bg-primary-50">
                    <span aria-hidden>{g!.icon}</span> {g!.titleBn}
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/calculator?tab=fertilizer" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
              সুপারিশকৃত মাত্রা থেকে সারের পরিমাণ হিসাব করুন →
            </Link>
          </section>
          <section className="card p-6" aria-labelledby="water">
            <h2 id="water" className="flex items-center gap-2 text-xl font-bold">
              <Droplets className="h-5 w-5 text-sky-600" aria-hidden /> সেচ ও পানি
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              {crop.irrigation.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <ul className="mt-3 space-y-2">
              {irr.map((g) => (
                <li key={g!.id}>
                  <Link to={`/fertilizer#${g!.id}`} className="flex items-center gap-2 rounded-xl p-2 font-medium text-primary-700 hover:bg-primary-50">
                    <span aria-hidden>{g!.icon}</span> {g!.titleBn}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section aria-labelledby="dz">
          <h2 id="dz" className="mb-4 flex items-center gap-2 text-2xl font-bold">
            <Bug className="h-6 w-6 text-[#C0533B]" aria-hidden /> প্রধান রোগ ও পোকামাকড়
          </h2>
          {ds.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ds.map((d) => (
                <Link key={d.id} to={`/diseases?d=${d.id}`} className="card card-hover block p-5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={d.type === 'pest' ? 'gold' : d.type === 'nutrient' ? 'blue' : 'red'}>{DISEASE_TYPE_BN[d.type]}</Badge>
                  </div>
                  <h3 className="mt-2 text-lg font-bold">{d.nameBn}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{d.symptomsBn[0]}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-ink-soft">এই ফসলের রোগ-পোকার তথ্য এখনো যোগ করা হয়নি।</p>
          )}
        </section>

        {(crop.tipsBn.length > 0 || crop.harvestBn || crop.storageBn) && (
          <div className="grid gap-5 md:grid-cols-2">
            {crop.tipsBn.length > 0 && (
              <section className="card p-6">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Lightbulb className="h-5 w-5 text-harvest-700" aria-hidden /> বিশেষ পরামর্শ
                </h2>
                <ul className="mt-3 list-disc space-y-1.5 pl-5">
                  {crop.tipsBn.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>
            )}
            {(crop.harvestBn || crop.storageBn) && (
              <section className="card p-6">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <Package className="h-5 w-5 text-primary" aria-hidden /> সংগ্রহ ও সংরক্ষণ
                </h2>
                {crop.harvestBn && <p className="mt-3">{crop.harvestBn}</p>}
                {crop.storageBn && <p className="mt-2">{crop.storageBn}</p>}
              </section>
            )}
          </div>
        )}

        <Notice tone="sample" title="নমুনা তথ্য">
          এই নির্দেশিকা শিক্ষামূলক উদ্দেশ্যে লেখা। জাত, এলাকা ও মৌসুমভেদে সময় ও পরিমাণ বদলায়—প্রয়োগের আগে স্থানীয় উপসহকারী কৃষি কর্মকর্তার সাথে যাচাই করুন।
        </Notice>
        <VerifyWith ids={crop.verifyWithIds} />
      </div>
    </>
  );
}
