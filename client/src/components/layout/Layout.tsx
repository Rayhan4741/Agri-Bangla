import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Accessibility, CircleUserRound, Grid3x3, Menu, ShieldCheck, WifiOff, X } from 'lucide-react';
import { useServer } from '@/context/ServerContext';
import { MOBILE_TABS, NAV, PRIMARY_NAV } from '@/components/navigation/navItems';
import { usePrefs } from '@/hooks/useStored';
import { useOnline } from '@/hooks/useOnline';
import { cn } from '@/lib/cn';

function Logo({ light }: { light: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="কৃষিবাংলা — হোম">
      <svg viewBox="0 0 40 40" className="h-10 w-10" aria-hidden>
        <defs>
          <linearGradient id="lg-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#77C66E" />
            <stop offset="1" stopColor="#21864A" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="12" fill="url(#lg-a)" />
        <path d="M20 31 C20 22 20 16 20 11" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M20 21 C14 21 11 17 11 12 C16 12 20 15 20 21 Z" fill="#fff" />
        <path d="M20 17 C26 17 29 13 29 9 C24 9 20 11 20 17 Z" fill="#E9B44C" />
      </svg>
      <span className="leading-none">
        <span className={cn('block text-xl font-bold', light ? 'text-white' : 'text-forest')}>কৃষিবাংলা</span>
        <span className={cn('block font-en text-[11px] font-semibold tracking-[0.18em]', light ? 'text-white/70' : 'text-primary')}>AGRIBANGLA</span>
      </span>
    </Link>
  );
}

const KNOWN = NAV.map((n) => n.to);

function Header() {
  const server = useServer();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [prefs, update] = usePrefs();
  const loc = useLocation();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open]);

  // pages whose top is a light surface need the solid header from the start
  const lightTop = loc.pathname === '/ai-assistant' || !KNOWN.some((k) => k === loc.pathname || (k !== '/' && loc.pathname.startsWith(k + '/')));
  const light = !scrolled && !lightTop;
  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled || lightTop ? 'glass-light shadow-soft' : 'bg-transparent',
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-forest">
        মূল বিষয়ে যান
      </a>
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <Logo light={light} />
        <nav aria-label="প্রধান মেনু" className="hidden items-center gap-1 lg:flex">
          {NAV.filter((n) => PRIMARY_NAV.includes(n.to)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-xl px-3.5 py-2 text-[15px] font-semibold transition',
                  light ? 'text-white/85 hover:bg-white/10 hover:text-white' : 'text-ink hover:bg-forest/5',
                  isActive && (light ? 'bg-white/15 text-white' : 'bg-primary-50 text-primary-700'),
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <AccountButton light={light} />
          <button
            type="button"
            onClick={() => update({ simpleMode: !prefs.simpleMode })}
            aria-pressed={prefs.simpleMode}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition',
              light ? 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20' : 'bg-forest/5 text-forest hover:bg-forest/10',
              prefs.simpleMode && 'bg-harvest text-forest ring-0 hover:bg-harvest',
            )}
            title="বড় লেখা, কম শব্দ, আইকনভিত্তিক মেনু"
          >
            <Accessibility className="h-5 w-5" aria-hidden />
            <span className="hidden sm:inline">সহজ মোড</span>
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-semibold transition',
              light ? 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20' : 'bg-forest text-white hover:bg-forest-700',
            )}
            aria-expanded={open}
            aria-controls="all-menu"
          >
            <Menu className="h-5 w-5" aria-hidden />
            <span className="hidden sm:inline">সব সেবা</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="all-menu"
            role="dialog"
            aria-modal="true"
            aria-label="সব সেবা"
            className="fixed inset-0 z-50 bg-forest-900/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="absolute inset-x-0 top-0 max-h-[100dvh] overflow-y-auto rounded-b-4xl bg-cream p-4 pb-8 shadow-lift sm:p-8"
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="container-page">
                <div className="mb-6 flex items-center justify-between">
                  <Logo light={false} />
                  <button type="button" onClick={() => setOpen(false)} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-soft" aria-label="মেনু বন্ধ করুন">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {NAV.map((n) => {
                    const Icon = n.icon;
                    return (
                      <li key={n.to}>
                        <NavLink
                          to={n.to}
                          end={n.to === '/'}
                          className={({ isActive }) =>
                            cn(
                              'card card-hover flex h-full flex-col gap-3 p-4',
                              isActive && 'ring-2 ring-primary',
                            )
                          }
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${n.color}1a`, color: n.color }}>
                            <Icon className="h-6 w-6" aria-hidden />
                          </span>
                          <span>
                            <span className="block font-bold text-forest">{n.label}</span>
                            <span className="block text-sm text-ink-soft">{n.description}</span>
                          </span>
                        </NavLink>
                      </li>
                    );
                  })}
                  {server.user?.role === 'admin' && (
                    <li>
                      <NavLink to="/admin" className={({ isActive }) => cn('card card-hover flex h-full flex-col gap-3 p-4', isActive && 'ring-2 ring-primary')}>
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest/10 text-forest">
                          <ShieldCheck className="h-6 w-6" aria-hidden />
                        </span>
                        <span>
                          <span className="block font-bold text-forest">অ্যাডমিন</span>
                          <span className="block text-sm text-ink-soft">বাজারদর ও তথ্য ব্যবস্থাপনা</span>
                        </span>
                      </NavLink>
                    </li>
                  )}
                </ul>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function AccountButton({ light }: { light: boolean }) {
  const server = useServer();
  if (server.status !== 'online') return null;
  const label = server.user ? server.user.name.split(' ')[0] : 'লগইন';
  return (
    <Link
      to={server.user ? '/profile' : '/login'}
      className={cn(
        'hidden min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition sm:inline-flex',
        light ? 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20' : 'bg-forest/5 text-forest hover:bg-forest/10',
      )}
      title={server.user ? 'আমার অ্যাকাউন্ট' : 'লগইন বা নতুন অ্যাকাউন্ট'}
    >
      <CircleUserRound className="h-5 w-5" aria-hidden />
      <span className="max-w-[8rem] truncate">{label}</span>
    </Link>
  );
}

function MobileTabBar() {
  const [moreOpen, setMoreOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setMoreOpen(false), [loc.pathname]);
  return (
    <>
      <nav aria-label="নিচের মেনু" className="glass-light fixed inset-x-0 bottom-0 z-40 border-t border-forest/10 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid grid-cols-5">
          {NAV.filter((n) => MOBILE_TABS.includes(n.to)).map((n) => {
            const Icon = n.icon;
            return (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.to === '/'}
                  className={({ isActive }) =>
                    cn('flex min-h-[62px] flex-col items-center justify-center gap-0.5 text-[12px] font-semibold', isActive ? 'text-primary' : 'text-ink-soft')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn('flex h-8 w-12 items-center justify-center rounded-full transition', isActive && 'bg-primary-50')}>
                        <Icon className="h-[22px] w-[22px]" aria-hidden />
                      </span>
                      {n.short}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              className={cn('flex min-h-[62px] w-full flex-col items-center justify-center gap-0.5 text-[12px] font-semibold', moreOpen ? 'text-primary' : 'text-ink-soft')}
            >
              <span className="flex h-8 w-12 items-center justify-center rounded-full">
                <Grid3x3 className="h-[22px] w-[22px]" aria-hidden />
              </span>
              আরও
            </button>
          </li>
        </ul>
      </nav>
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="fixed inset-x-3 bottom-[76px] z-40 rounded-3xl bg-white p-3 shadow-lift ring-1 ring-forest/10 lg:hidden"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            <ul className="grid grid-cols-3 gap-2">
              {NAV.filter((n) => !MOBILE_TABS.includes(n.to)).map((n) => {
                const Icon = n.icon;
                return (
                  <li key={n.to}>
                    <NavLink to={n.to} className="flex min-h-[78px] flex-col items-center justify-center gap-1 rounded-2xl p-2 text-center text-[13px] font-semibold text-forest hover:bg-primary-50">
                      <Icon className="h-6 w-6" style={{ color: n.color }} aria-hidden />
                      {n.short}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Footer() {
  return (
    <footer className="mt-20 bg-forest pb-28 pt-14 text-white/80 lg:pb-12">
      <div className="container-page grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-md text-sm leading-relaxed">
            কৃষিবাংলা একটি শিক্ষামূলক কৃষি পরামর্শ সেবা। প্রতিটি নির্দেশিকায় লেখা থাকে সেটি <strong className="text-harvest">যাচাইকৃত</strong> নাকি <strong className="text-harvest">নমুনা তথ্য</strong> — প্রয়োগের আগে স্থানীয় উপসহকারী কৃষি কর্মকর্তা, প্রাণিসম্পদ বা মৎস্য কর্মকর্তার সাথে যাচাই করুন।
          </p>
        </div>
        <div>
          <p className="mb-3 font-semibold text-white">সেবা</p>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {NAV.slice(1, 9).map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="hover:text-white">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 font-semibold text-white">তথ্য ও গোপনীয়তা</p>
          <ul className="space-y-2 text-sm">
            <li>অ্যাকাউন্ট ঐচ্ছিক; খামারের খাতা ও ছবি নিজের ডিভাইসে থাকে, চাইলে লেখা অংশ অ্যাকাউন্টে ব্যাকআপ করুন।</li>
            <li>বাজারদরের উৎস টিসিবি; আবহাওয়া Open-Meteo; AI উত্তর ভুল হতে পারে — যাচাই করুন।</li>
            <li>
              <Link to="/resources" className="font-semibold text-leaf hover:text-white">
                সরকারি কৃষি সেবার ঠিকানা →
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-[72px] z-40 flex items-center justify-center gap-2 bg-harvest px-4 py-2 text-sm font-semibold text-forest">
      <WifiOff className="h-4 w-4" aria-hidden /> আপনি অফলাইনে আছেন — সংরক্ষিত নির্দেশিকা, হিসাব ও ক্যালেন্ডার তবুও কাজ করবে।
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [prefs] = usePrefs();
  const loc = useLocation();
  useEffect(() => {
    document.documentElement.classList.toggle('simple', prefs.simpleMode);
  }, [prefs.simpleMode]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);
  return (
    <div className="min-h-screen">
      <Header />
      <OfflineBanner />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
      <MobileTabBar />
    </div>
  );
}
