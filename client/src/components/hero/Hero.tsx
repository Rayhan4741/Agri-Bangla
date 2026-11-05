import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Bot, BookOpenText, CloudSun, Leaf, Microscope, MonitorPlay, PauseCircle, Sprout, Wifi, WifiOff } from 'lucide-react';
import { HeroFallback } from './HeroFallback';
import { PRESETS, presetForDate, type PresetId } from './scene/presets';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { LocationSelector } from '@/components/common/LocationSelector';
import { buttonClass } from '@/components/common/ui';
import { HERO_REASON_BN, useHeroMode } from '@/hooks/useHeroMode';
import { useForecast } from '@/hooks/useForecast';
import { usePrefs } from '@/hooks/useStored';
import { banglaDate, cropSeasonForMonth, SEASON_LABEL_BN } from '@/lib/season';
import { formatBn, formatTimeBn } from '@/lib/formatting';
import { getDistrict } from '@/lib/geo';
import { weatherCodeBn } from '@/lib/weather';
import { cn } from '@/lib/cn';

const FieldScene = lazy(() => import('./FieldScene'));

function WeatherCard() {
  const [prefs, update] = usePrefs();
  const fc = useForecast();
  const bd = banglaDate();
  const season = SEASON_LABEL_BN[cropSeasonForMonth(new Date().getMonth() + 1)];
  const district = getDistrict(prefs.districtId);

  return (
    <div className="glass w-full rounded-3xl p-4 text-white sm:w-72">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-white/90">
          <CloudSun className="h-4 w-4" aria-hidden /> আবহাওয়া
        </p>
        <span className="text-xs text-white/70">{bd.labelBn}</span>
      </div>
      {fc.status === 'ok' && fc.data?.current ? (
        <div className="mt-2">
          <p className="text-4xl font-bold tracking-tight">{formatBn(fc.data.current.temp, 0)}°<span className="text-xl">সে</span></p>
          <p className="text-sm text-white/85">
            {weatherCodeBn(fc.data.current.code).label} · আর্দ্রতা {formatBn(fc.data.current.humidity, 0)}%
          </p>
          <p className="mt-2 text-[11px] leading-snug text-white/70">
            {district?.nameBn} · উৎস: {fc.data.provider} · সংগ্রহ: {formatTimeBn(fc.data.retrievedAt)}
          </p>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-lg font-semibold">{bd.rituBn} · {season}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/75">
            <WifiOff className="h-3.5 w-3.5" aria-hidden />
            {fc.status === 'loading' ? 'লাইভ তথ্য আনা হচ্ছে…' : fc.status === 'error' || fc.status === 'offline' ? 'লাইভ তথ্য আনা যায়নি' : 'লাইভ আবহাওয়ার তথ্য সংযুক্ত নয়'}
          </p>
          {!prefs.liveWeather && (
            <button
              type="button"
              onClick={() => update({ liveWeather: true })}
              className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-white/15 px-3 text-xs font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/25"
            >
              <Wifi className="h-3.5 w-3.5" aria-hidden /> লাইভ আবহাওয়া চালু করুন
            </button>
          )}
          {prefs.liveWeather && !district && <p className="mt-2 text-xs text-white/80">লাইভ তথ্যের জন্য নিচে জেলা বাছুন।</p>}
        </div>
      )}
    </div>
  );
}

function CropHealthCard() {
  return (
    <Link to="/diseases" className="glass group block w-full rounded-3xl p-4 text-white transition hover:bg-white/20 sm:w-72">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-white/90">
          <Leaf className="h-4 w-4" aria-hidden /> ফসলের স্বাস্থ্য
        </p>
        <span className="rounded-full bg-harvest/90 px-2 py-0.5 text-[10px] font-bold text-forest">নমুনা</span>
      </div>
      <p className="mt-2 font-semibold">আমন ধান · থোড় পর্যায়</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20" aria-hidden>
        <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-leaf to-harvest" />
      </div>
      <p className="mt-2 text-xs text-white/80">পাতায় দাগ বা হলুদভাব? ছবি ও লক্ষণ দিয়ে সম্ভাব্য কারণ খুঁজুন →</p>
    </Link>
  );
}

export function Hero() {
  const hero = useHeroMode();
  const reduce = useReducedMotion();
  const [preset, setPreset] = useState<PresetId>(presetForDate());
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.02 });
    io.observe(el);
    const onVis = () => setVisible(document.visibilityState === 'visible' && el.getBoundingClientRect().bottom > 0);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const fade = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] } };

  return (
    <section ref={ref} className="grain relative isolate min-h-[100svh] overflow-hidden bg-forest" aria-labelledby="hero-title">
      {/* background: static illustration always rendered underneath; 3D fades in over it */}
      <div className="absolute inset-0 -z-10">
        <HeroFallback animate={!reduce} />
        {hero.show3d && (
          <ErrorBoundary fallback={null} onError={hero.markError}>
            <Suspense fallback={null}>
              <div className={cn('absolute inset-0 transition-opacity duration-[1600ms]', ready ? 'opacity-100' : 'opacity-0')}>
                <FieldScene preset={preset} active={visible} quality={hero.quality} onReady={() => setReady(true)} />
              </div>
            </Suspense>
          </ErrorBoundary>
        )}
        {/* readability scrims */}
        <div className="absolute inset-0 bg-gradient-to-r from-forest-900/75 via-forest-900/25 to-transparent lg:from-forest-900/70 lg:via-forest-900/15" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-forest-900/75 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-forest-900/40 to-transparent" />
      </div>

      <div className="container-page flex min-h-[100svh] flex-col justify-center pb-44 pt-28 lg:pb-40">
        <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="max-w-2xl">
            <motion.p {...fade(0.05)} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur">
              <Sprout className="h-4 w-4 text-leaf" aria-hidden /> বাংলাদেশের কৃষকের ডিজিটাল সহায়ক
            </motion.p>
            <motion.h1
              {...fade(0.15)}
              id="hero-title"
              className="text-balance text-4xl font-bold leading-[1.15] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,.35)] sm:text-5xl lg:text-6xl"
            >
              সুস্থ ফসল, সমৃদ্ধ কৃষক,{' '}
              <span className="bg-gradient-to-r from-harvest via-[#f4d58d] to-leaf bg-clip-text text-transparent">স্মার্ট বাংলাদেশ</span>
            </motion.h1>
            <motion.p {...fade(0.28)} className="mt-5 max-w-xl text-lg text-white/85 sm:text-xl">
              আপনার জমি, ফসল, আবহাওয়া ও খামারের জন্য বাংলায় সহজ কৃষি পরামর্শ।
            </motion.p>
            <motion.div {...fade(0.4)} className="mt-8 flex flex-wrap gap-3">
              <Link to="/ai-assistant" className={buttonClass('gold', 'lg')}>
                <Bot className="h-5 w-5" aria-hidden /> AI কৃষি সহায়ক
              </Link>
              <Link to="/crops" className={buttonClass('glass', 'lg')}>
                <BookOpenText className="h-5 w-5" aria-hidden /> ফসলের নির্দেশিকা
              </Link>
              <Link to="/diseases" className={buttonClass('glass', 'lg')}>
                <Microscope className="h-5 w-5" aria-hidden /> রোগ শনাক্ত করুন
              </Link>
            </motion.div>
            <motion.div {...fade(0.52)} className="glass mt-8 max-w-xl rounded-3xl p-4">
              <LocationSelector variant="glass" compact />
            </motion.div>
          </div>

          <motion.div {...fade(0.6)} className="flex flex-col gap-4 sm:flex-row lg:flex-col lg:items-end">
            <div className={cn(!reduce && 'lg:animate-float')}>
              <WeatherCard />
            </div>
            <div className={cn(!reduce && 'lg:animate-float lg:[animation-delay:1.4s]', 'lg:mr-10')}>
              <CropHealthCard />
            </div>
          </motion.div>
        </div>
      </div>

      {/* scene controls — kept above the quick-action panel that overlaps the hero's bottom edge */}
      <div className="absolute inset-x-0 bottom-0 z-20 pb-[4.75rem]">
        <div className="container-page flex flex-wrap items-center justify-between gap-3">
          {hero.show3d ? (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="দৃশ্যের ঋতু ও সময় বাছুন">
              {(Object.keys(PRESETS) as PresetId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPreset(id)}
                  aria-pressed={preset === id}
                  className={cn(
                    'min-h-[40px] rounded-full px-4 text-sm font-semibold backdrop-blur transition',
                    preset === id ? 'bg-white text-forest' : 'bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20',
                  )}
                >
                  {PRESETS[id].labelBn}
                </button>
              ))}
              <span className="hidden text-sm text-white/75 sm:inline">· {PRESETS[preset].hintBn}</span>
            </div>
          ) : (
            <p className="max-w-md text-sm text-white/80">{HERO_REASON_BN[hero.reason]}</p>
          )}
          <div className="flex gap-2">
            {hero.show3d ? (
              <button type="button" onClick={hero.disable3d} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/20">
                <PauseCircle className="h-4 w-4" aria-hidden /> ৩ডি বন্ধ
              </button>
            ) : (
              hero.canWebGL &&
              hero.reason !== 'error' && (
                <button type="button" onClick={hero.enable3d} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white/15 px-4 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25">
                  <MonitorPlay className="h-4 w-4" aria-hidden /> ৩ডি দৃশ্য দেখুন
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
