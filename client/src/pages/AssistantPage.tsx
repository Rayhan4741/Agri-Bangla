import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Bot, ExternalLink, ImagePlus, Mic, MicOff, RotateCcw, Send, Settings2, Sparkles, User, WifiOff, X } from 'lucide-react';
import { Badge, DataStatusBadge, Notice } from '@/components/common/ui';
import { LocationSelector } from '@/components/common/LocationSelector';
import { SpeakButton } from '@/components/common/SpeakButton';
import { AiSettings } from '@/components/chatbot/AiSettings';
import { answer, answerToPlainText, DEFAULT_FOLLOWUPS, retrieve, type ChatAnswer } from '@/lib/chatEngine';
import { askAi, AiError, redactSecrets, type AiMessage } from '@/lib/aiProvider';
import { ApiError, apiStream, diagnose, type ChatSource, type DiagnoseResponse } from '@/lib/api';
import { useServer } from '@/context/ServerContext';
import { AiDiagnosisCard } from '@/components/disease/AiDiagnosisCard';
import { crops, faqs, getCrop } from '@/lib/data';
import { blobToBase64, downscale, validateImage } from '@/lib/photoStore';
import { getDistrict } from '@/lib/geo';
import { STORE_KEYS, usePrefs, useStored } from '@/hooks/useStored';
import { useAiConfig } from '@/hooks/useAiConfig';
import { useOnline } from '@/hooks/useOnline';
import { useVoiceInput } from '@/hooks/useSpeech';
import { cn } from '@/lib/cn';

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  answer?: ChatAnswer;
  via?: 'local' | 'ai' | 'server';
  sources?: ChatSource[];
  model?: string;
  diag?: DiagnoseResponse;
  streaming?: boolean;
  error?: boolean;
  imageUrl?: string;
  hadImage?: boolean;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const STATUS_SHORT: Record<string, string> = { verified: 'যাচাইকৃত', 'link-checked': 'লিংক যাচাইকৃত', illustrative: 'নমুনা তথ্য', unverified: 'অযাচাইকৃত' };

function ServerAnswer({ m }: { m: Msg }) {
  if (m.diag) return <AiDiagnosisCard data={m.diag} />;
  const urls = [...new Set((m.sources ?? []).flatMap((s) => s.sourceUrls))].slice(0, 4);
  return (
    <div className="space-y-3">
      <p className="whitespace-pre-wrap leading-relaxed">
        {m.text}
        {m.streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-blink bg-primary align-middle" aria-hidden />}
      </p>
      {!m.streaming && (m.sources?.length ?? 0) > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">উত্তরের উৎস — কৃষিবাংলা জ্ঞানভান্ডার</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {m.sources!.map((s) => (
              <Link key={s.n} to={s.href} className="flex items-start gap-2 rounded-xl bg-cream p-3 text-sm transition hover:bg-primary-50">
                <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">{s.n.toLocaleString('bn-BD')}</span>
                <span>
                  <span className="block font-semibold text-forest">{s.titleBn}</span>
                  <span className="text-xs text-ink-soft">{STATUS_SHORT[s.dataStatus] ?? s.dataStatus}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {!m.streaming && urls.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-xs font-semibold text-ink-soft">মূল উৎস:</span>
          {urls.map((u) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary/15 hover:bg-primary-50">
              {new URL(u).hostname.replace(/^www\./, '')} <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ))}
        </div>
      )}
      {!m.streaming && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="blue">
            <Sparkles className="h-3 w-3" aria-hidden /> কৃষকবন্ধু AI{m.model ? ` · ${m.model}` : ''} — ভুল হতে পারে, যাচাই করুন
          </Badge>
          <SpeakButton text={m.text} compact />
        </div>
      )}
    </div>
  );
}

function AnswerBody({ m }: { m: Msg }) {
  if (m.via === 'server') return <ServerAnswer m={m} />;
  const a = m.answer;
  return (
    <div className="space-y-3">
      <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
      {a?.steps && (
        <ol className="space-y-1.5">
          {a.steps.map((s, i) => (
            <li key={s} className="flex gap-2.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      )}
      {a?.uncertainty && (
        <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> {a.uncertainty}
        </p>
      )}
      {a && a.cards.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">{m.via === 'ai' ? 'যে স্থানীয় তথ্য দেখে উত্তর দেওয়া হয়েছে' : 'সম্পর্কিত নির্দেশিকা'}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {a.cards.map((c) => (
              <Link key={c.href} to={c.href} className="rounded-xl bg-cream p-3 text-sm transition hover:bg-primary-50">
                <span className="block font-semibold text-forest">{c.title}</span>
                <span className="line-clamp-2 text-ink-soft">{c.snippet}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {a && a.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-xs font-semibold text-ink-soft">যাচাই করুন:</span>
          {a.sources.map((s) => (
            <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary/15 hover:bg-primary-50">
              {s.nameBn} <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {m.via === 'ai' ? <Badge tone="blue"><Sparkles className="h-3 w-3" aria-hidden /> AI উত্তর — ভুল হতে পারে</Badge> : a && <DataStatusBadge status={a.status} />}
        <SpeakButton text={a ? answerToPlainText({ ...a, text: m.text }) : m.text} compact />
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const [prefs, updatePrefs] = usePrefs();
  const ai = useAiConfig();
  const online = useOnline();
  const server = useServer();
  const [params, setParams] = useSearchParams();
  const [stored, setStored] = useStored<Msg[]>(STORE_KEYS.chat, []);
  const [msgs, setMsgs] = useState<Msg[]>(() => (prefs.saveChat ? stored : []));
  const [input, setInput] = useState('');
  const [cropId, setCropId] = useState('');
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<{ url: string; blob: Blob } | null>(null);
  const [imgErr, setImgErr] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const voice = useVoiceInput((t) => setInput((v) => (v ? `${v} ${t}` : t)));
  const serverAi = server.status === 'online' && !!server.config?.ai.enabled;
  const mode: 'server' | 'local' | 'ai' = serverAi && online ? 'server' : ai.ready ? 'ai' : 'local';
  const district = getDistrict(prefs.districtId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, busy]);

  // persist (redacted, without images) only when the user opted in
  useEffect(() => {
    if (prefs.saveChat) setStored(msgs.slice(-60).map((m) => ({ ...m, text: redactSecrets(m.text), imageUrl: undefined, hadImage: m.hadImage || !!m.imageUrl })));
  }, [msgs, prefs.saveChat, setStored]);

  const send = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q || busy) return;
      const userMsg: Msg = { id: uid(), role: 'user', text: q, imageUrl: image?.url, hadImage: !!image };
      const sentImage = image;
      setMsgs((m) => [...m, userMsg]);
      setInput('');
      setImage(null);
      setBusy(true);
      const local = answer(q, { cropId: cropId || undefined });
      const fallBack = (why: string) =>
        setMsgs((m) => [
          ...m.filter((x) => !(x.streaming && !x.text)),
          { id: uid(), role: 'assistant', text: `${why} নিচে কৃষিবাংলার জ্ঞানভান্ডারের উত্তর দেওয়া হলো।`, error: true },
          { id: uid(), role: 'assistant', text: local.text, answer: local, via: 'local' },
        ]);

      if (mode === 'server') {
        abortRef.current = new AbortController();
        const signal = abortRef.current.signal;
        try {
          if (sentImage && server.config?.ai.vision) {
            const d = await diagnose(sentImage.blob, { cropId: cropId || undefined, symptoms: q, districtId: prefs.districtId || undefined }, signal);
            setMsgs((m) => [...m, { id: uid(), role: 'assistant', text: d.result.summaryBn, via: 'server', diag: d, model: d.model }]);
            return;
          }
          const history = [...msgs, userMsg]
            .filter((m) => !m.error && m.text.trim())
            .slice(-10)
            .map((m) => ({ role: m.role, text: m.text.slice(0, 2000) }));
          const id = uid();
          setMsgs((m) => [...m, { id, role: 'assistant', text: '', via: 'server', streaming: true }]);
          const patch = (fn: (x: Msg) => Msg) => setMsgs((m) => m.map((x) => (x.id === id ? fn(x) : x)));
          let failed = '';
          await apiStream('/ai/chat', { messages: history, cropId: cropId || null, districtId: prefs.districtId || null }, signal, (ev, data) => {
            const d = data as { text?: string; sources?: ChatSource[]; model?: string; message?: string };
            if (ev === 'meta') patch((x) => ({ ...x, sources: d.sources, model: d.model }));
            else if (ev === 'delta' && d.text) patch((x) => ({ ...x, text: x.text + d.text }));
            else if (ev === 'error') failed = d.message ?? 'উত্তর অসম্পূর্ণ।';
          });
          patch((x) => ({ ...x, streaming: false, text: failed && !x.text ? failed : x.text }));
          if (failed) setMsgs((m) => [...m, { id: uid(), role: 'assistant', text: `${failed} উত্তরটি অসম্পূর্ণ হতে পারে।`, error: true }]);
        } catch (e) {
          if ((e as Error).name === 'AbortError') return;
          const why = e instanceof ApiError ? e.message : 'AI থেকে উত্তর পাওয়া যায়নি।';
          fallBack(why);
        } finally {
          setBusy(false);
        }
        return;
      }

      if (mode === 'ai') {
        if (!online) {
          setMsgs((m) => [...m, { id: uid(), role: 'assistant', text: 'ইন্টারনেট সংযোগ নেই, তাই AI মোড কাজ করছে না। নিচে স্থানীয় তথ্যভান্ডারের উত্তর দেওয়া হলো।', error: true }, { id: uid(), role: 'assistant', text: local.text, answer: local, via: 'local' }]);
          setBusy(false);
          return;
        }
        try {
          abortRef.current = new AbortController();
          const ctx = retrieve(q, cropId || undefined, 5).map((h) => ({ title: h.doc.titleBn, text: h.doc.text, status: h.doc.dataStatus }));
          const history: AiMessage[] = [...msgs, userMsg].filter((m) => !m.error).slice(-8).map((m) => ({ role: m.role, content: m.text }));
          const crop = getCrop(cropId);
          if (crop || district) history[history.length - 1] = { role: 'user', content: `${q}\n(ফসল: ${crop?.nameBn ?? 'উল্লেখ নেই'}, জেলা: ${district?.nameBn ?? 'উল্লেখ নেই'})` };
          const img = sentImage ? { mediaType: 'image/jpeg', base64: await blobToBase64(sentImage.blob) } : undefined;
          const reply = await askAi(ai.config, history, ctx, img, abortRef.current.signal);
          setMsgs((m) => [...m, { id: uid(), role: 'assistant', text: reply, via: 'ai', answer: { ...local, text: reply, steps: undefined } }]);
        } catch (e) {
          if ((e as Error).name !== 'AbortError') {
            const msg = e instanceof AiError ? e.message : 'AI থেকে উত্তর পাওয়া যায়নি।';
            setMsgs((m) => [...m, { id: uid(), role: 'assistant', text: `${msg} নিচে স্থানীয় তথ্যভান্ডারের উত্তর দেওয়া হলো।`, error: true }, { id: uid(), role: 'assistant', text: local.text, answer: local, via: 'local' }]);
          }
        } finally {
          setBusy(false);
        }
        return;
      }

      // local mode: short natural pause for the typing indicator
      await new Promise((r) => setTimeout(r, 450 + Math.min(q.length * 8, 700)));
      const note = sentImage ? '\n\n(ছবিটি সংযুক্ত হয়েছে, কিন্তু স্থানীয় ডেমো মোডে ছবি বিশ্লেষণ হয় না—উত্তর আপনার লেখা প্রশ্ন থেকে।)' : '';
      setMsgs((m) => [...m, { id: uid(), role: 'assistant', text: local.text + note, answer: local, via: 'local' }]);
      setBusy(false);
    },
    [busy, cropId, mode, online, ai.config, msgs, district, image, prefs.districtId, server.config?.ai.vision],
  );

  // ?q=<faq-id or text> deep link
  useEffect(() => {
    const q = params.get('q');
    if (!q) return;
    const faq = faqs.find((f) => f.id === q);
    setParams({}, { replace: true });
    send(faq ? faq.questionBn : q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    abortRef.current?.abort();
    setMsgs([]);
    setStored([]);
    setBusy(false);
  };

  const onFile = async (f?: File) => {
    setImgErr(null);
    if (!f) return;
    const err = validateImage(f);
    if (err) return setImgErr(err);
    try {
      const blob = await downscale(f, 1024);
      setImage({ url: URL.createObjectURL(blob), blob });
    } catch {
      setImgErr('ছবিটি পড়া যায়নি।');
    }
  };

  const lastFollowUps = useMemo(() => {
    const last = [...msgs].reverse().find((m) => m.role === 'assistant' && m.answer);
    return last?.answer?.followUps ?? [];
  }, [msgs]);

  return (
    <div className="bg-cream pb-6 pt-[88px]">
      <div className="container-page grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* sidebar */}
        <aside className={cn('space-y-4 lg:block', showSettings ? 'block' : 'hidden')} aria-label="সহায়কের সেটিংস">
          <div className="card p-5">
            <h2 className="mb-3 font-bold">প্রশ্নের প্রসঙ্গ</h2>
            <label htmlFor="as-crop" className="label">ফসল</label>
            <select id="as-crop" className="field mb-3" value={cropId} onChange={(e) => setCropId(e.target.value)}>
              <option value="">যেকোনো</option>
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.nameBn}
                </option>
              ))}
            </select>
            <LocationSelector stacked />
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-primary" checked={prefs.saveChat} onChange={(e) => updatePrefs({ saveChat: e.target.checked })} />
              <span>কথোপকথন এই ব্রাউজারে সংরক্ষণ করুন (ছবি ও API কী সংরক্ষিত হয় না)</span>
            </label>
          </div>
          <div className="card p-5 text-sm">
            <p className="mb-1 font-bold">AI অবস্থা</p>
            {serverAi ? (
              <p className="text-ink-soft">
                সার্ভারের AI চালু ({server.config?.ai.provider} · {server.config?.ai.model})। আপনার প্রশ্ন ও ছবি উত্তর তৈরির জন্য AI সেবায় পাঠানো হয়; ব্যক্তিগত তথ্য (নাম, ফোন, ঠিকানা) লিখবেন না।
              </p>
            ) : server.status === 'online' ? (
              <p className="text-ink-soft">সার্ভার সংযুক্ত, কিন্তু AI কী সেট করা হয়নি — জ্ঞানভান্ডার থেকে উত্তর দেওয়া হচ্ছে।</p>
            ) : (
              <p className="text-ink-soft">সার্ভার সংযুক্ত নয় — এই ডিভাইসের জ্ঞানভান্ডার থেকে উত্তর দেওয়া হচ্ছে।</p>
            )}
          </div>
          <details className="card p-5" open={ai.config.enabled && !serverAi}>
            <summary className="cursor-pointer font-bold">ঐচ্ছিক: নিজের API কী দিয়ে AI (সার্ভার ছাড়া)</summary>
            <div className="mt-4">
              <AiSettings />
            </div>
          </details>
        </aside>

        {/* chat */}
        <section className="card flex min-h-[calc(100dvh-180px)] flex-col overflow-hidden" aria-label="কৃষকবন্ধু চ্যাট">
          <div className="flex items-center justify-between gap-3 border-b border-forest/5 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-harvest to-[#f4d58d] text-forest">
                <Bot className="h-6 w-6" aria-hidden />
                <span className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white', mode === 'ai' && !online ? 'bg-red-500' : 'bg-leaf')} aria-hidden />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight">কৃষকবন্ধু AI</h1>
                <p className="text-xs text-ink-soft">
                  {mode === 'server'
                    ? 'AI চালু · কৃষিবাংলা জ্ঞানভান্ডার থেকে উৎসসহ উত্তর'
                    : mode === 'ai'
                      ? 'সরাসরি AI মোড · আপনার কী · স্থানীয় তথ্য দিয়ে সমর্থিত'
                      : 'জ্ঞানভান্ডারভিত্তিক উত্তর — লাইভ AI বা রোগ নির্ণয় ব্যবস্থা নয়'}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={() => setShowSettings((s) => !s)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-cream lg:hidden" aria-label="সেটিংস" aria-expanded={showSettings}>
                <Settings2 className="h-5 w-5" />
              </button>
              <button type="button" onClick={reset} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-soft hover:bg-cream" disabled={!msgs.length && !busy}>
                <RotateCcw className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">নতুন কথোপকথন</span>
              </button>
            </div>
          </div>

          {!online && (
            <div className="flex items-center gap-2 bg-harvest-100 px-4 py-2 text-sm text-harvest-700" role="status">
              <WifiOff className="h-4 w-4" aria-hidden /> অফলাইন — স্থানীয় ডেমো মোড চলবে{mode === 'ai' ? ', AI মোড কাজ করবে না' : ''}।
            </div>
          )}

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6" aria-live="polite">
            {msgs.length === 0 && (
              <div className="mx-auto max-w-xl text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary">
                  <Bot className="h-8 w-8" aria-hidden />
                </div>
                <p className="text-xl font-bold text-forest">আসসালামু আলাইকুম! কী জানতে চান?</p>
                <p className="mt-1 text-ink-soft">নিচের প্রশ্নে ট্যাপ করুন, লিখুন{voice.supported ? ' অথবা 🎤 চেপে কথা বলুন' : ''}।</p>
                <ul className="mt-5 grid gap-2 text-left">
                  {DEFAULT_FOLLOWUPS.map((s) => (
                    <li key={s}>
                      <button type="button" onClick={() => send(s)} className="w-full rounded-2xl bg-white px-4 py-3 text-left font-medium ring-1 ring-forest/10 transition hover:bg-primary-50 hover:ring-primary/30">
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
                <Notice tone="info" className="mt-6 text-left">
                  {mode === 'server'
                    ? 'উত্তর তৈরি করে AI, কৃষিবাংলার জ্ঞানভান্ডার দেখে — তবু ভুল হতে পারে। রোগ বা পশু-পাখির অসুস্থতায় অবশ্যই কৃষি/প্রাণিসম্পদ কর্মকর্তার পরামর্শ নিন। পাতার ছবি পাঠালে AI সম্ভাব্য কারণ বলবে।'
                    : 'উত্তরগুলো কৃষিবাংলার তথ্যভান্ডার থেকে আসে। রোগ বা পশু-পাখির অসুস্থতায় অবশ্যই কৃষি/প্রাণিসম্পদ কর্মকর্তার পরামর্শ নিন।'}
                </Notice>
              </div>
            )}
            {msgs.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end gap-2">
                  <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-4 py-3 text-white shadow-soft">
                    {m.imageUrl && <img src={m.imageUrl} alt="সংযুক্ত ছবি" className="mb-2 max-h-48 rounded-2xl" />}
                    {!m.imageUrl && m.hadImage && <p className="mb-1 text-xs text-white/70">[ছবি সংযুক্ত ছিল]</p>}
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                  <span className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest sm:flex" aria-hidden>
                    <User className="h-4 w-4" />
                  </span>
                </div>
              ) : (
                <div key={m.id} className="flex gap-2">
                  <span className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-harvest text-forest sm:flex" aria-hidden>
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className={cn('max-w-[92%] rounded-3xl rounded-bl-lg px-4 py-3 shadow-soft', m.error ? 'bg-red-50 text-red-900 ring-1 ring-red-200' : 'bg-white ring-1 ring-forest/5')}>
                    {m.error ? <p>{m.text}</p> : <AnswerBody m={m} />}
                  </div>
                </div>
              ),
            )}
            {busy && !msgs.some((m) => m.streaming && m.text) && (
              <div className="flex gap-2" role="status" aria-label="কৃষকবন্ধু লিখছে">
                <span className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-harvest text-forest sm:flex" aria-hidden>
                  <Bot className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-lg bg-white px-5 py-4 shadow-soft ring-1 ring-forest/5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2.5 w-2.5 animate-blink rounded-full bg-primary" style={{ animationDelay: `${i * 0.18}s` }} />
                  ))}
                </div>
              </div>
            )}
            {!busy && lastFollowUps.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-0 sm:pl-10">
                {lastFollowUps.map((f) => (
                  <button key={f} type="button" onClick={() => send(f)} className="chip">
                    {f}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="border-t border-forest/5 bg-white p-3 sm:p-4"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            {image && (
              <div className="mb-2 flex items-center gap-3 rounded-2xl bg-cream p-2">
                <img src={image.url} alt="সংযুক্ত ছবির প্রিভিউ" className="h-14 w-14 rounded-xl object-cover" />
                <p className="flex-1 text-xs text-ink-soft">
                  {mode === 'server' && server.config?.ai.vision
                    ? 'পাঠালে AI ছবি দেখে সম্ভাব্য কারণ বলবে (নিশ্চিত নির্ণয় নয়)। ছবি সংরক্ষণ করা হয় না।'
                    : mode === 'ai'
                      ? 'ছবিটি আপনার AI সেবায় পাঠানো হবে।'
                      : 'এই মোডে ছবি বিশ্লেষণ হয় না—শুধু প্রিভিউ।'}
                </p>
                <button type="button" onClick={() => setImage(null)} className="rounded-lg p-2 hover:bg-white" aria-label="ছবি সরান">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {(imgErr || voice.error) && <p className="mb-2 text-sm text-red-700" role="alert">{imgErr || voice.error}</p>}
            <div className="flex items-end gap-2">
              <label className="inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-cream text-forest hover:bg-primary-50" title="ছবি সংযুক্ত করুন">
                <ImagePlus className="h-5 w-5" aria-hidden />
                <span className="sr-only">ছবি সংযুক্ত করুন</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              <label htmlFor="chat-input" className="sr-only">আপনার প্রশ্ন</label>
              <textarea
                id="chat-input"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="এখানে প্রশ্ন লিখুন…"
                className="field max-h-40 min-h-[48px] flex-1 resize-none py-3"
              />
              {voice.supported && (
                <button
                  type="button"
                  onClick={voice.listening ? voice.stop : voice.start}
                  className={cn('inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition', voice.listening ? 'animate-pulse bg-red-500 text-white' : 'bg-cream text-forest hover:bg-primary-50')}
                  aria-pressed={voice.listening}
                  aria-label={voice.listening ? 'শোনা বন্ধ করুন' : 'কথা বলে প্রশ্ন করুন'}
                >
                  {voice.listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
              )}
              <button type="submit" disabled={!input.trim() || busy} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white transition hover:bg-primary-700 disabled:opacity-40" aria-label="পাঠান">
                <Send className="h-5 w-5" />
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
