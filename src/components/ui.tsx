import type { ReactNode } from 'react';
import type { Bias, SetupState } from '../engine/types';
import type { FeedStatus } from '../data/provider';

export function Card({ title, right, children, className = '' }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`glass p-5 ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-3 mb-4">
          {title && <h2 className="label">{title}</h2>}
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function BiasPill({ bias }: { bias: Bias | 'UNAVAILABLE' }) {
  const map = {
    BULLISH: 'bg-bull/15 text-bull border-bull/30',
    BEARISH: 'bg-bear/15 text-bear border-bear/30',
    NEUTRAL: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    UNAVAILABLE: 'bg-slate-700/30 text-slate-500 border-slate-600/30',
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${map[bias]}`}>
      {bias}
    </span>
  );
}

export function StatusPill({ status }: { status: FeedStatus }) {
  const live = status === 'live' || status === 'delayed';
  const color = live ? 'text-bull bg-bull/15 border-bull/30' : status === 'stale' ? 'text-amber-300 bg-amber-400/10 border-amber-400/30' : 'text-bear bg-bear/15 border-bear/30';
  const label = {
    live: 'Live', delayed: 'Delayed feed', historical: 'Historical', stale: 'Stale',
    disconnected: 'Disconnected', unconfigured: 'Not configured',
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-bull' : status === 'stale' ? 'bg-amber-300' : 'bg-bear'}`} />
      {label}
    </span>
  );
}

export function SetupBadge({ state }: { state: SetupState }) {
  const cls =
    state === 'BUY SETUP' ? 'bg-bull/15 text-bull border-bull/40'
    : state === 'SELL SETUP' ? 'bg-bear/15 text-bear border-bear/40'
    : state === 'DATA UNAVAILABLE' ? 'bg-slate-700/30 text-slate-400 border-slate-600/40'
    : 'bg-violet-neon/10 text-violet-300 border-violet-neon/30';
  return <span className={`inline-flex rounded-md border px-3 py-1 text-sm font-semibold tracking-wide ${cls}`}>{state}</span>;
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-slate-200 font-medium">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{body}</p>
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'bull' | 'bear' | 'neutral' }) {
  const c = tone === 'bull' ? 'text-bull' : tone === 'bear' ? 'text-bear' : 'text-slate-100';
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`num text-lg mt-1 ${c}`}>{value}</div>
    </div>
  );
}

export function fmtPrice(p: number | null | undefined, decimals = 5) {
  return p === null || p === undefined || !Number.isFinite(p) ? '—' : p.toFixed(decimals);
}
