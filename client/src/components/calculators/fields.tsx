import { useId, type ReactNode } from 'react';
import { calculatorsData } from '@/lib/data';
import { parseNumber } from '@/lib/formatting';
import type { LandUnit } from '@/types';
import { STORE_KEYS, useStored } from '@/hooks/useStored';

export function NumField({ label, value, onChange, suffix, hint, placeholder }: { label: string; value: string; onChange: (v: string) => void; suffix?: string; hint?: string; placeholder?: string }) {
  const id = useId();
  const n = parseNumber(value);
  const err = value.trim() === '' ? null : !Number.isFinite(n) ? 'সংখ্যা লিখুন' : n < 0 ? 'ঋণাত্মক হতে পারে না' : null;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <input id={id} inputMode="decimal" className="field pr-24" value={value} placeholder={placeholder ?? '০'} onChange={(e) => onChange(e.target.value)} aria-invalid={!!err} aria-describedby={hint ? `${id}-h` : undefined} />
        {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-soft">{suffix}</span>}
      </div>
      {err ? <p className="mt-1 text-sm text-red-700" role="alert">{err}</p> : hint && <p id={`${id}-h`} className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </div>
  );
}

/** Land units with the user's local bigha/katha sizes applied (saved in LocalStorage). */
export function useLandUnits() {
  const [custom, setCustom] = useStored<{ bighaDecimal: number; kathaDecimal: number }>('landUnitSizes', { bighaDecimal: 0, kathaDecimal: 0 });
  const dec = calculatorsData.landUnits.find((u) => u.id === 'decimal')!.sqm;
  const units: LandUnit[] = calculatorsData.landUnits.map((u) => {
    if (u.id === 'bigha' && custom.bighaDecimal > 0) return { ...u, sqm: custom.bighaDecimal * dec };
    if (u.id === 'katha' && custom.kathaDecimal > 0) return { ...u, sqm: custom.kathaDecimal * dec };
    return u;
  });
  return { units, custom, setCustom, decimalSqm: dec, get: (id: string) => units.find((u) => u.id === id)! };
}

export function UnitOptions({ units, only }: { units: LandUnit[]; only?: string[] }) {
  return (
    <>
      {units
        .filter((u) => !only || only.includes(u.id))
        .map((u) => (
          <option key={u.id} value={u.id}>
            {u.nameBn}
          </option>
        ))}
    </>
  );
}

export function ResultBox({ children, error }: { children?: ReactNode; error?: string | null }) {
  if (error) return <p className="rounded-2xl bg-red-50 p-4 text-red-800 ring-1 ring-red-200" role="alert">{error}</p>;
  if (!children) return <p className="rounded-2xl bg-cream p-4 text-ink-soft">তথ্য দিলে এখানে ফল দেখাবে।</p>;
  return (
    <div className="rounded-3xl bg-gradient-to-br from-primary-50 to-white p-5 ring-1 ring-primary/15" aria-live="polite">
      {children}
    </div>
  );
}

export { STORE_KEYS };
