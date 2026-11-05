import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Crop } from '@/types';
import { SEASON_BN } from '@/lib/data';
import { usePrefs } from '@/hooks/useStored';

const BG: Record<string, string> = {
  cereals: 'from-[#f4ead0] to-[#e7f2dc]',
  fibre: 'from-[#efe7d7] to-[#e4efe0]',
  tubers: 'from-[#f1e6d6] to-[#f3efe2]',
  vegetables: 'from-[#e5f3e0] to-[#f4f1e4]',
  spices: 'from-[#f6e8e0] to-[#f4efe2]',
  pulses: 'from-[#f3ead9] to-[#ebf1df]',
  oilseeds: 'from-[#fbf0c9] to-[#eef4dd]',
  fruits: 'from-[#fdebd2] to-[#eaf3df]',
  others: 'from-[#f6e6ee] to-[#eef3e6]',
};

export function CropCard({ crop }: { crop: Crop }) {
  const [prefs] = usePrefs();
  return (
    <Link to={`/crops/${crop.id}`} className="card card-hover group relative flex h-full flex-col overflow-hidden">
      <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${BG[crop.category] ?? BG.others}`}>
        <span className="text-6xl drop-shadow-sm transition duration-500 group-hover:scale-110" aria-hidden>
          {crop.icon}
        </span>
        <ArrowUpRight className="absolute right-3 top-3 h-5 w-5 text-forest/40 transition group-hover:text-primary" aria-hidden />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-bold">{crop.nameBn}</h3>
        <p className={prefs.language === 'en' ? 'font-en text-sm font-semibold text-primary' : 'font-en text-xs text-ink-soft'}>{crop.nameEn}</p>
        <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{crop.descriptionBn}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {crop.seasons.map((s) => (
            <span key={s} className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-semibold text-forest">
              {SEASON_BN[s]}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
