import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CloudUpload, Loader2, LogOut, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { Button, Card, Notice } from '@/components/common/ui';
import { useServer } from '@/context/ServerContext';
import { api, ApiError } from '@/lib/api';
import { STORE_KEYS, useStored } from '@/hooks/useStored';
import { formatBn } from '@/lib/formatting';

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
interface Diary {
  id: string;
  date: string;
  note: string;
  photoId?: string;
}
interface ServerEntry {
  _id: string;
  date: string;
  kind: 'task' | 'expense' | 'note' | 'income';
  text: string;
  amount: number | null;
  done: boolean;
  clientId: string | null;
}
const today = () => new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);

/** Login status + two-way sync of tasks, expenses and diary notes with the user's account. */
export function AccountCard() {
  const server = useServer();
  const [tasks, setTasks] = useStored<Task[]>(STORE_KEYS.tasks, []);
  const [expenses, setExpenses] = useStored<Expense[]>(STORE_KEYS.expenses, []);
  const [diary, setDiary] = useStored<Diary[]>(STORE_KEYS.diary, []);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'info' | 'danger'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (server.status !== 'online') return null;

  if (!server.user) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-start gap-3">
          <UserRound className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-bold">অ্যাকাউন্ট খুলে সব ডিভাইসে আপনার খাতা রাখুন (ঐচ্ছিক)</p>
            <p className="text-sm text-ink-soft">লগইন করলে কাজ, খরচ ও ডায়েরির লেখা সার্ভারে ব্যাকআপ হবে।</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/login?next=/profile" className="inline-flex min-h-[44px] items-center rounded-xl bg-primary px-4 font-semibold text-white hover:bg-primary-700">
            লগইন
          </Link>
          <Link to="/login?mode=register&next=/profile" className="inline-flex min-h-[44px] items-center rounded-xl bg-cream px-4 font-semibold text-forest ring-1 ring-forest/10 hover:bg-primary-50">
            নতুন অ্যাকাউন্ট
          </Link>
        </div>
      </Card>
    );
  }

  const sync = async () => {
    setBusy('sync');
    setMsg(null);
    try {
      const { items } = await api<{ items: ServerEntry[] }>('/diary');
      const onServer = new Set(items.map((i) => i.clientId).filter(Boolean));
      const local = [
        ...tasks.map((t) => ({ clientId: `t:${t.id}`, date: t.due || today(), kind: 'task' as const, text: t.text, done: t.done })),
        ...expenses.map((e) => ({ clientId: `e:${e.id}`, date: e.date, kind: 'expense' as const, text: e.item, amount: e.amount })),
        ...diary.filter((d) => d.note.trim()).map((d) => ({ clientId: `d:${d.id}`, date: d.date, kind: 'note' as const, text: d.note.slice(0, 500) })),
      ];
      let up = 0;
      for (const l of local) {
        if (onServer.has(l.clientId) && l.kind !== 'task') continue;
        await api('/diary', { method: 'POST', json: l });
        if (!onServer.has(l.clientId)) up++;
      }
      const localIds = new Set(local.map((l) => l.clientId));
      const fresh = items.filter((i) => !i.clientId || !localIds.has(i.clientId));
      const idOf = (i: ServerEntry) => (i.clientId ? i.clientId.slice(2) : i._id);
      const newTasks = fresh.filter((i) => i.kind === 'task').map((i) => ({ id: idOf(i), text: i.text, due: i.date, done: i.done }));
      const newExp = fresh.filter((i) => i.kind === 'expense').map((i) => ({ id: idOf(i), date: i.date, item: i.text, amount: i.amount ?? 0 }));
      const newDiary = fresh.filter((i) => i.kind === 'note').map((i) => ({ id: idOf(i), date: i.date, note: i.text }));
      if (newTasks.length) setTasks((t) => [...t, ...newTasks]);
      if (newExp.length) setExpenses((e) => [...e, ...newExp]);
      if (newDiary.length) setDiary((d) => [...d, ...newDiary]);
      const down = newTasks.length + newExp.length + newDiary.length;
      setMsg({ tone: 'info', text: `সিঙ্ক হয়েছে: ${formatBn(up, 0)}টি সার্ভারে পাঠানো হলো, ${formatBn(down, 0)}টি সার্ভার থেকে আনা হলো। (ছবি শুধু এই ডিভাইসে থাকে; এখানে মোছা জিনিস সার্ভার থেকে মোছে না।)` });
    } catch (e) {
      setMsg({ tone: 'danger', text: e instanceof ApiError ? e.message : 'সিঙ্ক করা যায়নি।' });
    } finally {
      setBusy(null);
    }
  };

  const deleteAccount = async () => {
    setBusy('delete');
    try {
      await api('/auth/me', { method: 'DELETE' });
      await server.logout();
    } catch (e) {
      setMsg({ tone: 'danger', text: e instanceof ApiError ? e.message : 'মুছে ফেলা যায়নি।' });
    } finally {
      setBusy(null);
      setConfirmDelete(false);
    }
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-xl font-bold text-primary-700">{server.user.name.slice(0, 1)}</span>
          <div>
            <p className="font-bold">{server.user.name}</p>
            <p className="text-sm text-ink-soft">
              {server.user.email}
              {server.user.role === 'admin' && ' · অ্যাডমিন'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={sync} disabled={!!busy}>
            {busy === 'sync' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" aria-hidden />} খাতা সিঙ্ক করুন
          </Button>
          {server.user.role === 'admin' && (
            <Link to="/admin" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-forest px-4 font-semibold text-white">
              <ShieldCheck className="h-4 w-4" aria-hidden /> অ্যাডমিন
            </Link>
          )}
          <Button variant="ghost" onClick={() => server.logout()}>
            <LogOut className="h-4 w-4" aria-hidden /> লগআউট
          </Button>
        </div>
      </div>
      {msg && <Notice tone={msg.tone === 'danger' ? 'danger' : 'info'}>{msg.text}</Notice>}
      <div className="text-sm">
        {!confirmDelete ? (
          <button type="button" className="text-red-700 underline-offset-2 hover:underline" onClick={() => setConfirmDelete(true)}>
            অ্যাকাউন্ট মুছে ফেলুন
          </button>
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            অ্যাকাউন্ট ও সার্ভারের সব খাতা মুছে যাবে (এই ডিভাইসের তথ্য থাকবে)। নিশ্চিত?
            <Button variant="danger" size="sm" onClick={deleteAccount} disabled={!!busy}>
              <Trash2 className="h-4 w-4" aria-hidden /> হ্যাঁ, মুছুন
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              না
            </Button>
          </span>
        )}
      </div>
    </Card>
  );
}
