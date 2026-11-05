import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, FlaskConical, Info, Link2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { DataStatus } from '@/types';

type Variant = 'primary' | 'gold' | 'outline' | 'ghost' | 'glass' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-soft hover:bg-primary-700 active:translate-y-px',
  gold: 'bg-harvest text-forest shadow-[0_8px_24px_-8px_rgba(233,180,76,.7)] hover:brightness-105 active:translate-y-px',
  outline: 'border border-forest/15 bg-white text-forest hover:border-primary/50 hover:bg-primary-50',
  ghost: 'text-forest hover:bg-forest/5',
  glass: 'glass text-white hover:bg-white/25',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
};
const sizes: Record<Size, string> = {
  sm: 'min-h-[40px] px-3.5 text-sm gap-1.5 rounded-xl',
  md: 'min-h-[48px] px-5 text-base gap-2 rounded-2xl',
  lg: 'min-h-[56px] px-6 text-lg gap-2.5 rounded-2xl',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cn(
    'inline-flex select-none items-center justify-center font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    sizes[size],
    extra,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...rest} />;
});

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: {
  to: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children, as: Tag = 'div' }: { className?: string; children: ReactNode; as?: 'div' | 'article' | 'section' | 'li' }) {
  return <Tag className={cn('card p-5 sm:p-6', className)}>{children}</Tag>;
}

export function Badge({ children, tone = 'green', className }: { children: ReactNode; tone?: 'green' | 'gold' | 'grey' | 'red' | 'blue'; className?: string }) {
  const tones = {
    green: 'bg-primary-50 text-primary-700 ring-primary/15',
    gold: 'bg-harvest-100 text-harvest-700 ring-harvest/30',
    grey: 'bg-forest/5 text-ink-soft ring-forest/10',
    red: 'bg-red-50 text-red-700 ring-red-200',
    blue: 'bg-sky-50 text-sky-800 ring-sky-200',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', tones[tone], className)}>{children}</span>;
}

const STATUS: Record<DataStatus, { label: string; tone: 'green' | 'gold' | 'grey' | 'blue'; icon: typeof Info; tip: string }> = {
  verified: { label: 'যাচাইকৃত', tone: 'green', icon: BadgeCheck, tip: 'নির্দিষ্ট সরকারি উৎসের সাথে মিলিয়ে দেখা হয়েছে।' },
  'link-checked': { label: 'লিংক যাচাইকৃত', tone: 'blue', icon: Link2, tip: 'ওয়েবসাইটটি সক্রিয় আছে তা যাচাই করা হয়েছে; বিস্তারিত তথ্য যাচাই হয়নি।' },
  illustrative: { label: 'নমুনা তথ্য', tone: 'gold', icon: FlaskConical, tip: 'শিক্ষামূলক নমুনা লেখা। প্রয়োগের আগে স্থানীয় কৃষি কর্মকর্তার সাথে যাচাই করুন।' },
  unverified: { label: 'অযাচাইকৃত', tone: 'grey', icon: AlertTriangle, tip: 'এখনো যাচাই করা হয়নি।' },
};

export function DataStatusBadge({ status, className }: { status: DataStatus; className?: string }) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <Badge tone={s.tone} className={className}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span title={s.tip}>{s.label}</span>
      <span className="sr-only">: {s.tip}</span>
    </Badge>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden bg-forest pb-14 pt-28 text-white sm:pt-32">
      <div aria-hidden className="decor absolute inset-0 opacity-60">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-harvest/20 blur-3xl" />
      </div>
      <svg aria-hidden className="absolute -bottom-px left-0 h-[60px] w-full text-cream" viewBox="0 0 1440 60" preserveAspectRatio="none" fill="currentColor">
        <path d="M0 60 L0 38 C240 10 480 54 720 34 C960 14 1200 50 1440 26 L1440 60 Z" />
      </svg>
      <div className="container-page relative">
        <div className="flex items-start gap-4">
          {icon && <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 sm:flex">{icon}</div>}
          <div className="max-w-3xl">
            {eyebrow && <p className="mb-2 text-sm font-semibold tracking-wide text-leaf">{eyebrow}</p>}
            <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">{title}</h1>
            {description && <div className="mt-3 text-lg text-white/80">{description}</div>}
          </div>
        </div>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </header>
  );
}

export function SectionTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <span className="eyebrow mb-3">{eyebrow}</span>}
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Notice({ tone = 'info', title, children, className }: { tone?: 'info' | 'warn' | 'sample' | 'danger'; title?: string; children: ReactNode; className?: string }) {
  const tones = {
    info: 'bg-sky-50 text-sky-900 ring-sky-200',
    warn: 'bg-amber-50 text-amber-900 ring-amber-200',
    sample: 'bg-harvest-100 text-harvest-700 ring-harvest/30',
    danger: 'bg-red-50 text-red-900 ring-red-200',
  };
  const Icon = tone === 'sample' ? FlaskConical : tone === 'info' ? Info : AlertTriangle;
  return (
    <div role={tone === 'danger' ? 'alert' : 'note'} className={cn('flex gap-3 rounded-2xl p-4 ring-1', tones[tone], className)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="text-sm leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-forest/10 bg-white/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-primary">{icon}</div>}
      <p className="text-lg font-semibold text-forest">{title}</p>
      {children && <div className="mt-2 max-w-md text-ink-soft">{children}</div>}
    </div>
  );
}

export function Spinner({ label = 'লোড হচ্ছে…' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink-soft" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
      {label}
    </span>
  );
}

export function Field({ label, htmlFor, hint, children, error }: { label: string; htmlFor: string; hint?: string; children: ReactNode; error?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      {error && (
        <p className="mt-1 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
