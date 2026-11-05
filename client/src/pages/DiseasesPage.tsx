import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, ImageUp, Loader2, Microscope, Search, Sparkles, Trash2 } from 'lucide-react';
import { Button, EmptyState, Notice, PageHeader } from '@/components/common/ui';
import { LocationSelector } from '@/components/common/LocationSelector';
import { DiseaseDetail } from '@/components/disease/DiseaseDetail';
import { SymptomWizard } from '@/components/disease/SymptomWizard';
import { crops, diseases, getCrop, getDisease, diseasesForCrop } from '@/lib/data';
import { search } from '@/lib/search';
import { getDistrict, HAZARD_BN } from '@/lib/geo';
import { usePrefs } from '@/hooks/useStored';
import { useAiConfig } from '@/hooks/useAiConfig';
import { askAi, AiError } from '@/lib/aiProvider';
import { blobToBase64, downscale, validateImage } from '@/lib/photoStore';
import { cn } from '@/lib/cn';
import { ApiError, diagnose, type DiagnoseResponse } from '@/lib/api';
import { useServer } from '@/context/ServerContext';
import { AiDiagnosisCard } from '@/components/disease/AiDiagnosisCard';

type Tab = 'form' | 'wizard' | 'library';

const QUICK = ['পাতা হলুদ', 'পাতায় বাদামি দাগ', 'সাদা পাউডার', 'পাতা কোঁকড়ানো', 'গাছ ঢলে পড়ছে', 'ফলে ছিদ্র', 'ফল পচে যাচ্ছে', 'শীষ সাদা', 'কালো দাগ', 'পোকা দেখা যাচ্ছে'];

function SymptomForm() {
  const [prefs] = usePrefs();
  const ai = useAiConfig();
  const server = useServer();
  const serverVision = server.status === 'online' && !!server.config?.ai.vision;
  const [cropId, setCropId] = useState('');
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ url: string; blob: Blob } | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ cropId: string; text: string } | null>(null);
  const [aiState, setAiState] = useState<{ status: 'idle' | 'loading' | 'done' | 'error'; text?: string; diag?: DiagnoseResponse }>({ status: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);
  const district = getDistrict(prefs.districtId);

  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.url);
  }, [image]);

  const onFile = async (f?: File) => {
    setImgError(null);
    if (!f) return;
    const err = validateImage(f);
    if (err) {
      setImgError(err);
      return;
    }
    try {
      const blob = await downscale(f);
      setImage({ url: URL.createObjectURL(blob), blob });
      setAiState({ status: 'idle' });
    } catch {
      setImgError('ছবিটি পড়া যায়নি, অন্য ছবি দিন।');
    }
  };

  const results = useMemo(() => {
    if (!submitted) return [];
    const crop = getCrop(submitted.cropId);
    const pool = crop ? diseasesForCrop(crop.id).map((d) => d.id) : diseases.map((d) => d.id);
    if (!submitted.text.trim()) return pool.slice(0, 6).map((id) => ({ d: getDisease(id)!, score: 0 }));
    const q = `${submitted.text} ${crop?.nameBn ?? ''}`;
    const hits = search(q, { kinds: ['disease'], limit: 30 }).filter((h) => pool.includes(h.doc.id));
    return hits.slice(0, 6).map((h) => ({ d: getDisease(h.doc.id)!, score: h.score }));
  }, [submitted]);

  const top = results[0]?.score ?? 0;
  const runAi = async () => {
    if (!image) return;
    setAiState({ status: 'loading' });
    if (serverVision) {
      try {
        const d = await diagnose(image.blob, { cropId: cropId || undefined, symptoms: text || undefined, districtId: prefs.districtId || undefined });
        setAiState({ status: 'done', diag: d });
      } catch (e) {
        setAiState({ status: 'error', text: e instanceof ApiError ? e.message : 'AI থেকে উত্তর পাওয়া যায়নি।' });
      }
      return;
    }
    try {
      const crop = getCrop(cropId);
      const ctx = results.slice(0, 4).map((r) => ({ title: r.d.nameBn, text: r.d.symptomsBn.join('; ') + ' ' + r.d.safeNextStepsBn.join('; '), status: r.d.dataStatus }));
      const b64 = await blobToBase64(image.blob);
      const reply = await askAi(
        ai.config,
        [{ role: 'user', content: `ফসল: ${crop?.nameBn ?? 'উল্লেখ নেই'}। কৃষকের লেখা লক্ষণ: ${text || 'উল্লেখ নেই'}। জেলা: ${district?.nameBn ?? 'উল্লেখ নেই'}। ছবিটি দেখে সম্ভাব্য কারণগুলো (নিশ্চিত নয়) এবং নিরাপদ পরবর্তী পদক্ষেপ বলো।` }],
        ctx,
        { mediaType: 'image/jpeg', base64: b64 },
      );
      setAiState({ status: 'done', text: reply });
    } catch (e) {
      setAiState({ status: 'error', text: e instanceof AiError ? e.message : 'AI থেকে উত্তর পাওয়া যায়নি।' });
    }
  };

  return (
    <div className="space-y-6">
      <form
        className="card grid gap-6 p-5 sm:p-6 lg:grid-cols-[0.9fr_1.1fr]"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted({ cropId, text });
          setAiState({ status: 'idle' });
          if (image && serverVision) void runAi(); // with server AI, a photo is analysed right away
        }}
      >
        <div>
          <p className="label">ছবি (ঐচ্ছিক)</p>
          <div
            className={cn('relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed bg-cream', image ? 'border-transparent' : 'border-forest/15')}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFile(e.dataTransfer.files?.[0]);
            }}
          >
            {image ? (
              <>
                <img src={image.url} alt="আপলোড করা গাছের ছবি" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setImage(null)} className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-red-700 shadow-soft">
                  <Trash2 className="h-4 w-4" aria-hidden /> সরান
                </button>
              </>
            ) : (
              <div className="p-6 text-center">
                <ImageUp className="mx-auto h-10 w-10 text-primary" aria-hidden />
                <p className="mt-2 font-semibold">আক্রান্ত পাতা/ফলের কাছ থেকে তোলা পরিষ্কার ছবি দিন</p>
                <p className="text-sm text-ink-soft">JPG, PNG বা WEBP · সর্বোচ্চ ৮ MB</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" id="dz-file" onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="mt-3 flex gap-2">
            <label htmlFor="dz-file" className="inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-forest/15 bg-white px-4 font-semibold text-forest hover:bg-primary-50">
              <Camera className="h-5 w-5" aria-hidden /> ছবি তুলুন / বাছুন
            </label>
          </div>
          {imgError && <p className="mt-2 text-sm font-medium text-red-700" role="alert">{imgError}</p>}
          {image && !ai.ready && (
            <p className="mt-3 rounded-2xl bg-sky-50 p-3 text-sm text-sky-900 ring-1 ring-sky-200">
              {serverVision
                ? 'খুঁজুন চাপলে AI ছবিটি দেখে সম্ভাব্য কারণ বলবে (নিশ্চিত নির্ণয় নয়), সাথে ফসল ও লক্ষণ মিলিয়ে নির্দেশিকা দেখানো হবে। ছবি সংরক্ষণ করা হয় না।'
                : ai.ready
                  ? 'ছবিটি দেখাতে চাইলে ফলাফলের পরে “ছবি বিশ্লেষণ” চাপুন (আপনার দেওয়া AI কী দিয়ে)। মূল ফলাফল আসবে ফসল ও আপনার লেখা লক্ষণ থেকে।'
                  : 'AI সংযুক্ত নেই, তাই ছবিটি বিশ্লেষণ হবে না—শুধু আপনার দেখার জন্য। ফলাফল আসবে ফসল ও আপনার লেখা লক্ষণ থেকে।'}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="dz-crop" className="label">ফসল</label>
            <select id="dz-crop" className="field" value={cropId} onChange={(e) => setCropId(e.target.value)}>
              <option value="">ফসল নির্বাচন করুন (ঐচ্ছিক)</option>
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.nameBn}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dz-text" className="label">লক্ষণ লিখুন</label>
            <textarea id="dz-text" rows={3} className="field min-h-[96px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="যেমন: পাতার আগা হলুদ হয়ে শুকিয়ে যাচ্ছে" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK.map((qq) => (
                <button key={qq} type="button" className="chip min-h-[34px] px-3 py-1 text-xs" onClick={() => setText((t) => (t ? `${t}, ${qq}` : qq))}>
                  + {qq}
                </button>
              ))}
            </div>
          </div>
          <LocationSelector compact />
          {district && district.hazards.length > 0 && (
            <p className="text-sm text-ink-soft">
              {district.nameBn} জেলায় সাধারণ ঝুঁকি: {district.hazards.map((h) => HAZARD_BN[h]).join(', ')} (নমুনা তথ্য)
            </p>
          )}
          <Button type="submit" size="lg" className="mt-auto">
            <Search className="h-5 w-5" aria-hidden /> সম্ভাব্য কারণ খুঁজুন
          </Button>
        </div>
      </form>

      {submitted && (
        <section aria-live="polite" className="space-y-4">
          <Notice tone="warn" title="সম্ভাব্য কারণ — নিশ্চিত রোগ নির্ণয় নয়">
            ফলাফল আপনার বাছাই করা ফসল ও লেখা লক্ষণের সাথে স্থানীয় তথ্যভান্ডারের মিল দেখে সাজানো। নিশ্চিত হতে উপসহকারী কৃষি কর্মকর্তাকে গাছ বা ছবি দেখান।
          </Notice>
          {image && (serverVision || ai.ready) && (
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">ঐচ্ছিক: AI দিয়ে ছবি দেখান</p>
                  <p className="text-sm text-ink-soft">
                    {serverVision
                      ? `ছবিটি AI (${server.config?.ai.model}) দেখে সম্ভাব্য কারণ বলবে। ছবি সংরক্ষণ করা হয় না। AI ভুল করতে পারে।`
                      : 'আপনার দেওয়া API কী দিয়ে ছবি সরাসরি AI সেবায় পাঠানো হবে। AI ভুল করতে পারে।'}
                  </p>
                </div>
                <Button onClick={runAi} disabled={aiState.status === 'loading'} variant="gold">
                  {aiState.status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
                  ছবি বিশ্লেষণ
                </Button>
              </div>
              {aiState.status === 'done' && aiState.diag && (
                <div className="mt-4 rounded-2xl bg-cream p-4">
                  <AiDiagnosisCard data={aiState.diag} />
                </div>
              )}
              {aiState.status === 'done' && !aiState.diag && (
                <div className="mt-4 rounded-2xl bg-cream p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-harvest-700">AI-এর সম্ভাব্য মূল্যায়ন (নিশ্চিত নয়)</p>
                  <p className="whitespace-pre-wrap">{aiState.text}</p>
                </div>
              )}
              {aiState.status === 'error' && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{aiState.text}</p>}
            </div>
          )}
          {results.length ? (
            results.map(({ d, score }, i) => (
              <DiseaseDetail key={d.id} d={d} defaultOpen={i === 0} match={submitted.text.trim() ? (score >= top * 0.8 ? 'high' : score >= top * 0.5 ? 'medium' : 'low') : undefined} />
            ))
          ) : (
            <EmptyState icon={<Microscope className="h-8 w-8" />} title="মিল পাওয়া যায়নি">
              অন্যভাবে লক্ষণ লিখুন, ফসল বদলান, অথবা “ছবিতে ট্যাপ করে খুঁজুন” ব্যবহার করুন।
            </EmptyState>
          )}
        </section>
      )}
    </div>
  );
}

function Library({ openId }: { openId?: string }) {
  const [cropId, setCropId] = useState('');
  const list = cropId ? diseasesForCrop(cropId) : diseases;
  useEffect(() => {
    if (openId) setTimeout(() => document.getElementById(`d-${openId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  }, [openId]);
  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <label htmlFor="lib-crop" className="label">ফসল অনুযায়ী দেখুন</label>
        <select id="lib-crop" className="field" value={cropId} onChange={(e) => setCropId(e.target.value)}>
          <option value="">সব ফসল</option>
          {crops.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.nameBn}
            </option>
          ))}
        </select>
      </div>
      {list.map((d) => (
        <DiseaseDetail key={d.id} d={d} defaultOpen={d.id === openId} />
      ))}
    </div>
  );
}

export default function DiseasesPage() {
  const [params, setParams] = useSearchParams();
  const openId = params.get('d') ?? undefined;
  const [tab, setTab] = useState<Tab>(openId ? 'library' : 'form');
  useEffect(() => {
    if (openId) setTab('library');
  }, [openId]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'form', label: 'লক্ষণ ও ছবি দিয়ে' },
    { id: 'wizard', label: 'ছবিতে ট্যাপ করে' },
    { id: 'library', label: 'সব রোগ-পোকা' },
  ];

  return (
    <>
      <PageHeader eyebrow="রোগ শনাক্তকরণ সহায়তা" title="ফসলের রোগ ও পোকা চিনুন" description="লক্ষণ লিখে বা ছবিতে ট্যাপ করে সম্ভাব্য কারণ ও নিরাপদ করণীয় জানুন।" icon={<Microscope className="h-7 w-7 text-leaf" />} />
      <div className="container-page mt-8">
        <div role="tablist" aria-label="খোঁজার পদ্ধতি" className="mb-6 inline-flex w-full gap-1 rounded-2xl bg-white p-1.5 shadow-soft ring-1 ring-forest/5 sm:w-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id !== 'library' && openId) setParams({}, { replace: true });
              }}
              className={cn('min-h-[44px] flex-1 rounded-xl px-4 text-sm font-semibold transition sm:flex-none', tab === t.id ? 'bg-primary text-white' : 'text-ink hover:bg-cream')}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'form' && <SymptomForm />}
        {tab === 'wizard' && <SymptomWizard />}
        {tab === 'library' && <Library openId={openId} />}
      </div>
    </>
  );
}
