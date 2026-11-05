import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CloudOff, CloudSun, Droplets, RefreshCw, SprayCan, ThermometerSun, Wind, Wifi, WifiOff } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, DataStatusBadge, Notice, PageHeader, SectionTitle, Spinner } from '@/components/common/ui';
import { LocationSelector } from '@/components/common/LocationSelector';
import { DistrictMap } from '@/components/weather/DistrictMap';
import { SpeakButton } from '@/components/common/SpeakButton';
import { VerifyWith } from '@/components/common/VerifyWith';
import { useForecast } from '@/hooks/useForecast';
import { usePrefs } from '@/hooks/useStored';
import { weatherData } from '@/lib/data';
import { getDistrict, HAZARD_BN } from '@/lib/geo';
import { evaluateRisks, findSprayWindows, WEATHER_PROVIDER, weatherCodeBn } from '@/lib/weather';
import { BN_WEEKDAYS, formatBn, formatDateBn, formatTimeBn, toBnDigits } from '@/lib/formatting';
import { cropSeasonForMonth, SEASON_LABEL_BN } from '@/lib/season';
import type { WeatherGuide } from '@/types';
import { cn } from '@/lib/cn';

const SEASON_GUIDES: Record<string, string[]> = {
  rabi: ['wg-cold', 'wg-humidity', 'wg-drought', 'wg-irrigation-plan'],
  'kharif-1': ['wg-heat', 'wg-flash-flood', 'wg-heavy-rain', 'wg-drought'],
  'kharif-2': ['wg-flood', 'wg-heavy-rain', 'wg-humidity', 'wg-cyclone'],
};
const HAZARD_TO_GUIDE: Record<string, string> = { flood: 'wg-flood', 'flash-flood': 'wg-flash-flood', salinity: 'wg-salinity', drought: 'wg-drought', cyclone: 'wg-cyclone', 'river-erosion': 'wg-flood' };

function dayLabel(date: string) {
  const d = new Date(`${date}T00:00:00`);
  return `${BN_WEEKDAYS[d.getDay()]} ${toBnDigits(d.getDate())}`;
}

function GuideBlock({ g, anchor = false }: { g: WeatherGuide; anchor?: boolean }) {
  const [open, setOpen] = useState(false);
  const text = [g.titleBn, g.summaryBn, ...g.beforeBn, ...g.duringBn, ...g.afterBn].join('। ');
  return (
    <article id={anchor ? g.id : undefined} className="card scroll-mt-28 p-5">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 text-left">
        <span className="text-3xl" aria-hidden>{g.icon}</span>
        <span className="flex-1">
          <span className="block text-lg font-bold text-forest">{g.titleBn}</span>
          <span className="block text-ink-soft">{g.summaryBn}</span>
        </span>
      </button>
      {open && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            ['আগে', g.beforeBn],
            ['চলাকালীন', g.duringBn],
            ['পরে', g.afterBn],
          ]
            .filter(([, l]) => (l as string[]).length)
            .map(([t, l]) => (
              <div key={t as string} className="rounded-2xl bg-cream p-3">
                <p className="mb-1.5 font-semibold text-primary-700">{t as string}</p>
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {(l as string[]).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            ))}
          <div className="flex items-center gap-2 sm:col-span-3">
            <DataStatusBadge status={g.dataStatus} />
            <SpeakButton text={text} />
          </div>
        </div>
      )}
    </article>
  );
}

function LivePanel() {
  const fc = useForecast();
  const [prefs, update] = usePrefs();
  const district = getDistrict(prefs.districtId);

  const risks = useMemo(() => (fc.data ? evaluateRisks(fc.data.daily, weatherData.riskRules) : []), [fc.data]);
  const windows = useMemo(() => (fc.data ? findSprayWindows(fc.data.hourly, weatherData.sprayRule).slice(0, 4) : []), [fc.data]);

  if (fc.status === 'off')
    return (
      <Card className="border-2 border-dashed border-forest/15 bg-white/70 shadow-none">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cream text-ink-soft">
            <CloudOff className="h-7 w-7" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="text-xl font-bold">লাইভ আবহাওয়ার তথ্য সংযুক্ত নয়</p>
            <p className="mt-1 text-ink-soft">
              চাইলে {WEATHER_PROVIDER.name} (বিনামূল্যে, কী লাগে না) থেকে আপনার জেলার ৭ দিনের পূর্বাভাস আনা যায়। চালু করলে আপনার জেলার আনুমানিক অবস্থান ওই সেবায় পাঠানো হবে। নিচে ঋতুভিত্তিক পরামর্শ সবসময় দেখা যাবে।
            </p>
          </div>
          <Button onClick={() => update({ liveWeather: true })}>
            <Wifi className="h-4 w-4" aria-hidden /> লাইভ পূর্বাভাস চালু করুন
          </Button>
        </div>
      </Card>
    );

  if (fc.status === 'no-district')
    return (
      <Notice tone="info" title="জেলা নির্বাচন করুন">
        লাইভ পূর্বাভাস দেখতে ওপরে বা মানচিত্রে আপনার জেলা বাছুন।
      </Notice>
    );

  if (fc.status === 'loading' && !fc.data)
    return (
      <Card className="flex items-center justify-center py-14">
        <Spinner label={`${district?.nameBn ?? ''} জেলার পূর্বাভাস আনা হচ্ছে…`} />
      </Card>
    );

  if (fc.status === 'error' || fc.status === 'offline')
    return (
      <Notice tone="danger" title={fc.status === 'offline' ? 'ইন্টারনেট সংযোগ নেই' : 'পূর্বাভাস আনা যায়নি'}>
        <p>{fc.status === 'offline' ? 'অনলাইনে ফিরে আবার চেষ্টা করুন।' : 'সেবাটি সাময়িকভাবে পাওয়া যাচ্ছে না বা অনুরোধটি আটকে গেছে।'} ততক্ষণ নিচের ঋতুভিত্তিক পরামর্শ দেখুন।</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={fc.retry}>
            <RefreshCw className="h-4 w-4" aria-hidden /> আবার চেষ্টা
          </Button>
          <Button size="sm" variant="ghost" onClick={() => update({ liveWeather: false })}>
            লাইভ বন্ধ করুন
          </Button>
        </div>
      </Notice>
    );

  const data = fc.data!;
  const cur = data.current;
  const first = data.daily[0]?.date;
  const last = data.daily[data.daily.length - 1]?.date;
  const chart = data.daily.map((d) => ({ day: dayLabel(d.date), max: d.tempMax, min: d.tempMin, rain: d.precipSum }));

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-[#2D7FB8] to-forest p-6 text-white shadow-lift">
          <p className="text-sm text-white/80">{district?.nameBn} · এখন</p>
          {cur && (
            <>
              <p className="mt-2 text-6xl font-bold tracking-tight">{formatBn(cur.temp, 0)}°<span className="text-2xl">সে</span></p>
              <p className="text-lg">{weatherCodeBn(cur.code).label}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <span className="flex items-center gap-1.5"><Droplets className="h-4 w-4" aria-hidden /> {formatBn(cur.humidity, 0)}%</span>
                <span className="flex items-center gap-1.5"><Wind className="h-4 w-4" aria-hidden /> {formatBn(cur.wind, 0)} কিমি/ঘ</span>
                <span className="flex items-center gap-1.5"><ThermometerSun className="h-4 w-4" aria-hidden /> {formatBn(data.daily[0]?.tempMax ?? NaN, 0)}°</span>
              </div>
            </>
          )}
          <dl className="mt-5 space-y-0.5 text-xs text-white/75">
            <div><dt className="inline">উৎস: </dt><dd className="inline"><a href={WEATHER_PROVIDER.url} target="_blank" rel="noopener noreferrer" className="underline">{data.provider}</a> (মডেলভিত্তিক পূর্বাভাস)</dd></div>
            <div><dt className="inline">সংগ্রহের সময়: </dt><dd className="inline">{formatDateBn(data.retrievedAt)}, {formatTimeBn(data.retrievedAt)}</dd></div>
            {first && last && <div><dt className="inline">পূর্বাভাসের সময়কাল: </dt><dd className="inline">{formatDateBn(new Date(`${first}T00:00:00`))} – {formatDateBn(new Date(`${last}T00:00:00`))}</dd></div>}
          </dl>
          {fc.status === 'loading' && <p className="mt-2 text-xs">হালনাগাদ হচ্ছে…</p>}
        </div>
        <Card className="p-4">
          <p className="px-1 font-semibold">৭ দিনের তাপমাত্রা (°সে)</p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ left: -18, right: 30, top: 10 }}>
                <CartesianGrid stroke="#123D2B12" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#4A6357' }} />
                <YAxis tick={{ fontSize: 12, fill: '#4A6357' }} domain={['dataMin - 2', 'dataMax + 2']} tickFormatter={(v: number) => formatBn(v, 0)} />
                <Tooltip formatter={(v: number, n: string) => [`${formatBn(v, 1)}°`, n === 'max' ? 'সর্বোচ্চ' : 'সর্বনিম্ন']} />
                <Legend formatter={(n: string) => <span className="text-xs text-ink">{n === 'max' ? 'সর্বোচ্চ' : 'সর্বনিম্ন'}</span>} />
                <Line dataKey="max" stroke="#eb6834" strokeWidth={2} dot={{ r: 3 }} />
                <Line dataKey="min" stroke="#2a78d6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 px-1 font-semibold">দৈনিক বৃষ্টি (মিমি)</p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ left: -18, right: 30, top: 6 }}>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#4A6357' }} />
                <YAxis tick={{ fontSize: 12, fill: '#4A6357' }} tickFormatter={(v: number) => formatBn(v, 0)} />
                <Tooltip formatter={(v: number) => [`${formatBn(v, 1)} মিমি`, 'বৃষ্টি']} cursor={{ fill: '#123D2B08' }} />
                <Bar dataKey="rain" fill="#2a78d6" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
        {data.daily.map((d) => (
          <div key={d.date} className="card min-w-[120px] flex-1 p-3 text-center">
            <p className="text-sm font-semibold">{dayLabel(d.date)}</p>
            <p className="mt-1 text-lg font-bold">{formatBn(d.tempMax, 0)}° <span className="text-sm font-medium text-ink-soft">/ {formatBn(d.tempMin, 0)}°</span></p>
            <p className="text-xs text-sky-700">🌧 {formatBn(d.precipSum, 1)} মিমি{d.precipProbMax !== null ? ` · ${formatBn(d.precipProbMax, 0)}%` : ''}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="flex items-center gap-2 text-lg font-bold"><AlertTriangle className="h-5 w-5 text-harvest-700" aria-hidden /> ঝুঁকি সতর্কতা (নিয়মভিত্তিক)</h3>
          {risks.length ? (
            <ul className="mt-3 space-y-3">
              {risks.map((r) => (
                <li key={r.rule.id} className={cn('rounded-2xl p-3 ring-1', r.rule.level === 'warning' ? 'bg-red-50 ring-red-200' : 'bg-amber-50 ring-amber-200')}>
                  <p className="font-semibold">{r.rule.titleBn}</p>
                  <p className="text-sm">{r.rule.adviceBn}</p>
                  <p className="mt-1 text-xs text-ink-soft">দিন: {r.days.map(dayLabel).join(', ')} · <Link className="font-semibold text-primary hover:underline" to={`/weather#${r.rule.guideId}`}>বিস্তারিত</Link></p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-ink-soft">সামনের দিনগুলোতে নির্ধারিত নিয়ম অনুযায়ী বিশেষ কোনো ঝুঁকি দেখা যাচ্ছে না।</p>
          )}
          <p className="mt-3 text-xs text-ink-soft">এগুলো সরকারি সতর্কবার্তা নয়—পূর্বাভাসের সংখ্যার ওপর সাধারণ নিয়ম প্রয়োগ করে তৈরি। {weatherData.disclaimerBn}</p>
        </Card>
        <Card>
          <h3 className="flex items-center gap-2 text-lg font-bold"><SprayCan className="h-5 w-5 text-primary" aria-hidden /> স্প্রে করার সম্ভাব্য সময়</h3>
          {windows.length ? (
            <ul className="mt-3 space-y-2">
              {windows.map((w) => (
                <li key={w.start} className="flex items-center justify-between rounded-2xl bg-primary-50 p-3">
                  <span className="font-semibold">{dayLabel(w.start.slice(0, 10))}</span>
                  <span>
                    {formatTimeBn(new Date(w.start))} – {formatTimeBn(new Date(new Date(w.end).getTime() + 3600000))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-ink-soft">আগামী কয়েক দিনে বাতাস কম ও বৃষ্টিহীন উপযুক্ত সময় পাওয়া যায়নি।</p>
          )}
          <p className="mt-3 text-xs text-ink-soft">
            নিয়ম: বাতাস {toBnDigits(weatherData.sprayRule.maxWindKmh)} কিমি/ঘণ্টার কম এবং পরের {toBnDigits(weatherData.sprayRule.rainFreeHoursAfter)} ঘণ্টা বৃষ্টি নেই। {weatherData.sprayRule.noteBn}
          </p>
        </Card>
      </div>
    </div>
  );
}

export default function WeatherPage() {
  const [prefs, update] = usePrefs();
  const district = getDistrict(prefs.districtId);
  const season = cropSeasonForMonth(new Date().getMonth() + 1);
  const seasonGuides = weatherData.guides.filter((g) => SEASON_GUIDES[season]?.includes(g.id));
  const districtGuides = district ? weatherData.guides.filter((g) => district.hazards.some((h) => HAZARD_TO_GUIDE[h] === g.id)) : [];

  return (
    <>
      <PageHeader eyebrow="আবহাওয়া পরামর্শ" title="আবহাওয়া ও কৃষি ঝুঁকি" description="ঋতুভিত্তিক প্রস্তুতি, জেলার ঝুঁকি এবং ঐচ্ছিক লাইভ পূর্বাভাস।" icon={<CloudSun className="h-7 w-7 text-leaf" />}>
        <div className="glass max-w-2xl rounded-3xl p-4">
          <LocationSelector variant="glass" compact />
          {prefs.liveWeather && (
            <button type="button" onClick={() => update({ liveWeather: false })} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white">
              <WifiOff className="h-4 w-4" aria-hidden /> লাইভ পূর্বাভাস বন্ধ করুন
            </button>
          )}
        </div>
      </PageHeader>

      <div className="container-page mt-8 space-y-14">
        <LivePanel />

        <section>
          <SectionTitle eyebrow={SEASON_LABEL_BN[season]} title="এই মৌসুমের প্রস্তুতি" description="ঋতুভিত্তিক সাধারণ পরামর্শ — লাইভ তথ্য ছাড়াও কাজে লাগবে।" />
          <div className="grid gap-4 md:grid-cols-2">
            {seasonGuides.map((g) => (
              <GuideBlock key={g.id} g={g} />
            ))}
          </div>
        </section>

        {district && districtGuides.length > 0 && (
          <section>
            <SectionTitle title={`${district.nameBn} জেলার জন্য বিশেষ সতর্কতা`} description={`নমুনা ঝুঁকি তালিকা: ${district.hazards.map((h) => HAZARD_BN[h]).join(', ')}`} />
            <div className="grid gap-4 md:grid-cols-2">
              {districtGuides.map((g) => (
                <GuideBlock key={g.id} g={g} />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionTitle eyebrow="জেলা মানচিত্র" title="কোন জেলায় কী ঝুঁকি" description="টাইলে ট্যাপ করে জেলা বাছুন; ওপরের পূর্বাভাস সেই জেলার জন্য দেখাবে।" />
          <DistrictMap />
        </section>

        <section>
          <SectionTitle title="সব আবহাওয়া নির্দেশিকা" />
          <div className="grid gap-4 md:grid-cols-2">
            {weatherData.guides.map((g) => (
              <GuideBlock key={g.id} g={g} anchor />
            ))}
          </div>
          <VerifyWith ids={['bmd', 'dae']} className="mt-6" />
        </section>
      </div>
    </>
  );
}
