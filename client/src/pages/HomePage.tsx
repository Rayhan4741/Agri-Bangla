import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Bot, Calculator, CalendarDays, CloudSun, Download, FlaskConical, Link2, Mic, Microscope, Smartphone, Sparkles, WifiOff } from 'lucide-react';
import { Hero } from '@/components/hero/Hero';
import { NAV } from '@/components/navigation/navItems';
import { CropCard } from '@/components/crops/CropCard';
import { Reveal } from '@/components/common/Reveal';
import { Badge, buttonClass, DataStatusBadge, SectionTitle } from '@/components/common/ui';
import { advisories, calendarData, calculatorsData, cropCategories, crops, diseases, faqs, getCrop, SEASON_BN } from '@/lib/data';
import { districts } from '@/lib/geo';
import { useServer } from '@/context/ServerContext';
import { answer } from '@/lib/chatEngine';
import { convertArea } from '@/lib/calculators';
import { banglaDate } from '@/lib/season';
import { formatBn, toBnDigits } from '@/lib/formatting';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { cn } from '@/lib/cn';

function QuickActions() {
  const items = NAV.filter((n) => n.to !== '/');
  return (
    <section className="container-page relative z-10 -mt-14" aria-labelledby="qa-title">
      <h2 id="qa-title" className="sr-only">কী করতে চান?</h2>
      <div className="card p-3 sm:p-4">
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {items.slice(0, 13).map((n) => {
            const Icon = n.icon;
            return (
              <li key={n.to}>
                <Link to={n.to} className="group flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl p-2 text-center transition hover:bg-cream">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl transition group-hover:scale-105" style={{ background: `${n.color}17`, color: n.color }}>
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold leading-tight text-forest">{n.tile ?? n.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function ThisMonth() {
  const now = new Date();
  const month = calendarData.months.find((m) => m.month === now.getMonth() + 1)!;
  const bd = banglaDate(now);
  return (
    <section className="container-page mt-20" aria-labelledby="tm-title">
      <Reveal>
        <div className="grid gap-6 overflow-hidden rounded-4xl bg-forest p-6 text-white shadow-lift sm:p-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-leaf ring-1 ring-white/15">
              <CalendarDays className="h-4 w-4" aria-hidden /> এই মাসের কৃষি কাজ
            </span>
            <h2 id="tm-title" className="mt-4 text-3xl font-bold text-white sm:text-4xl">
              {month.nameBn}
              <span className="block text-xl font-medium text-white/70">{bd.labelBn} · {bd.rituBn}কাল</span>
            </h2>
            <p className="mt-4 text-lg text-white/85">{month.focusBn}</p>
            <p className="mt-4 text-xs text-white/60">{calendarData.variationNoteBn}</p>
            <Link to="/calendar" className={buttonClass('gold', 'md', 'mt-6')}>
              পুরো ক্যালেন্ডার দেখুন <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {month.tasks.map((t) => {
              const crop = getCrop(t.cropId);
              return (
                <li key={t.id} className="rounded-3xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur">
                  <p className="flex items-center gap-2 text-sm font-semibold text-harvest">
                    <span aria-hidden className="text-xl">{crop?.icon ?? '📌'}</span>
                    {crop?.nameBn ?? t.stageBn} {crop && <span className="text-white/60">· {t.stageBn}</span>}
                  </p>
                  <p className="mt-1.5 text-white/90">{t.taskBn}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

function AssistantPreview() {
  const server = useServer();
  const live = server.status === 'online' && !!server.config?.ai.enabled;
  const q = 'পুকুরের মাছ পানির ওপরে উঠে আসছে কেন?';
  const a = useMemo(() => answer(q), []);
  return (
    <div className="card relative flex h-full flex-col overflow-hidden p-6 lg:row-span-2">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-harvest text-forest">
          <Bot className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h3 className="text-xl font-bold">কৃষকবন্ধু AI</h3>
          <p className="text-sm text-ink-soft">{live ? 'AI চালু · জ্ঞানভান্ডার থেকে উৎসসহ উত্তর, ছবি দেখে সম্ভাব্য রোগ' : 'জ্ঞানভান্ডারভিত্তিক সহায়ক'}</p>
        </div>
      </div>
      <div className="flex-1 space-y-3 rounded-3xl bg-cream p-4">
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-white">{q}</div>
        <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-soft">
          <p className="text-[15px]">{a.text}</p>
          {a.steps && (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-soft">
              {a.steps.slice(0, 3).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          )}
          <div className="mt-2">
            <DataStatusBadge status={a.status} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link to="/ai-assistant" className={buttonClass('primary')}>
          প্রশ্ন করুন <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
          <Mic className="h-4 w-4" aria-hidden /> কথা বলেও প্রশ্ন করা যায়*
        </span>
      </div>
      <p className="mt-2 text-xs text-ink-soft">*ব্রাউজার সমর্থন করলে (সাধারণত Android-এ Chrome)।</p>
    </div>
  );
}

function MiniConverter() {
  const [v, setV] = useState(1);
  const bigha = calculatorsData.landUnits.find((u) => u.id === 'bigha')!;
  const dec = calculatorsData.landUnits.find((u) => u.id === 'decimal')!;
  const r = convertArea(v, bigha, dec);
  return (
    <div className="mt-4 flex items-center gap-2 rounded-2xl bg-cream p-3 text-sm">
      <label htmlFor="mini-bigha" className="sr-only">বিঘা</label>
      <input id="mini-bigha" type="number" min={0} step="0.5" value={v} onChange={(e) => setV(Math.max(0, Number(e.target.value)))} className="w-20 rounded-xl border border-forest/10 bg-white px-2 py-1.5 text-center font-semibold" />
      <span>বিঘা ≈</span>
      <strong className="text-lg text-primary-700">{r.ok ? formatBn(r.value, 1) : '—'}</strong>
      <span>শতাংশ</span>
    </div>
  );
}

function Features() {
  const install = useInstallPrompt();
  const tile = 'card card-hover flex h-full flex-col p-6';
  return (
    <section className="container-page mt-24" aria-labelledby="feat-title">
      <SectionTitle eyebrow="নতুন ধরনের কৃষি সহায়তা" title="এক জায়গায় সব কৃষি সেবা" description="ইন্টারনেট দুর্বল হলেও কাজ করে, কথা বলে প্রশ্ন করা যায়, আর প্রতিটি তথ্যে লেখা থাকে সেটি যাচাইকৃত নাকি নমুনা।" />
      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:row-span-2">
          <AssistantPreview />
        </Reveal>
        <Reveal delay={0.05}>
          <Link to="/diseases" className={tile}>
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C0533B]/10 text-[#C0533B]">
              <Microscope className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="text-xl font-bold">ছবি দেখে লক্ষণ খুঁজুন</h3>
            <p className="mt-2 text-ink-soft">লেখা ছাড়াই—গাছের অংশ, রং ও দাগের ধরন ট্যাপ করে সম্ভাব্য রোগ-পোকা খুঁজুন।</p>
            <div className="mt-4 flex gap-2" aria-hidden>
              {['🍃 পাতা', '🟡 হলুদ', '⚫ দাগ'].map((x) => (
                <span key={x} className="rounded-full bg-cream px-3 py-1 text-sm">{x}</span>
              ))}
            </div>
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <Link to="/weather" className={tile}>
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <CloudSun className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="text-xl font-bold">ঝুঁকি সতর্কতা ও স্প্রে-সময়</h3>
            <p className="mt-2 text-ink-soft">লাইভ পূর্বাভাস চালু করলে রোগের ঝুঁকি, ভারী বৃষ্টি ও স্প্রে করার উপযুক্ত সময় দেখাবে।</p>
            <p className="mt-auto pt-4 text-xs text-ink-soft">ডিফল্টে বন্ধ · উৎস: Open-Meteo</p>
          </Link>
        </Reveal>
        <Reveal delay={0.15}>
          <div className={tile}>
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest/10 text-forest">
              <Calculator className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="text-xl font-bold">স্থানীয় এককে হিসাব</h3>
            <p className="mt-2 text-ink-soft">বিঘা, কাঠা, শতাংশ—নিজের এলাকার মাপে জমি, সার, খরচ ও লাভের হিসাব।</p>
            <MiniConverter />
            <Link to="/calculator" className="mt-3 text-sm font-semibold text-primary hover:underline">
              সব হিসাব →
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <div className={cn(tile, 'bg-gradient-to-br from-primary to-forest text-white')}>
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <WifiOff className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="text-xl font-bold text-white">অফলাইনেও চলে</h3>
            <p className="mt-2 text-white/80">একবার খোলার পর নির্দেশিকা, হিসাব ও ক্যালেন্ডার ইন্টারনেট ছাড়াও খুলবে। হোম স্ক্রিনে অ্যাপের মতো রাখুন।</p>
            <div className="mt-auto pt-4">
              {install.installed ? (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-leaf"><Smartphone className="h-4 w-4" aria-hidden /> ইনস্টল করা আছে</span>
              ) : install.canInstall ? (
                <button type="button" onClick={install.install} className={buttonClass('gold', 'md')}>
                  <Download className="h-4 w-4" aria-hidden /> হোম স্ক্রিনে যোগ করুন
                </button>
              ) : (
                <p className="text-sm text-white/70">ব্রাউজারের মেনু থেকে “Add to Home screen” বেছে নিন।</p>
              )}
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.25} className="lg:col-span-3">
          <Link to="/profile" className={cn(tile, 'lg:flex-row lg:items-center lg:gap-5')}>
            <span className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-harvest-100 text-harvest-700 lg:mb-0">
              <Sparkles className="h-6 w-6" aria-hidden />
            </span>
            <span className="flex-1">
              <h3 className="text-xl font-bold">খামারের ডায়েরি ও হিসাবের খাতা</h3>
              <p className="mt-1 text-ink-soft">কাজ, খরচ ও খেতের ছবি তারিখসহ লিখে রাখুন—সব তথ্য শুধু আপনার ফোনেই থাকে। ব্যাকআপ নিন যেকোনো সময়।</p>
            </span>
            <span className="mt-3 font-semibold text-primary lg:mt-0">আমার খামার খুলুন →</span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

function CropShowcase() {
  const [cat, setCat] = useState('cereals');
  const list = crops.filter((c) => c.category === cat).slice(0, 4);
  return (
    <section className="container-page mt-24" aria-labelledby="crop-title">
      <SectionTitle
        eyebrow="ফসলের নির্দেশিকা"
        title="আপনার ফসল বেছে নিন"
        description="বীজতলা থেকে ফসল তোলা পর্যন্ত ধাপে ধাপে করণীয়, রোগ-পোকা ও সংরক্ষণ।"
        action={
          <Link to="/crops" className={buttonClass('outline')}>
            সব {toBnDigits(crops.length)}টি ফসল <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      />
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="ফসলের ধরন">
        {cropCategories.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={cn('chip shrink-0', cat === c.id && 'chip-active')}>
            <span aria-hidden>{c.icon}</span> {c.nameBn}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {list.map((c) => (
          <CropCard key={c.id} crop={c} />
        ))}
      </div>
    </section>
  );
}

function Advisories() {
  return (
    <section className="container-page mt-24" aria-labelledby="adv-title">
      <SectionTitle eyebrow="মৌসুমি পরামর্শ" title="সময়মতো করণীয়" description="নমুনা পরামর্শ — আপনার এলাকার জন্য উপজেলা কৃষি অফিসে যাচাই করুন।" />
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2">
        {advisories.map((a) => (
          <article key={a.id} className="card w-[280px] shrink-0 snap-start p-5 sm:w-[320px]">
            <div className="mb-3 flex items-center justify-between">
              <Badge tone="grey">{SEASON_BN[a.seasonId]}</Badge>
              <DataStatusBadge status={a.dataStatus} />
            </div>
            <h3 className="text-lg font-bold">{a.titleBn}</h3>
            <p className="mt-2 text-ink-soft">{a.bodyBn}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Honesty() {
  const stats = [
    { n: crops.length, label: 'ফসলের নির্দেশিকা' },
    { n: diseases.length, label: 'রোগ ও পোকামাকড়' },
    { n: faqs.length, label: 'প্রশ্ন ও উত্তর' },
    { n: districts.length, label: 'জেলা' },
  ];
  return (
    <section className="container-page mt-24" aria-labelledby="hon-title">
      <Reveal>
        <div className="grid gap-8 rounded-4xl bg-white p-6 shadow-soft ring-1 ring-forest/5 sm:p-10 lg:grid-cols-2">
          <div>
            <span className="eyebrow">স্বচ্ছ তথ্য</span>
            <h2 id="hon-title" className="mt-3 text-2xl font-bold sm:text-3xl">কোন তথ্য কতটা নির্ভরযোগ্য—সবসময় লেখা থাকে</h2>
            <p className="mt-3 text-ink-soft">আমরা বাজারদর, আবহাওয়া, সরকারি সহায়তা বা ফোন নম্বর বানিয়ে দিই না। প্রতিটি নির্দেশিকায় একটি চিহ্ন থাকে:</p>
            <ul className="mt-5 space-y-3">
              <li className="flex items-start gap-3"><DataStatusBadge status="verified" /><span className="text-sm">নির্দিষ্ট সরকারি উৎসের সাথে মিলিয়ে দেখা হয়েছে।</span></li>
              <li className="flex items-start gap-3"><DataStatusBadge status="link-checked" /><span className="text-sm">ওয়েবসাইট সক্রিয় আছে যাচাই করা হয়েছে।</span></li>
              <li className="flex items-start gap-3"><DataStatusBadge status="illustrative" /><span className="text-sm">শিক্ষামূলক নমুনা—প্রয়োগের আগে কৃষি কর্মকর্তার সাথে যাচাই করুন।</span></li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-primary" aria-hidden /> ব্যাকএন্ড নেই</span>
              <span className="inline-flex items-center gap-1.5"><Link2 className="h-4 w-4 text-primary" aria-hidden /> সরকারি লিংক</span>
              <span className="inline-flex items-center gap-1.5"><FlaskConical className="h-4 w-4 text-primary" aria-hidden /> নমুনা চিহ্নিত</span>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-4 self-center">
            {stats.map((s) => (
              <div key={s.label} className="rounded-3xl bg-cream p-6 text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-4xl font-bold text-primary">{toBnDigits(s.n)}</dd>
                <dd className="mt-1 text-sm font-medium text-ink-soft">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <QuickActions />
      <ThisMonth />
      <Features />
      <CropShowcase />
      <Advisories />
      <Honesty />
    </>
  );
}
