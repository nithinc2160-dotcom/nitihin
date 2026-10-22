import { Card, Empty, Stat } from '../components/ui';
import { WinRateCircle } from '../components/WinRateCircle';
import { useJournal } from '../state/journal';
import { computeStats } from '../lib/stats';

export default function Analytics() {
  const { trades } = useJournal();
  const s = computeStats(trades);
  const fmt = (n: number | null, d = 2) => (n === null ? '—' : n.toFixed(d));

  return (
    <div className="space-y-6">
      <header>
        <p className="label">Performance</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight mt-1">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Calculated only from your saved, closed journal trades.</p>
      </header>

      {s.closed === 0 ? (
        <Empty title="No closed trades to analyse" body="Close trades in the journal with a realised P&L. Win rate, equity and breakdowns appear here." />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <Card title="Win rate">
              <div className="flex flex-col items-center gap-3">
                <WinRateCircle value={s.winRate} />
                <p className="text-xs text-slate-500 text-center">
                  Wins ÷ (wins + losses). {s.breakEven} break-even trade{s.breakEven === 1 ? '' : 's'} excluded from the denominator.
                </p>
              </div>
            </Card>
            <Card title="Summary">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <Stat label="Total trades" value={s.total} />
                <Stat label="Closed" value={s.closed} />
                <Stat label="Winning" value={s.wins} tone="bull" />
                <Stat label="Losing" value={s.losses} tone="bear" />
                <Stat label="Break-even" value={s.breakEven} />
                <Stat label="Net P&L" value={s.netPnl.toFixed(2)} tone={s.netPnl >= 0 ? 'bull' : 'bear'} />
                <Stat label="Avg win" value={fmt(s.avgWin)} tone="bull" />
                <Stat label="Avg loss" value={fmt(s.avgLoss)} tone="bear" />
                <Stat label="Profit factor" value={fmt(s.profitFactor)} />
                <Stat label="Max drawdown" value={s.maxDrawdown.toFixed(2)} tone="bear" />
              </div>
            </Card>
          </div>

          <Card title="Equity curve (closed trades)">
            <EquityCurve points={s.curve.map((p) => p.equity)} />
          </Card>
        </>
      )}
    </div>
  );
}

function EquityCurve({ points }: { points: number[] }) {
  if (points.length < 2) return <p className="text-sm text-slate-500">Need at least two closed trades to draw the curve.</p>;
  const w = 800, h = 220, pad = 10;
  const min = Math.min(0, ...points), max = Math.max(0, ...points);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56" role="img" aria-label="Equity curve">
      <line x1={pad} x2={w - pad} y1={y(0)} y2={y(0)} stroke="rgba(148,163,184,0.2)" strokeDasharray="4 4" />
      <path d={d} fill="none" stroke="#a855ff" strokeWidth={2} />
    </svg>
  );
}
