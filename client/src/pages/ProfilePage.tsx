import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Download, Heart, ListTodo, MessageSquare, NotebookPen, Plus, Receipt, RotateCcw, Settings, Sprout, Trash2, Upload, UserRound } from 'lucide-react';
import { Button, EmptyState, Notice, PageHeader } from '@/components/common/ui';
import { LocationSelector } from '@/components/common/LocationSelector';
import { useFavorites } from '@/components/common/FavoriteButton';
import type { MyCrop } from './CropDetailPage';
import { crops, getCrop } from '@/lib/data';
import { exportAll, importAll, isStorageAvailable, resetAll } from '@/lib/localStorage';
import { downloadText } from '@/lib/ics';
import { photoStore, downscale, validateImage } from '@/lib/photoStore';
import { setSessionKey } from '@/lib/aiProvider';
import { formatBn, formatDateBn, formatTaka, parseNumber, toBnDigits } from '@/lib/formatting';
import { STORE_KEYS, usePrefs, useStored } from '@/hooks/useStored';
import { AccountCard } from '@/components/profile/AccountCard';
import { cn } from '@/lib/cn';

interface Task {
  id: string;
  text: string;
  due?: string;
  done: boolean;
}
interface Expense {
  id: string;
  date: string;
  item: string;
  amount: number;
}
interface DiaryEntry {
  id: string;
  date: string;
  note: string;
  photoId?: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function Panel({ id, title, icon, children, action }: { id: string; title: string; icon: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-28 p-5 sm:p-6" aria-labelledby={`${id}-t`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-t`} className="flex items-center gap-2 text-xl font-bold">
          {icon} {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl p-3 hover:bg-cream">
      <span>
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block text-sm text-ink-soft">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden className={cn('relative mt-1 h-7 w-12 shrink-0 rounded-full transition peer-focus-visible:ring-4 peer-focus-visible:ring-harvest', checked ? 'bg-primary' : 'bg-forest/20')}>
        <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
      </span>
    </label>
  );
}

function DiaryPhoto({ id }: { id: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    photoStore
      .get(id)
      .then((b) => {
        if (b) {
          u = URL.createObjectURL(b);
          setUrl(u);
        }
      })
      .catch(() => setUrl(null));
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  if (!url) return <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-cream text-xs text-ink-soft">ছবি নেই</div>;
  return <img src={url} alt="খামারের ডায়েরির ছবি" className="h-24 w-24 rounded-2xl object-cover" loading="lazy" />;
}

export default function ProfilePage() {
  const [prefs, update] = usePrefs();
  const [myCrops, setMyCrops] = useStored<MyCrop[]>(STORE_KEYS.myCrops, []);
  const [tasks, setTasks] = useStored<Task[]>(STORE_KEYS.tasks, []);
  const [favs, setFavs] = useFavorites();
  const [expenses, setExpenses] = useStored<Expense[]>(STORE_KEYS.expenses, []);
  const [diary, setDiary] = useStored<DiaryEntry[]>(STORE_KEYS.diary, []);
  const [chat, setChat] = useStored<unknown[]>(STORE_KEYS.chat, []);
  const [taskText, setTaskText] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [exp, setExp] = useState({ date: today(), item: '', amount: '' });
  const [expErr, setExpErr] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [diaryErr, setDiaryErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const storageOk = isStorageAvailable();
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const addExpense = () => {
    const amount = parseNumber(exp.amount);
    if (!exp.item.trim()) return setExpErr('খরচের খাত লিখুন।');
    if (!Number.isFinite(amount) || amount <= 0) return setExpErr('টাকার পরিমাণ শূন্যের বেশি লিখুন।');
    setExpenses((l) => [{ id: uid(), date: exp.date, item: exp.item.trim(), amount }, ...l]);
    setExp({ date: today(), item: '', amount: '' });
    setExpErr(null);
  };

  const addDiary = async () => {
    if (!note.trim() && !photo) return setDiaryErr('কিছু লিখুন বা একটি ছবি দিন।');
    let photoId: string | undefined;
    if (photo) {
      photoId = uid();
      try {
        await photoStore.put(photoId, photo.blob);
      } catch {
        photoId = undefined;
        setDiaryErr('এই ব্রাউজারে ছবি সংরক্ষণ করা গেল না; লেখা সংরক্ষিত হয়েছে।');
      }
    }
    setDiary((d) => [{ id: uid(), date: today(), note: note.trim(), photoId }, ...d]);
    setNote('');
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
  };

  const onPhoto = async (f?: File) => {
    setDiaryErr(null);
    if (!f) return;
    const err = validateImage(f);
    if (err) return setDiaryErr(err);
    try {
      const blob = await downscale(f, 1024, 0.78);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setDiaryErr('ছবিটি পড়া যায়নি।');
    }
  };

  const doExport = () => {
    const data = { app: 'agribangla', exportedAt: new Date().toISOString(), note: 'ডায়েরির ছবি এই ফাইলে নেই', data: exportAll() };
    downloadText(`krishibangla-backup-${today()}.json`, JSON.stringify(data, null, 2), 'application/json');
    setMsg('আপনার তথ্য একটি JSON ফাইলে ডাউনলোড হয়েছে।');
  };

  const doImport = async (f?: File) => {
    if (!f) return;
    try {
      const json = JSON.parse(await f.text());
      if (json?.app !== 'agribangla' || typeof json.data !== 'object') throw new Error('bad');
      const n = importAll(json.data, [...Object.values(STORE_KEYS), 'landUnitSizes', 'quizScores']);
      setMsg(`${toBnDigits(n)}টি অংশ পুনরুদ্ধার হয়েছে।`);
    } catch {
      setMsg('ফাইলটি কৃষিবাংলার ব্যাকআপ নয় বা নষ্ট।');
    }
  };

  const doReset = async () => {
    resetAll();
    setSessionKey('');
    try {
      await photoStore.clear();
    } catch {
      /* no IDB */
    }
    setConfirmReset(false);
    setMsg('এই ব্রাউজারে কৃষিবাংলার সব সংরক্ষিত তথ্য মুছে ফেলা হয়েছে।');
  };

  return (
    <>
      <PageHeader eyebrow="আমার খামার" title="আমার খামারের খাতা" description="আপনার ফসল, কাজ, খরচ ও ডায়েরি — শুধু এই ফোন/ব্রাউজারে সংরক্ষিত।" icon={<UserRound className="h-7 w-7 text-leaf" />} />
      <div className="container-page mt-8 space-y-6">
        <AccountCard />
        <Notice tone="info" title="আপনার তথ্য কোথায় থাকে?">
          এখানে যা সংরক্ষণ করবেন তা এই ব্রাউজারের LocalStorage (ছবি IndexedDB-তে) এ থাকে। লগইন করে “খাতা সিঙ্ক করুন” চাপলে শুধু কাজ, খরচ ও ডায়েরির লেখা আপনার অ্যাকাউন্টে ব্যাকআপ হয়; ছবি কখনো সার্ভারে যায় না। ব্রাউজারের ডাটা মুছলে বা ইনকগনিটো মোডে এগুলো হারিয়ে যেতে পারে, তাই মাঝে মাঝে ব্যাকআপ নিন। পাসওয়ার্ড, ব্যাংক বা অন্য সংবেদনশীল তথ্য এখানে লিখবেন না।
        </Notice>
        {!storageOk && <Notice tone="danger">এই ব্রাউজারে LocalStorage বন্ধ আছে—তথ্য শুধু পাতা খোলা থাকা পর্যন্ত থাকবে।</Notice>}
        {msg && (
          <p className="rounded-2xl bg-primary-50 p-4 font-semibold text-primary-700" role="status">
            {msg}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel id="settings" title="পছন্দ ও এলাকা" icon={<Settings className="h-5 w-5 text-primary" aria-hidden />}>
            <div className="mb-3">
              <p className="label">পছন্দের ভাষা</p>
              <div className="inline-flex rounded-2xl bg-cream p-1" role="radiogroup" aria-label="ভাষা">
                {(['bn', 'en'] as const).map((l) => (
                  <button key={l} type="button" role="radio" aria-checked={prefs.language === l} onClick={() => update({ language: l })} className={cn('min-h-[44px] rounded-xl px-4 font-semibold', prefs.language === l ? 'bg-white shadow-soft' : 'text-ink-soft')}>
                    {l === 'bn' ? 'বাংলা' : 'English'}
                  </button>
                ))}
              </div>
              {prefs.language === 'en' && <p className="mt-1 text-xs text-ink-soft">কৃষিবাংলা বাংলা-প্রথম; English নির্বাচন করলে ফসলের ইংরেজি নাম প্রাধান্য পাবে। পূর্ণ ইংরেজি ইন্টারফেস এখনো নেই।</p>}
            </div>
            <LocationSelector />
            <div className="mt-3 divide-y divide-forest/5">
              <Toggle checked={prefs.simpleMode} onChange={(v) => update({ simpleMode: v })} label="সহজ মোড" hint="বড় লেখা, কম সাজসজ্জা" />
              <Toggle checked={prefs.liveWeather} onChange={(v) => update({ liveWeather: v })} label="লাইভ আবহাওয়া (Open-Meteo)" hint="জেলার আনুমানিক অবস্থান ওই সেবায় পাঠানো হবে" />
              <Toggle checked={prefs.saveChat} onChange={(v) => update({ saveChat: v })} label="কৃষকবন্ধুর কথোপকথন সংরক্ষণ" />
              <div className="flex items-center justify-between gap-4 p-3">
                <span className="font-semibold">হোমপেজের ৩ডি দৃশ্য</span>
                <select className="field w-40" value={prefs.hero3d} onChange={(e) => update({ hero3d: e.target.value as typeof prefs.hero3d })} aria-label="হোমপেজের ৩ডি দৃশ্য">
                  <option value="auto">স্বয়ংক্রিয়</option>
                  <option value="on">সবসময় চালু</option>
                  <option value="off">বন্ধ</option>
                </select>
              </div>
            </div>
          </Panel>

          <Panel id="crops" title="আমার ফসল" icon={<Sprout className="h-5 w-5 text-primary" aria-hidden />} action={<Link to="/crops" className="chip">+ ফসল যোগ</Link>}>
            {myCrops.length ? (
              <ul className="space-y-3">
                {myCrops.map((m) => {
                  const c = getCrop(m.cropId);
                  if (!c) return null;
                  return (
                    <li key={m.cropId} className="flex flex-wrap items-center gap-3 rounded-2xl bg-cream p-3">
                      <Link to={`/crops/${c.id}`} className="flex flex-1 items-center gap-2 font-semibold text-forest hover:underline">
                        <span className="text-2xl" aria-hidden>{c.icon}</span> {c.nameBn}
                      </Link>
                      <label className="sr-only" htmlFor={`st-${c.id}`}>{c.nameBn}-এর বর্তমান পর্যায়</label>
                      <select id={`st-${c.id}`} className="field w-auto min-w-[160px]" value={m.stageIndex} onChange={(e) => setMyCrops((l) => l.map((x) => (x.cropId === c.id ? { ...x, stageIndex: Number(e.target.value) } : x)))}>
                        {c.stages.map((s, i) => (
                          <option key={i} value={i}>
                            {s.nameBn}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => setMyCrops((l) => l.filter((x) => x.cropId !== c.id))} className="rounded-xl p-2 text-ink-soft hover:bg-red-50 hover:text-red-700" aria-label={`${c.nameBn} সরান`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <p className="w-full pl-10 text-sm text-ink-soft">এখনকার কাজ: {c.stages[m.stageIndex]?.tasksBn[0]}</p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title="এখনো কোনো ফসল যোগ করেননি">
                ফসলের পাতায় “আমার ফসলে যোগ করুন” চাপুন।{' '}
                <select className="field mt-3" aria-label="দ্রুত ফসল যোগ" value="" onChange={(e) => e.target.value && setMyCrops((l) => [...l, { cropId: e.target.value, stageIndex: 0, addedAt: new Date().toISOString() }])}>
                  <option value="">অথবা এখান থেকে বাছুন…</option>
                  {crops.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.nameBn}
                    </option>
                  ))}
                </select>
              </EmptyState>
            )}
          </Panel>

          <Panel id="tasks" title="কাজের তালিকা" icon={<ListTodo className="h-5 w-5 text-primary" aria-hidden />}>
            <form
              className="mb-4 grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_150px_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                if (!taskText.trim()) return;
                setTasks((t) => [{ id: uid(), text: taskText.trim(), due: taskDue || undefined, done: false }, ...t]);
                setTaskText('');
                setTaskDue('');
              }}
            >
              <label htmlFor="tk" className="sr-only">নতুন কাজ</label>
              <input id="tk" className="field" placeholder="যেমন: বীজতলায় পানি দেওয়া" value={taskText} onChange={(e) => setTaskText(e.target.value)} />
              <label htmlFor="tk-d" className="sr-only">তারিখ</label>
              <input id="tk-d" type="date" className="field hidden sm:block" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
              <Button type="submit" aria-label="কাজ যোগ করুন">
                <Plus className="h-5 w-5" aria-hidden />
              </Button>
            </form>
            {tasks.length ? (
              <ul className="space-y-1">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-cream">
                    <input type="checkbox" className="h-5 w-5 accent-primary" checked={t.done} onChange={() => setTasks((l) => l.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))} aria-label={t.text} />
                    <span className={cn('flex-1', t.done && 'text-ink-soft line-through')}>{t.text}</span>
                    {t.due && <span className="text-xs text-ink-soft">{formatDateBn(new Date(`${t.due}T00:00:00`))}</span>}
                    <button type="button" onClick={() => setTasks((l) => l.filter((x) => x.id !== t.id))} className="rounded-lg p-1.5 text-ink-soft hover:text-red-700" aria-label="মুছুন">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-soft">কোনো কাজ নেই। মাসভিত্তিক কাজ দেখতে <Link to="/calendar" className="font-semibold text-primary">ক্যালেন্ডার</Link> খুলুন।</p>
            )}
          </Panel>

          <Panel id="favorites" title="সংরক্ষিত নির্দেশিকা" icon={<Heart className="h-5 w-5 text-rose-600" aria-hidden />}>
            {favs.length ? (
              <ul className="space-y-1">
                {favs.map((f) => (
                  <li key={f.href} className="flex items-center justify-between gap-2 rounded-2xl p-2 hover:bg-cream">
                    <Link to={f.href} className="font-semibold text-primary-700 hover:underline">{f.title}</Link>
                    <button type="button" onClick={() => setFavs((l) => l.filter((x) => x.href !== f.href))} className="rounded-lg p-1.5 text-ink-soft hover:text-red-700" aria-label={`${f.title} সরান`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-soft">নির্দেশিকার “সংরক্ষণ” বোতাম চাপলে এখানে দেখা যাবে।</p>
            )}
          </Panel>
        </div>

        <Panel id="expenses" title="খরচের হিসাব" icon={<Receipt className="h-5 w-5 text-primary" aria-hidden />} action={<span className="text-lg font-bold text-forest">মোট: {formatTaka(total)}</span>}>
          <form
            className="mb-4 grid gap-2 sm:grid-cols-[150px_1fr_160px_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              addExpense();
            }}
          >
            <label className="sr-only" htmlFor="ex-d">তারিখ</label>
            <input id="ex-d" type="date" className="field" value={exp.date} onChange={(e) => setExp({ ...exp, date: e.target.value })} />
            <label className="sr-only" htmlFor="ex-i">খাত</label>
            <input id="ex-i" className="field" placeholder="খাত (যেমন: সার)" value={exp.item} onChange={(e) => setExp({ ...exp, item: e.target.value })} />
            <label className="sr-only" htmlFor="ex-a">টাকা</label>
            <input id="ex-a" inputMode="decimal" className="field" placeholder="৳ টাকা" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} />
            <Button type="submit">
              <Plus className="h-4 w-4" aria-hidden /> যোগ
            </Button>
          </form>
          {expErr && <p className="mb-3 text-sm text-red-700" role="alert">{expErr}</p>}
          {expenses.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left">
                <thead className="bg-cream text-sm">
                  <tr>
                    <th scope="col" className="px-3 py-2">তারিখ</th>
                    <th scope="col" className="px-3 py-2">খাত</th>
                    <th scope="col" className="px-3 py-2 text-right">টাকা</th>
                    <th scope="col" className="w-10 px-3 py-2"><span className="sr-only">মুছুন</span></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-t border-forest/5">
                      <td className="px-3 py-2 text-sm">{formatDateBn(new Date(`${e.date}T00:00:00`))}</td>
                      <td className="px-3 py-2">{e.item}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatBn(e.amount, 2)}</td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => setExpenses((l) => l.filter((x) => x.id !== e.id))} className="rounded-lg p-1.5 text-ink-soft hover:text-red-700" aria-label={`${e.item} মুছুন`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-ink-soft">এখনো কোনো খরচ লেখা হয়নি।</p>
          )}
        </Panel>

        <Panel id="diary" title="খামারের ডায়েরি" icon={<NotebookPen className="h-5 w-5 text-primary" aria-hidden />}>
          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor="dn" className="sr-only">আজকের নোট</label>
              <textarea id="dn" rows={2} className="field min-h-[72px]" placeholder="আজ খেতে কী দেখলেন বা করলেন?" value={note} onChange={(e) => setNote(e.target.value)} />
              {photo && <img src={photo.url} alt="নির্বাচিত ছবি" className="mt-2 h-24 w-24 rounded-2xl object-cover" />}
              {diaryErr && <p className="mt-1 text-sm text-red-700" role="alert">{diaryErr}</p>}
            </div>
            <div className="flex gap-2 sm:flex-col">
              <label className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-forest/15 bg-white px-4 font-semibold hover:bg-primary-50">
                <Camera className="h-5 w-5" aria-hidden /> ছবি
                <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
              </label>
              <Button onClick={addDiary}>সংরক্ষণ</Button>
            </div>
          </div>
          {diary.length ? (
            <ol className="relative space-y-4 border-l-2 border-primary/20 pl-6">
              {diary.map((d) => (
                <li key={d.id} className="relative">
                  <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white bg-primary" aria-hidden />
                  <div className="flex gap-3 rounded-2xl bg-cream p-3">
                    {d.photoId && <DiaryPhoto id={d.photoId} />}
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-primary-700">{formatDateBn(new Date(`${d.date}T00:00:00`))}</p>
                      <p className="whitespace-pre-wrap">{d.note || '—'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (d.photoId) photoStore.remove(d.photoId).catch(() => undefined);
                        setDiary((l) => l.filter((x) => x.id !== d.id));
                      }}
                      className="self-start rounded-lg p-1.5 text-ink-soft hover:text-red-700"
                      aria-label="ডায়েরির লেখা মুছুন"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-ink-soft">তারিখসহ খেতের ছবি ও নোট রাখলে পরে রোগ বা ফলনের পরিবর্তন মিলিয়ে দেখা সহজ হয়।</p>
          )}
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel id="chat" title="সংরক্ষিত কথোপকথন" icon={<MessageSquare className="h-5 w-5 text-primary" aria-hidden />}>
            <p>{prefs.saveChat ? `${toBnDigits(chat.length)}টি বার্তা সংরক্ষিত আছে।` : 'কথোপকথন সংরক্ষণ বন্ধ আছে।'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/ai-assistant" className="chip">কৃষকবন্ধু খুলুন</Link>
              {chat.length > 0 && (
                <Button variant="danger" size="sm" onClick={() => setChat([])}>
                  কথোপকথন মুছুন
                </Button>
              )}
            </div>
          </Panel>
          <Panel id="data" title="ব্যাকআপ ও রিসেট" icon={<Download className="h-5 w-5 text-primary" aria-hidden />}>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={doExport}>
                <Download className="h-4 w-4" aria-hidden /> ব্যাকআপ ডাউনলোড
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" aria-hidden /> ব্যাকআপ থেকে ফেরত আনুন
              </Button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => doImport(e.target.files?.[0])} aria-label="ব্যাকআপ ফাইল" />
              {!confirmReset ? (
                <Button variant="danger" onClick={() => setConfirmReset(true)}>
                  <RotateCcw className="h-4 w-4" aria-hidden /> সব মুছে ফেলুন
                </Button>
              ) : (
                <div className="w-full rounded-2xl bg-red-50 p-3 ring-1 ring-red-200" role="alertdialog" aria-label="নিশ্চিত করুন">
                  <p className="font-semibold text-red-800">নিশ্চিত? এই ব্রাউজারের ফসল, কাজ, খরচ, ডায়েরি, ছবি ও পছন্দ সব মুছে যাবে।</p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="danger" size="sm" onClick={doReset}>হ্যাঁ, মুছুন</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>না</Button>
                  </div>
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-ink-soft">ব্যাকআপ ফাইলে ডায়েরির ছবি থাকে না। API কী কখনো ব্যাকআপে যায় না।</p>
          </Panel>
        </div>
      </div>
    </>
  );
}
