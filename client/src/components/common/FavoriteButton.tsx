import { Heart } from 'lucide-react';
import { STORE_KEYS, useStored } from '@/hooks/useStored';
import { cn } from '@/lib/cn';

export interface Favorite {
  href: string;
  title: string;
}

export function useFavorites() {
  return useStored<Favorite[]>(STORE_KEYS.favorites, []);
}

/** Saves a guide to "আমার খামার" favorites (LocalStorage). */
export function FavoriteButton({ id, title, className }: { id: string; title: string; className?: string }) {
  const [favs, setFavs] = useFavorites();
  const on = favs.some((f) => f.href === id);
  return (
    <button
      type="button"
      onClick={() => setFavs((list) => (on ? list.filter((f) => f.href !== id) : [...list, { href: id, title }]))}
      aria-pressed={on}
      className={cn(
        'no-print inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition',
        on ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-forest/10 bg-white text-forest hover:border-rose-200 hover:bg-rose-50',
        className,
      )}
    >
      <Heart className={cn('h-4 w-4', on && 'fill-current')} aria-hidden />
      {on ? 'সংরক্ষিত' : 'সংরক্ষণ'}
    </button>
  );
}
