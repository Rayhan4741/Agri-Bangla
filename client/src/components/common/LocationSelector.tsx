import { useId } from 'react';
import { MapPin } from 'lucide-react';
import { districtsSorted, upazilasOf } from '@/lib/geo';
import { usePrefs } from '@/hooks/useStored';
import { cn } from '@/lib/cn';

/** District + upazila picker. Saves to the local profile so every page uses the same location. */
export function LocationSelector({ variant = 'light', className, compact = false, stacked = false }: { variant?: 'light' | 'glass'; className?: string; compact?: boolean; stacked?: boolean }) {
  const [prefs, update] = usePrefs();
  const id = useId();
  const ups = prefs.districtId ? upazilasOf(prefs.districtId) : [];
  const glass = variant === 'glass';
  const selectCls = glass
    ? 'w-full min-h-[48px] rounded-2xl border border-white/25 bg-white/15 px-4 text-base text-white backdrop-blur focus:border-white/60 focus:outline-none focus:ring-4 focus:ring-white/20 [&>option]:text-ink'
    : 'field';

  return (
    <div className={cn('grid gap-3', stacked ? 'grid-cols-1' : compact ? 'grid-cols-2' : 'sm:grid-cols-2', className)}>
      <div>
        <label htmlFor={`${id}-d`} className={cn('mb-1.5 flex items-center gap-1.5 text-sm font-semibold', glass ? 'text-white/90' : 'text-forest')}>
          <MapPin className="h-4 w-4" aria-hidden /> জেলা
        </label>
        <select
          id={`${id}-d`}
          className={selectCls}
          value={prefs.districtId}
          onChange={(e) => update({ districtId: e.target.value, upazilaId: '' })}
        >
          <option value="">জেলা নির্বাচন করুন</option>
          {districtsSorted.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nameBn} ({d.divisionBn})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-u`} className={cn('mb-1.5 block text-sm font-semibold', glass ? 'text-white/90' : 'text-forest')}>
          উপজেলা
        </label>
        {ups.length > 0 || !prefs.districtId ? (
          <select
            id={`${id}-u`}
            className={selectCls}
            value={prefs.upazilaId}
            disabled={!prefs.districtId}
            onChange={(e) => update({ upazilaId: e.target.value })}
          >
            <option value="">{prefs.districtId ? 'উপজেলা নির্বাচন করুন' : 'আগে জেলা বাছুন'}</option>
            {ups.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nameBn}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={`${id}-u`}
            className={selectCls}
            placeholder="উপজেলার নাম লিখুন"
            value={prefs.upazilaId.startsWith('custom:') ? prefs.upazilaId.slice(7) : ''}
            onChange={(e) => update({ upazilaId: e.target.value ? `custom:${e.target.value}` : '' })}
          />
        )}
        {prefs.districtId && ups.length === 0 && (
          <p className={cn('mt-1 text-xs', glass ? 'text-white/70' : 'text-ink-soft')}>এই জেলার উপজেলা তালিকা নমুনা ডাটায় নেই — নাম লিখে দিন।</p>
        )}
      </div>
    </div>
  );
}
