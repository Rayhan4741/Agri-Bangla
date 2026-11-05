import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, CheckCircle2, FileText, Loader2, Save, Send, ShieldCheck, Trash2, Upload, Users } from 'lucide-react';
import { Badge, Button, Card, Notice, PageHeader, Spinner } from '@/components/common/ui';
import { useServer } from '@/context/ServerContext';
import { api, ApiError } from '@/lib/api';
import { formatBn } from '@/lib/formatting';
import { cn } from '@/lib/cn';

type Tab = 'dash' | 'tcb' | 'content' | 'users';
const errMsg = (e: unknown) => (e instanceof ApiError ? e.message + (e.details ? ` ${JSON.stringify(e.details)}` : '') : 'সমস্যা হয়েছে।');

// ── Dashboard ────────────────────────────────────────────────────────────────
interface Stats {
  users: number;
  admins: number;
  content: number;
  contentByStatus: Record<string, number>;
  dailyPrices: number;
  lastPriceDate: string | null;
  draftUploads: number;
  usage: { day: string; kind: string; count: number }[];
  ai: { configured: boolean; model: string | null };
  tcbAutofetch: boolean;
}
function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<Stats>('/admin/stats').then(setS).catch((e) => setErr(errMsg(e)));
  }, []);
  if (err) return <Notice tone="danger">{err}</Notice>;
  if (!s) return <Spinner />;
  const sum = (k: string) => s.usage.filter((u) => u.kind === k).reduce((a, u) => a + u.count, 0);
  const tiles = [
    { label: 'ব্যবহারকারী', value: formatBn(s.users, 0), note: `অ্যাডমিন ${formatBn(s.admins, 0)} জন` },
    { label: 'কনটেন্ট রেকর্ড', value: formatBn(s.content, 0), note: `যাচাইকৃত ${formatBn(s.contentByStatus.verified ?? 0, 0)} · নমুনা ${formatBn(s.contentByStatus.illustrative ?? 0, 0)}` },
    { label: 'প্রকাশিত দৈনিক দর', value: formatBn(s.dailyPrices, 0), note: s.lastPriceDate ? `সর্বশেষ ${s.lastPriceDate}` : 'এখনও নেই' },
    { label: 'যাচাইয়ের অপেক্ষায় খসড়া', value: formatBn(s.draftUploads, 0), note: s.tcbAutofetch ? 'স্বয়ংক্রিয় সংগ্রহ চালু' : 'স্বয়ংক্রিয় সংগ্রহ বন্ধ' },
    { label: 'AI প্রশ্ন (৩০ দিন)', value: formatBn(sum('chat'), 0), note: s.ai.configured ? `মডেল: ${s.ai.model}` : 'AI কী সেট করা হয়নি' },
    { label: 'ছবি বিশ্লেষণ (৩০ দিন)', value: formatBn(sum('diagnose'), 0), note: 'ছবি সংরক্ষণ করা হয় না' },
  ];
  return (
    <div className="space-y-4">
      {!s.ai.configured && <Notice tone="warn" title="কৃষকবন্ধু AI বন্ধ">সার্ভারের .env ফাইলে GEMINI_API_KEY দিন, তারপর সার্ভার আবার চালু করুন।</Notice>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-5">
            <p className="text-sm text-ink-soft">{t.label}</p>
            <p className="mt-1 text-3xl font-bold text-forest">{t.value}</p>
            <p className="mt-1 text-xs text-ink-soft">{t.note}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── TCB uploads ──────────────────────────────────────────────────────────────
interface Range {
  min: number | null;
  max: number | null;
}
interface Row {
  line?: string;
  rawName: string;
  commodity: string | null;
  unitBn: string;
  today: Range;
  weekAgo: Range;
  monthAgo: Range;
  yearAgo: Range;
  confidence: number;
  include: boolean;
}
interface UploadDoc {
  _id: string;
  reportDate: string | null;
  fileName: string;
  format: string;
  sourceUrl: string;
  status: 'draft' | 'published' | 'discarded';
  rows: Row[];
  warnings: string[];
  createdAt: string;
  rowCount?: number;
  createdBy?: string;
}
interface Commodity {
  key: string;
  nameBn: string;
  unitBn: string;
}
const COLS: [keyof Pick<Row, 'today' | 'weekAgo' | 'monthAgo' | 'yearAgo'>, string][] = [
  ['today', 'আজ'],
  ['weekAgo', '১ সপ্তাহ আগে'],
  ['monthAgo', '১ মাস আগে'],
  ['yearAgo', '১ বছর আগে'],
];
const STATUS_BN = { draft: 'খসড়া', published: 'প্রকাশিত', discarded: 'বাতিল' };

function NumIn({ v, onChange, label }: { v: number | null; onChange: (n: number | null) => void; label: string }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step="0.01"
      aria-label={label}
      className="w-20 rounded-lg border border-forest/15 bg-white px-2 py-1.5 text-right text-sm"
      value={v ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  );
}

function ReviewEditor({ upload, commodities, onDone }: { upload: UploadDoc; commodities: Commodity[]; onDone: () => void }) {
  const [u, setU] = useState(upload);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);
  const editable = u.status === 'draft';
  const setRow = (i: number, patch: Partial<Row>) => setU((x) => ({ ...x, rows: x.rows.map((r, k) => (k === i ? { ...r, ...patch } : r)) }));
  const save = async () => {
    await api(`/admin/market/uploads/${u._id}`, { method: 'PUT', json: { reportDate: u.reportDate, sourceUrl: u.sourceUrl, rows: u.rows.map(({ line, ...r }) => ({ ...r, line: line ?? '' })) } });
  };
  const run = async (what: 'save' | 'publish' | 'discard') => {
    setBusy(what);
    setMsg(null);
    try {
      if (what !== 'discard' && editable) await save();
      if (what === 'publish') {
        const r = await api<{ daily: number; reference: number }>(`/admin/market/uploads/${u._id}/publish`, { method: 'POST' });
        setMsg({ tone: 'info', text: `প্রকাশিত: ${formatBn(r.daily, 0)}টি আজকের দর, ${formatBn(r.reference, 0)}টি পুরোনো রেফারেন্স দর।` });
        setU((x) => ({ ...x, status: 'published' }));
        onDone();
      } else if (what === 'discard') {
        await api(`/admin/market/uploads/${u._id}/discard`, { method: 'POST' });
        setU((x) => ({ ...x, status: 'discarded' }));
        onDone();
      } else setMsg({ tone: 'info', text: 'সংরক্ষণ হয়েছে।' });
    } catch (e) {
      setMsg({ tone: 'danger', text: errMsg(e) });
    } finally {
      setBusy(null);
    }
  };
  const included = u.rows.filter((r) => r.include).length;
  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">যাচাই: {u.fileName}</h3>
          <p className="text-sm text-ink-soft">
            {STATUS_BN[u.status]} · {formatBn(u.rows.length, 0)}টি সারি · নির্বাচিত {formatBn(included, 0)}টি
          </p>
        </div>
        <Badge tone={u.status === 'published' ? 'green' : u.status === 'draft' ? 'gold' : 'grey'}>{STATUS_BN[u.status]}</Badge>
      </div>
      {u.warnings.length > 0 && (
        <ul className="space-y-1 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          {u.warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {w}
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="rv-date" className="label">প্রতিবেদনের তারিখ (TCB)</label>
          <input id="rv-date" type="date" className="field" disabled={!editable} value={u.reportDate ?? ''} onChange={(e) => setU((x) => ({ ...x, reportDate: e.target.value || null }))} />
        </div>
        <div>
          <label htmlFor="rv-src" className="label">উৎসের লিংক (TCB PDF-এর URL)</label>
          <input id="rv-src" type="url" className="field" disabled={!editable} placeholder="https://tcb.gov.bd/…" value={u.sourceUrl} onChange={(e) => setU((x) => ({ ...x, sourceUrl: e.target.value }))} />
        </div>
      </div>
      <p className="text-sm text-ink-soft">হলুদ সারিগুলো অনিশ্চিত — মূল PDF-এর সাথে মিলিয়ে দেখুন। ভুল সারির টিক তুলে দিন। দাম টাকায়।</p>
      <div className="overflow-x-auto rounded-2xl ring-1 ring-forest/10">
        <table className="min-w-[980px] text-sm">
          <thead className="bg-cream text-left">
            <tr>
              <th className="p-2">নিন</th>
              <th className="p-2">PDF-এ লেখা</th>
              <th className="p-2">পণ্য</th>
              <th className="p-2">একক</th>
              {COLS.map(([, l]) => (
                <th key={l} className="p-2 text-center">
                  {l}
                  <br />
                  <span className="text-xs font-normal text-ink-soft">সর্বনিম্ন – সর্বোচ্চ</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {u.rows.map((r, i) => (
              <tr key={i} className={cn('border-t border-forest/5', r.confidence < 0.7 && 'bg-amber-50', !r.include && 'opacity-50')} title={r.line || undefined}>
                <td className="p-2">
                  <input type="checkbox" className="h-5 w-5 accent-primary" disabled={!editable} checked={r.include} onChange={(e) => setRow(i, { include: e.target.checked })} aria-label="এই সারি নিন" />
                </td>
                <td className="max-w-[180px] truncate p-2 text-ink-soft">{r.rawName}</td>
                <td className="p-2">
                  <select className="w-44 rounded-lg border border-forest/15 bg-white px-2 py-1.5" disabled={!editable} value={r.commodity ?? ''} onChange={(e) => setRow(i, { commodity: e.target.value || null, include: !!e.target.value })} aria-label="পণ্য">
                    <option value="">— বাছুন —</option>
                    {commodities.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.nameBn}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input className="w-20 rounded-lg border border-forest/15 bg-white px-2 py-1.5" disabled={!editable} value={r.unitBn} onChange={(e) => setRow(i, { unitBn: e.target.value })} aria-label="একক" />
                </td>
                {COLS.map(([k, l]) => (
                  <td key={k} className="whitespace-nowrap p-2 text-center">
                    {editable ? (
                      <>
                        <NumIn v={r[k].min} label={`${l} সর্বনিম্ন`} onChange={(n) => setRow(i, { [k]: { ...r[k], min: n } } as Partial<Row>)} />{' '}
                        <NumIn v={r[k].max} label={`${l} সর্বোচ্চ`} onChange={(n) => setRow(i, { [k]: { ...r[k], max: n } } as Partial<Row>)} />
                      </>
                    ) : (
                      `${r[k].min ?? '—'} – ${r[k].max ?? '—'}`
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {msg && <Notice tone={msg.tone === 'danger' ? 'danger' : 'info'}>{msg.text}</Notice>}
      <div className="flex flex-wrap gap-2">
        {editable && (
          <>
            <Button variant="outline" onClick={() => run('save')} disabled={!!busy}>
              {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" aria-hidden />} সংরক্ষণ
            </Button>
            <Button onClick={() => run('publish')} disabled={!!busy || !u.reportDate || !included}>
              {busy === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" aria-hidden />} যাচাই শেষ — প্রকাশ করুন
            </Button>
          </>
        )}
        {u.status !== 'discarded' && (
          <Button variant="ghost" onClick={() => run('discard')} disabled={!!busy}>
            <Trash2 className="h-4 w-4" aria-hidden /> {u.status === 'published' ? 'প্রকাশ বাতিল (দর মুছে যাবে)' : 'বাতিল'}
          </Button>
        )}
      </div>
    </Card>
  );
}

function TcbAdmin() {
  const [list, setList] = useState<UploadDoc[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [open, setOpen] = useState<UploadDoc | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => api<{ uploads: UploadDoc[] }>('/admin/market/uploads').then((r) => setList(r.uploads)).catch((e) => setErr(errMsg(e))), []);
  useEffect(() => {
    load();
    api<{ commodities: Commodity[] }>('/market/commodities').then((r) => setCommodities(r.commodities)).catch(() => undefined);
  }, [load]);

  const submit = async (manual = false) => {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      if (!manual && file) fd.append('file', file);
      if (!manual && !file && text.trim()) fd.append('text', text);
      if (reportDate) fd.append('reportDate', reportDate);
      if (sourceUrl) fd.append('sourceUrl', sourceUrl);
      const r = await api<{ upload: UploadDoc }>('/admin/market/uploads', { method: 'POST', body: fd, timeoutMs: 60000 });
      setOpen(r.upload);
      setFile(null);
      setText('');
      load();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const openUpload = async (id: string) => {
    try {
      const r = await api<{ upload: UploadDoc }>(`/admin/market/uploads/${id}`);
      setOpen(r.upload);
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  return (
    <div className="space-y-6">
      <Notice tone="info" title="প্রতিদিনের কাজ">
        ১) <a className="font-semibold underline" href="https://tcb.gov.bd/pages/daily-rmps" target="_blank" rel="noopener noreferrer">TCB-এর দৈনিক খুচরা বাজারদর পাতা</a> থেকে আজকের PDF নামান। ২) এখানে আপলোড করুন। ৩) পড়া দর মূল PDF-এর সাথে মিলিয়ে প্রকাশ করুন। TCB-এর ওয়েবসাইট স্বয়ংক্রিয় সংগ্রহের অনুমতি দেয় না (robots.txt), তাই এই হাতে-যাচাই ধাপ।
      </Notice>
      <Card className="space-y-4 p-4 sm:p-6">
        <h3 className="flex items-center gap-2 text-lg font-bold">
          <Upload className="h-5 w-5 text-primary" aria-hidden /> নতুন প্রতিবেদন
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="tcb-file" className="label">PDF বা CSV ফাইল</label>
            <input id="tcb-file" type="file" accept="application/pdf,.pdf,.csv,text/csv" className="field py-2.5" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="mt-1 text-xs text-ink-soft">CSV-এর প্রথম সারি: commodity,unit,min,max (অথবা today_min,today_max,week_min,…)</p>
          </div>
          <div>
            <label htmlFor="tcb-text" className="label">অথবা PDF থেকে কপি করা লেখা পেস্ট করুন</label>
            <textarea id="tcb-text" rows={3} className="field" value={text} onChange={(e) => setText(e.target.value)} disabled={!!file} />
          </div>
          <div>
            <label htmlFor="tcb-date" className="label">তারিখ (ফাঁকা রাখলে ফাইল থেকে পড়া হবে)</label>
            <input id="tcb-date" type="date" className="field" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="tcb-src" className="label">উৎসের লিংক (ঐচ্ছিক)</label>
            <input id="tcb-src" type="url" className="field" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://tcb.gov.bd/…" />
          </div>
        </div>
        {err && <Notice tone="danger">{err}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => submit(false)} disabled={busy || (!file && !text.trim())}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" aria-hidden />} পড়ুন ও যাচাইয়ে পাঠান
          </Button>
          <Button variant="outline" onClick={() => submit(true)} disabled={busy}>
            খালি ফর্মে হাতে লিখুন
          </Button>
        </div>
      </Card>

      {open && <ReviewEditor key={open._id} upload={open} commodities={commodities} onDone={load} />}

      <Card className="p-4 sm:p-6">
        <h3 className="mb-3 text-lg font-bold">সাম্প্রতিক আপলোড</h3>
        {!list.length ? (
          <p className="text-ink-soft">এখনও কোনো আপলোড নেই।</p>
        ) : (
          <ul className="divide-y divide-forest/5">
            {list.map((u) => (
              <li key={u._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <span className="font-semibold">{u.reportDate ?? 'তারিখ নেই'}</span> · {u.fileName} <span className="text-xs text-ink-soft">({u.format}, {formatBn(u.rowCount ?? 0, 0)} সারি)</span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={u.status === 'published' ? 'green' : u.status === 'draft' ? 'gold' : 'grey'}>{STATUS_BN[u.status]}</Badge>
                  <button type="button" className="text-sm font-semibold text-primary-700 hover:underline" onClick={() => openUpload(u._id)}>
                    খুলুন
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ── Content editor ───────────────────────────────────────────────────────────
const TYPES: [string, string][] = [
  ['crops', 'ফসল'],
  ['cropDiseases', 'রোগ ও পোকা'],
  ['agriculturalFaq', 'প্রশ্নোত্তর'],
  ['fertilizerGuides', 'সার নির্দেশিকা'],
  ['irrigationGuides', 'সেচ নির্দেশিকা'],
  ['livestock', 'গবাদিপশু'],
  ['poultry', 'হাঁস-মুরগি'],
  ['fisheries', 'মৎস্য'],
  ['governmentResources', 'সরকারি প্রতিষ্ঠান'],
  ['glossary', 'শব্দকোষ'],
  ['learningResources', 'শিক্ষা'],
  ['sampleAdvisories', 'পরামর্শ'],
  ['cropCategories', 'ফসলের ধরন'],
  ['districts', 'জেলা'],
  ['upazilas', 'উপজেলা'],
  ['weatherGuides', 'আবহাওয়া (ফাইল)'],
  ['seasonalCalendar', 'ক্যালেন্ডার (ফাইল)'],
  ['farmingCalculators', 'ক্যালকুলেটর (ফাইল)'],
  ['marketSamples', 'নমুনা বাজার (ফাইল)'],
];
const FILE_TYPES = new Set(['weatherGuides', 'seasonalCalendar', 'farmingCalculators', 'marketSamples']);
type Rec = Record<string, unknown> & { id?: string };
const titleOf = (r: Rec) => String(r.nameBn ?? r.titleBn ?? r.questionBn ?? r.termBn ?? r.id ?? '');

function ContentAdmin() {
  const server = useServer();
  const [type, setType] = useState('crops');
  const [data, setData] = useState<Rec[] | Rec | null>(null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [json, setJson] = useState('');
  const [msg, setMsg] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const isFile = FILE_TYPES.has(type);

  const load = useCallback(async () => {
    setData(null);
    const r = await api<{ data: Rec[] | Rec }>(`/content/${type}`);
    setData(r.data);
    if (FILE_TYPES.has(type)) {
      setSel('_file');
      setJson(JSON.stringify(r.data, null, 2));
    } else {
      setSel(null);
      setJson('');
    }
  }, [type]);
  useEffect(() => {
    setMsg(null);
    load().catch((e) => setMsg({ tone: 'danger', text: errMsg(e) }));
  }, [load]);

  const list = useMemo(() => (Array.isArray(data) ? data.filter((r) => !q || `${r.id} ${titleOf(r)}`.toLowerCase().includes(q.toLowerCase())) : []), [data, q]);
  const pick = (r: Rec) => {
    setSel(String(r.id));
    setJson(JSON.stringify(r, null, 2));
    setMsg(null);
  };
  const newRecord = () => {
    const tpl = Array.isArray(data) && data[0] ? Object.fromEntries(Object.entries(data[0]).map(([k, v]) => [k, Array.isArray(v) ? [] : typeof v === 'number' ? 0 : typeof v === 'string' ? '' : v === null ? null : v])) : {};
    setSel('__new');
    setJson(JSON.stringify({ ...tpl, id: '', dataStatus: 'illustrative', lastVerified: null }, null, 2));
  };
  let parsed: Rec | null = null;
  let parseErr = '';
  try {
    parsed = json ? (JSON.parse(json) as Rec) : null;
  } catch (e) {
    parseErr = (e as Error).message;
  }
  const markVerified = () => {
    if (!parsed) return;
    const today = new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);
    setJson(JSON.stringify({ ...parsed, dataStatus: 'verified', lastVerified: today }, null, 2));
  };
  const save = async () => {
    if (!parsed) return;
    setBusy(true);
    setMsg(null);
    try {
      const key = isFile ? '_file' : String(parsed.id ?? '');
      await api(`/content/${type}/${encodeURIComponent(key)}`, { method: 'PUT', json: parsed });
      setMsg({ tone: 'info', text: 'সংরক্ষণ হয়েছে — সাইটে দেখা যাবে।' });
      await load();
      if (!isFile) setSel(key);
      server.reloadContent().catch(() => undefined);
    } catch (e) {
      setMsg({ tone: 'danger', text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!sel || isFile || sel === '__new') return;
    setBusy(true);
    try {
      await api(`/content/${type}/${encodeURIComponent(sel)}`, { method: 'DELETE' });
      setMsg({ tone: 'info', text: 'মুছে ফেলা হয়েছে।' });
      setSel(null);
      setJson('');
      await load();
      server.reloadContent().catch(() => undefined);
    } catch (e) {
      setMsg({ tone: 'danger', text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="space-y-3 p-4">
        <label htmlFor="ct-type" className="label">তথ্যের ধরন</label>
        <select id="ct-type" className="field" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        {!isFile && (
          <>
            <input className="field" placeholder="খুঁজুন" value={q} onChange={(e) => setQ(e.target.value)} aria-label="রেকর্ড খুঁজুন" />
            <Button variant="outline" className="w-full" onClick={newRecord}>
              + নতুন রেকর্ড
            </Button>
            {!data ? (
              <Spinner />
            ) : (
              <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
                {list.map((r) => (
                  <li key={String(r.id)}>
                    <button type="button" onClick={() => pick(r)} className={cn('w-full rounded-xl px-3 py-2 text-left text-sm', sel === r.id ? 'bg-primary-50 font-semibold' : 'hover:bg-cream')}>
                      {titleOf(r)}
                      <span className="block text-xs text-ink-soft">
                        {String(r.id)} · {String(r.dataStatus ?? r.verificationStatus ?? '')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
      <Card className="space-y-3 p-4">
        {!sel ? (
          <p className="text-ink-soft">বাম পাশ থেকে একটি রেকর্ড বাছুন।</p>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              রেকর্ডটি JSON আকারে সম্পাদনা করুন। কোনো তথ্য সরকারি উৎসের সাথে মিলিয়ে নিলে <code>sourceIds</code>-এ উৎসের id দিন এবং “যাচাইকৃত” চিহ্ন দিন।
            </p>
            <label htmlFor="ct-json" className="sr-only">JSON</label>
            <textarea id="ct-json" spellCheck={false} className="field h-[55vh] font-mono text-xs leading-relaxed" value={json} onChange={(e) => setJson(e.target.value)} />
            {parseErr && <p className="text-sm text-red-700">JSON ভুল: {parseErr}</p>}
            {msg && <Notice tone={msg.tone === 'danger' ? 'danger' : 'info'}>{msg.text}</Notice>}
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={busy || !parsed}>
                <Save className="h-4 w-4" aria-hidden /> সংরক্ষণ
              </Button>
              {!isFile && (
                <Button variant="outline" onClick={markVerified} disabled={!parsed}>
                  <ShieldCheck className="h-4 w-4" aria-hidden /> আজ যাচাইকৃত চিহ্ন দিন
                </Button>
              )}
              {!isFile && sel !== '__new' && (
                <Button variant="ghost" onClick={remove} disabled={busy}>
                  <Trash2 className="h-4 w-4" aria-hidden /> মুছুন
                </Button>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ── Users ────────────────────────────────────────────────────────────────────
function UsersAdmin() {
  const [users, setUsers] = useState<{ _id: string; name: string; email: string; role: string; createdAt: string; lastLoginAt?: string }[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => api<{ users: NonNullable<typeof users> }>('/admin/users').then((r) => setUsers(r.users)).catch((e) => setErr(errMsg(e))), []);
  useEffect(() => {
    load();
  }, [load]);
  const setRole = async (id: string, role: string) => {
    try {
      await api(`/admin/users/${id}/role`, { method: 'PUT', json: { role } });
      load();
    } catch (e) {
      setErr(errMsg(e));
    }
  };
  if (!users) return err ? <Notice tone="danger">{err}</Notice> : <Spinner />;
  return (
    <Card className="overflow-x-auto p-0">
      {err && <Notice tone="danger">{err}</Notice>}
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-cream text-left">
          <tr>
            <th className="p-3">নাম</th>
            <th className="p-3">ইমেইল</th>
            <th className="p-3">যোগদান</th>
            <th className="p-3">ভূমিকা</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id} className="border-t border-forest/5">
              <td className="p-3 font-semibold">{u.name}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3 text-ink-soft">{u.createdAt.slice(0, 10)}</td>
              <td className="p-3">
                <select className="rounded-lg border border-forest/15 px-2 py-1" value={u.role} onChange={(e) => setRole(u._id, e.target.value)} aria-label={`${u.name}-এর ভূমিকা`}>
                  <option value="farmer">কৃষক</option>
                  <option value="admin">অ্যাডমিন</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export default function AdminPage() {
  const server = useServer();
  const [tab, setTab] = useState<Tab>('dash');
  const tabs: [Tab, string, typeof BarChart3][] = [
    ['dash', 'ড্যাশবোর্ড', BarChart3],
    ['tcb', 'বাজারদর (TCB)', Upload],
    ['content', 'কনটেন্ট', FileText],
    ['users', 'ব্যবহারকারী', Users],
  ];
  let body: JSX.Element;
  if (server.authLoading || server.status === 'checking') body = <Spinner />;
  else if (server.status === 'offline') body = <Notice tone="warn">সার্ভারে সংযোগ নেই।</Notice>;
  else if (!server.user)
    body = (
      <Notice tone="info">
        অ্যাডমিন প্যানেল দেখতে <Link className="font-semibold underline" to="/login?next=/admin">লগইন করুন</Link>।
      </Notice>
    );
  else if (server.user.role !== 'admin') body = <Notice tone="danger">এই পাতা শুধু অ্যাডমিনদের জন্য।</Notice>;
  else
    body = (
      <>
        <div className="mb-6 flex flex-wrap gap-2" role="tablist">
          {tabs.map(([id, label, Icon]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn('chip', tab === id && 'chip-active')}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
        {tab === 'dash' && <Dashboard />}
        {tab === 'tcb' && <TcbAdmin />}
        {tab === 'content' && <ContentAdmin />}
        {tab === 'users' && <UsersAdmin />}
      </>
    );
  return (
    <>
      <PageHeader eyebrow="অ্যাডমিন" title="ব্যবস্থাপনা প্যানেল" description="বাজারদর প্রকাশ, তথ্য সম্পাদনা ও যাচাই, ব্যবহারকারী।" icon={<CheckCircle2 className="h-7 w-7 text-leaf" />} />
      <div className="container-page mt-8 pb-16">{body}</div>
    </>
  );
}
