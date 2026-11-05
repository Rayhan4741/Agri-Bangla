import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, LogIn, ServerOff, UserPlus } from 'lucide-react';
import { Button, Card, Notice, PageHeader } from '@/components/common/ui';
import { useServer } from '@/context/ServerContext';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';

export default function LoginPage() {
  const server = useServer();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>(params.get('mode') === 'register' ? 'register' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = params.get('next') || '/profile';

  if (server.user) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'register' && password.length < 8) return setError('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের দিন।');
    setBusy(true);
    try {
      if (mode === 'login') await server.login(email, password);
      else await server.register(name, email, password);
      nav(next, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'কিছু একটা ভুল হয়েছে, আবার চেষ্টা করুন।');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="অ্যাকাউন্ট" title={mode === 'login' ? 'লগইন করুন' : 'নতুন অ্যাকাউন্ট খুলুন'} description="অ্যাকাউন্ট ঐচ্ছিক — খুললে আপনার জেলা, ফসল ও খামারের খাতা যেকোনো ডিভাইস থেকে দেখতে পারবেন।" />
      <div className="container-page mt-8 max-w-lg pb-16">
        {server.status === 'offline' ? (
          <Card className="flex items-start gap-3 p-6">
            <ServerOff className="mt-0.5 h-6 w-6 shrink-0 text-ink-soft" aria-hidden />
            <p>সার্ভারে সংযোগ নেই, তাই এখন লগইন করা যাবে না। অ্যাকাউন্ট ছাড়াই সাইটের সব তথ্য ব্যবহার করতে পারবেন।</p>
          </Card>
        ) : (
          <Card className="p-6 sm:p-8">
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-cream p-1" role="tablist">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => {
                    setMode(m);
                    setError(null);
                  }}
                  className={cn('min-h-[44px] rounded-xl font-semibold transition', mode === m ? 'bg-white text-forest shadow-soft' : 'text-ink-soft')}
                >
                  {m === 'login' ? 'লগইন' : 'নতুন অ্যাকাউন্ট'}
                </button>
              ))}
            </div>
            <form onSubmit={submit} className="space-y-4" noValidate>
              {mode === 'register' && (
                <div>
                  <label htmlFor="lg-name" className="label">আপনার নাম</label>
                  <input id="lg-name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={2} maxLength={80} />
                </div>
              )}
              <div>
                <label htmlFor="lg-email" className="label">ইমেইল</label>
                <input id="lg-email" type="email" inputMode="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </div>
              <div>
                <label htmlFor="lg-pass" className="label">পাসওয়ার্ড</label>
                <input
                  id="lg-pass"
                  type="password"
                  className="field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={mode === 'register' ? 8 : 1}
                />
                {mode === 'register' && <p className="mt-1 text-xs text-ink-soft">কমপক্ষে ৮ অক্ষর। অন্য কোথাও ব্যবহার করা পাসওয়ার্ড দেবেন না।</p>}
              </div>
              {error && (
                <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 ring-1 ring-red-200" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={busy || server.status !== 'online'}>
                {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : mode === 'login' ? <LogIn className="h-5 w-5" aria-hidden /> : <UserPlus className="h-5 w-5" aria-hidden />}
                {mode === 'login' ? 'লগইন' : 'অ্যাকাউন্ট খুলুন'}
              </Button>
            </form>
            <Notice tone="info" className="mt-6">
              আমরা শুধু নাম, ইমেইল, আপনার জেলা/ফসলের পছন্দ ও খামারের খাতার লেখা সংরক্ষণ করি। পাসওয়ার্ড এনক্রিপ্ট করে রাখা হয়। প্রোফাইল পাতা থেকে যেকোনো সময় অ্যাকাউন্ট মুছে ফেলতে পারবেন।
            </Notice>
            <p className="mt-4 text-center text-sm">
              <Link to="/" className="font-semibold text-primary-700 hover:underline">
                অ্যাকাউন্ট ছাড়াই চালিয়ে যান →
              </Link>
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
