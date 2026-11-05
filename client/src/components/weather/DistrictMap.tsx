import { useMemo, useState } from 'react';
import type { District } from '@/types';
import { DIVISIONS, districts, HAZARD_BN } from '@/lib/geo';
import { usePrefs } from '@/hooks/useStored';
import { cn } from '@/lib/cn';

type Overlay = 'division' | District['hazards'][number];

const DIV_COLORS = ['#21864A', '#2D7FB8', '#C98A1B', '#8A5A3C', '#1F7A8C', '#6B5BA8', '#B0473A', '#4F7A2A'];
const HAZ_COLOR: Record<District['hazards'][number], string> = {
  flood: '#2D7FB8',
  'flash-flood': '#1F5F99',
  salinity: '#7E57C2',
  drought: '#D08A1E',
  cyclone: '#B0473A',
  'river-erosion': '#8A5A3C',
};

const W = 400;
const H = 560;
const project = (d: District) => ({ x: ((d.lon - 88.0) / (92.75 - 88.0)) * (W - 40) + 20, y: ((26.7 - d.lat) / (26.7 - 20.55)) * (H - 40) + 20 });

/**
 * Stylised dot map: each district is a tile placed at its approximate centre.
 * It is a schematic, not a boundary map. Hazard tags are illustrative.
 */
export function DistrictMap({ onSelect }: { onSelect?: (id: string) => void }) {
  const [prefs, update] = usePrefs();
  const [overlay, setOverlay] = useState<Overlay>('division');
  const [hover, setHover] = useState<string | null>(null);

  const pts = useMemo(() => {
    const p = districts.map((d) => ({ d, ...project(d) }));
    // relax overlapping tiles
    const R = 13;
    for (let it = 0; it < 60; it++) {
      for (let i = 0; i < p.length; i++)
        for (let j = i + 1; j < p.length; j++) {
          const dx = p[j].x - p[i].x;
          const dy = p[j].y - p[i].y;
          const dist = Math.hypot(dx, dy) || 0.01;
          if (dist < R * 2.05) {
            const push = (R * 2.05 - dist) / 2;
            p[i].x -= (dx / dist) * push;
            p[i].y -= (dy / dist) * push;
            p[j].x += (dx / dist) * push;
            p[j].y += (dy / dist) * push;
          }
        }
    }
    return p;
  }, []);

  const colorFor = (d: District) => {
    if (overlay === 'division') return DIV_COLORS[DIVISIONS.indexOf(d.divisionBn) % DIV_COLORS.length];
    return d.hazards.includes(overlay) ? HAZ_COLOR[overlay] : '#D9D6C8';
  };
  const selected = districts.find((d) => d.id === (hover ?? prefs.districtId));
  const overlays: Overlay[] = ['division', 'flood', 'flash-flood', 'drought', 'salinity', 'cyclone', 'river-erosion'];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="rounded-3xl bg-gradient-to-b from-[#eef5f0] to-[#e4efe9] p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto h-auto w-full max-w-[540px]" role="group" aria-label="জেলাভিত্তিক মানচিত্র (প্রতীকী)">
          <defs>
            <filter id="tile-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#123D2B" floodOpacity="0.25" />
            </filter>
          </defs>
          <text x={W - 24} y={H - 18} textAnchor="end" className="fill-ink-soft" fontSize="11">
            বঙ্গোপসাগর ↓
          </text>
          {pts.map(({ d, x, y }) => {
            const active = d.id === prefs.districtId;
            return (
              <g
                key={d.id}
                transform={`translate(${x} ${y})`}
                role="button"
                tabIndex={0}
                aria-label={`${d.nameBn} জেলা${d.hazards.length ? `; ঝুঁকি: ${d.hazards.map((h) => HAZARD_BN[h]).join(', ')}` : ''}`}
                aria-pressed={active}
                onClick={() => {
                  update({ districtId: d.id, upazilaId: '' });
                  onSelect?.(d.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    update({ districtId: d.id, upazilaId: '' });
                    onSelect?.(d.id);
                  }
                }}
                onMouseEnter={() => setHover(d.id)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(d.id)}
                onBlur={() => setHover(null)}
                className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-harvest [&:focus-visible>rect]:stroke-[3]"
              >
                <rect x={-12} y={-12} width={24} height={24} rx={7} fill={colorFor(d)} stroke={active ? '#E9B44C' : '#fff'} strokeWidth={active ? 3 : 1.5} filter="url(#tile-shadow)" />
                <text y={4} textAnchor="middle" fontSize="9.5" fontWeight={700} fill={overlay !== 'division' && !d.hazards.includes(overlay as never) ? '#4A6357' : '#fff'} pointerEvents="none">
                  {d.nameBn.slice(0, 2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="space-y-4">
        <fieldset>
          <legend className="label">মানচিত্রে দেখান</legend>
          <div className="flex flex-wrap gap-2">
            {overlays.map((o) => (
              <button key={o} type="button" onClick={() => setOverlay(o)} aria-pressed={overlay === o} className={cn('chip', overlay === o && 'chip-active')}>
                {o !== 'division' && <span className="h-3 w-3 rounded" style={{ background: HAZ_COLOR[o] }} aria-hidden />}
                {o === 'division' ? 'বিভাগ' : HAZARD_BN[o]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="card p-4" aria-live="polite">
          {selected ? (
            <>
              <p className="text-xs text-ink-soft">{selected.divisionBn} বিভাগ</p>
              <p className="text-xl font-bold">{selected.nameBn}</p>
              <p className="mt-2 text-sm font-semibold">সাধারণ প্রাকৃতিক ঝুঁকি:</p>
              {selected.hazards.length ? (
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {selected.hazards.map((h) => (
                    <li key={h} className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ background: HAZ_COLOR[h] }}>
                      {HAZARD_BN[h]}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-soft">এই নমুনা তালিকায় বিশেষ কোনো ঝুঁকি চিহ্নিত নেই।</p>
              )}
            </>
          ) : (
            <p className="text-ink-soft">মানচিত্রে একটি জেলায় ট্যাপ করুন।</p>
          )}
        </div>
        <p className="text-xs text-ink-soft">এটি প্রতীকী মানচিত্র—প্রতিটি টাইল জেলার আনুমানিক কেন্দ্রে বসানো, সীমানা নয়। ঝুঁকির শ্রেণিবিভাগ শিক্ষামূলক নমুনা; সরকারি ঝুঁকি মানচিত্র নয়।</p>
      </div>
    </div>
  );
}
