import { Square, Volume2 } from 'lucide-react';
import { useReadAloud } from '@/hooks/useSpeech';
import { cn } from '@/lib/cn';

/** "শুনুন" — reads the given Bangla text aloud. Renders nothing when the device has no Bangla voice. */
export function SpeakButton({ text, className, compact = false }: { text: string; className?: string; compact?: boolean }) {
  const { available, speaking, speak, stop } = useReadAloud();
  if (!available) return null;
  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : speak(text))}
      className={cn(
        'no-print inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-forest/10 bg-white px-3 text-sm font-semibold text-forest transition hover:border-primary/40 hover:bg-primary-50',
        speaking && 'border-primary bg-primary-50',
        className,
      )}
      aria-pressed={speaking}
    >
      {speaking ? <Square className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
      {!compact && (speaking ? 'থামান' : 'শুনুন')}
      {compact && <span className="sr-only">{speaking ? 'থামান' : 'শুনুন'}</span>}
    </button>
  );
}
