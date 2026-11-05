import { ExternalLink, ShieldCheck } from 'lucide-react';
import { resourcesFor } from '@/lib/data';
import { cn } from '@/lib/cn';

/** "যাচাই করুন" — lists the official organisations where a farmer can confirm advice. */
export function VerifyWith({ ids, className, compact = false }: { ids: string[]; className?: string; compact?: boolean }) {
  const list = resourcesFor(ids);
  if (!list.length) return null;
  return (
    <div className={cn('rounded-2xl bg-primary-50/60 p-4 ring-1 ring-primary/10', className)}>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-forest">
        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> প্রয়োগের আগে যাচাই করুন
      </p>
      <ul className={cn('flex flex-wrap gap-2', compact && 'text-sm')}>
        {list.map((r) => (
          <li key={r.id}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-medium text-primary-700 ring-1 ring-primary/15 hover:bg-primary-50"
            >
              {r.nameBn}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">(নতুন ট্যাবে খুলবে)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
