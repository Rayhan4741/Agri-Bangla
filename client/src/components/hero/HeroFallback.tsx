import { useMemo } from 'react';
import { mulberry32 } from './scene/presets';

/**
 * Static, lightweight illustrated paddy landscape used on mobile, with reduced motion,
 * on slow connections, or when WebGL is unavailable. Pure SVG (~no network cost).
 */
export function HeroFallback({ animate = true }: { animate?: boolean }) {
  const { blades, trees, palms, rows } = useMemo(() => {
    const rnd = mulberry32(42);
    const blades = Array.from({ length: 260 }, () => {
      const x = rnd() * 1640 - 20;
      const h = 70 + rnd() * 150;
      const lean = (rnd() - 0.4) * 60;
      const y = 900 + rnd() * 20;
      const shade = Math.floor(rnd() * 3);
      return { d: `M${x} ${y} Q${x + lean * 0.3} ${y - h * 0.6} ${x + lean} ${y - h}`, w: 3 + rnd() * 3, shade, delay: rnd() * 4 };
    });
    const trees = Array.from({ length: 46 }, (_, i) => ({
      x: i * 36 + rnd() * 20 - 20,
      r: 22 + rnd() * 26,
      y: 452 + rnd() * 8,
    }));
    const palms = Array.from({ length: 16 }, () => ({ x: rnd() * 1600, h: 70 + rnd() * 45, lean: (rnd() - 0.5) * 12 }));
    const rows = Array.from({ length: 34 }, (_, i) => i);
    return { blades, trees, palms, rows };
  }, []);

  const vpX = 820;
  const vpY = 470;

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label="সূর্যোদয়ের সময় সবুজ ধানক্ষেত, দূরে গাছের সারি ও আইলের পথ"
    >
      <defs>
        <linearGradient id="fb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a6aa3" />
          <stop offset="0.45" stopColor="#8fb0c8" />
          <stop offset="0.8" stopColor="#f2c38e" />
          <stop offset="1" stopColor="#f7d7a8" />
        </linearGradient>
        <radialGradient id="fb-sun" cx="0.33" cy="0.5" r="0.35">
          <stop offset="0" stopColor="#fff6dc" stopOpacity="1" />
          <stop offset="0.08" stopColor="#ffe0a3" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#ffc884" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffc884" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fb-field-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7b9a52" />
          <stop offset="1" stopColor="#4d7a2c" />
        </linearGradient>
        <linearGradient id="fb-field-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4e8a30" />
          <stop offset="1" stopColor="#1f4d1b" />
        </linearGradient>
        <linearGradient id="fb-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6d3a0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#7d93a4" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="fb-path" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b79b77" />
          <stop offset="1" stopColor="#7a5b3c" />
        </linearGradient>
        <linearGradient id="fb-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6dcb6" stopOpacity="0" />
          <stop offset="0.5" stopColor="#f6dcb6" stopOpacity="0.75" />
          <stop offset="1" stopColor="#f6dcb6" stopOpacity="0" />
        </linearGradient>
        <filter id="fb-blur" x="-10%" y="-50%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <rect width="1600" height="900" fill="url(#fb-sky)" />
      <rect width="1600" height="900" fill="url(#fb-sun)" />
      {/* clouds */}
      <g opacity="0.55" fill="#fff1de" filter="url(#fb-blur)">
        <ellipse cx="1150" cy="170" rx="220" ry="28" />
        <ellipse cx="1260" cy="150" rx="140" ry="22" />
        <ellipse cx="300" cy="120" rx="180" ry="20" />
        <ellipse cx="820" cy="250" rx="260" ry="16" />
      </g>
      <circle cx="530" cy="430" r="26" fill="#fff4d6" />

      {/* distant tree line */}
      <g fill="#3f5a3a" opacity="0.85">
        {trees.map((t, i) => (
          <circle key={i} cx={t.x} cy={t.y} r={t.r} />
        ))}
        <rect x="0" y="455" width="1600" height="30" />
      </g>
      <g stroke="#3a5236" fill="#3a5236" opacity="0.9">
        {palms.map((p, i) => (
          <g key={i}>
            <path d={`M${p.x} 470 Q${p.x + p.lean * 0.5} ${470 - p.h * 0.6} ${p.x + p.lean} ${470 - p.h}`} strokeWidth="3" fill="none" />
            {[-60, -25, 10, 45, 80, 120, 160].map((a) => (
              <path
                key={a}
                d={`M${p.x + p.lean} ${470 - p.h} q${Math.cos((a * Math.PI) / 180) * 18} ${-8} ${Math.cos((a * Math.PI) / 180) * 30} ${8 + Math.abs(Math.sin((a * Math.PI) / 180)) * 6}`}
                strokeWidth="4"
                fill="none"
              />
            ))}
          </g>
        ))}
      </g>
      <rect x="0" y="420" width="1600" height="90" fill="url(#fb-mist)" />

      {/* far field with water glints */}
      <rect x="0" y="480" width="1600" height="420" fill="url(#fb-field-far)" />
      <path d="M0 500 L1600 500 L1600 520 L0 530 Z" fill="url(#fb-water)" opacity="0.55" />
      <path d="M380 512 L700 512 L640 520 L360 522 Z" fill="#fff0cf" opacity="0.7" />

      {/* converging rows */}
      <g stroke="#2d5d22" strokeOpacity="0.35" strokeWidth="1.6">
        {rows.map((i) => {
          const x = -1400 + i * 130;
          return <line key={i} x1={vpX + (x - vpX) * 0.02} y1={vpY + 25} x2={x} y2={900} />;
        })}
      </g>
      {/* bunds */}
      <g stroke="#9b8a5a" strokeOpacity="0.8">
        <path d="M0 560 L1600 552" strokeWidth="5" />
        <path d="M0 640 L1600 628" strokeWidth="8" />
        <path d="M0 760 L1600 742" strokeWidth="12" />
      </g>
      <rect x="0" y="600" width="1600" height="300" fill="url(#fb-field-near)" opacity="0.7" />

      {/* earthen path */}
      <path d="M760 505 C790 560 700 640 620 720 C560 790 520 850 470 900 L760 900 C760 830 800 760 830 700 C870 630 820 560 790 505 Z" fill="url(#fb-path)" />

      {/* farmer with মাথাল hat */}
      <g transform="translate(1010 585)">
        <ellipse cx="0" cy="0" rx="20" ry="5" fill="#1f2d1a" opacity="0.4" />
        <path d="M-6 0 L-4 -26 L6 -26 L8 0" fill="#7a4d32" />
        <path d="M-12 -26 L12 -26 L8 -40 L-8 -40 Z" fill="#2f5a8a" />
        <path d="M-8 -40 C-4 -60 16 -64 24 -52 L18 -40 Z" fill="#ece5d3" />
        <circle cx="25" cy="-50" r="6" fill="#7a4d32" />
        <ellipse cx="26" cy="-54" rx="16" ry="4" fill="#cda65f" />
        <path d="M22 -46 L30 -20" stroke="#7a4d32" strokeWidth="4" />
      </g>
      {/* egrets */}
      <g fill="#fbfaf5">
        <path d="M340 640 c10 -8 26 -6 30 2 c-8 6 -22 6 -30 -2 z M366 636 q4 -14 -2 -22 q6 -2 8 4" />
        <path d="M1230 610 c8 -6 20 -5 24 2 c-6 5 -18 5 -24 -2 z M1250 606 q3 -10 -1 -16 q5 -2 6 3" />
      </g>

      {/* foreground rice */}
      <g className={animate ? 'origin-bottom' : undefined}>
        {blades.map((b, i) => (
          <path
            key={i}
            d={b.d}
            stroke={['#2f6b25', '#4f9a35', '#7cc35a'][b.shade]}
            strokeWidth={b.w}
            strokeLinecap="round"
            fill="none"
            style={
              animate
                ? { animation: `sway ${4 + (i % 5)}s ease-in-out ${b.delay}s infinite`, transformOrigin: 'bottom', transformBox: 'fill-box' }
                : undefined
            }
          />
        ))}
      </g>
    </svg>
  );
}
