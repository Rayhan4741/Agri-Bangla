import { useState } from 'react';
import { Check, Printer, Share2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Share a guide as WhatsApp-friendly plain text (native share sheet when available,
 * otherwise WhatsApp link / clipboard) and print it as a clean one-page sheet.
 */
export function ShareButtons({ title, text, className }: { title: string; text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const full = `*${title}*\n\n${text}\n\n— কৃষিবাংলা\n${url}`;

  const share = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title, text: full });
        return;
      } catch {
        /* user cancelled — fall through to nothing */
        return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(full)}`, '_blank', 'noopener,noreferrer');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  const btn =
    'inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-forest/10 bg-white px-3 text-sm font-semibold text-forest transition hover:border-primary/40 hover:bg-primary-50';
  return (
    <div className={cn('no-print flex flex-wrap gap-2', className)}>
      <button type="button" onClick={share} className={btn}>
        <Share2 className="h-4 w-4" aria-hidden /> শেয়ার
      </button>
      <button type="button" onClick={copy} className={btn} aria-live="polite">
        {copied ? <Check className="h-4 w-4 text-primary" aria-hidden /> : <span aria-hidden>📋</span>}
        {copied ? 'কপি হয়েছে' : 'লেখা কপি'}
      </button>
      <button type="button" onClick={() => window.print()} className={btn}>
        <Printer className="h-4 w-4" aria-hidden /> প্রিন্ট
      </button>
    </div>
  );
}
