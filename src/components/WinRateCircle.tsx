import { motion } from 'framer-motion';

/** Animated win-rate ring. value = null renders an empty state (no fabricated percentage). */
export function WinRateCircle({ value, size = 140 }: { value: number | null; size?: number }) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const pct = value ?? 0;
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={value === null ? 'Win rate: no eligible trades' : `Win rate ${pct.toFixed(1)} percent`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(148,163,184,0.12)" strokeWidth={8} fill="none" />
        {value !== null && (
          <motion.circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="url(#zx-grad)" strokeWidth={8} strokeLinecap="round" fill="none"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - pct / 100) }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        )}
        <defs>
          <linearGradient id="zx-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a855ff" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="num text-2xl text-white">{value === null ? '—' : `${pct.toFixed(1)}%`}</div>
          <div className="label mt-0.5">Win rate</div>
        </div>
      </div>
    </div>
  );
}
