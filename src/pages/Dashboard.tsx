import { Link } from 'react-router-dom';
import { Card, BiasPill, StatusPill, SetupBadge, Empty, fmtPrice } from '../components/ui';
import { useMarketAnalysis } from '../hooks/useMarketAnalysis';
import { useJournal } from '../state/journal';
import { WinRateCircle } from '../components/WinRateCircle';
import { computeStats } from '../lib/stats';
import { useSettings } from '../state/settings';
import { INSTRUMENTS } from '../engine/instruments';

export default function Dashboard() {
  const { settings } = useSettings();
  const a = useMarketAnalysis();
  const { trades } = useJournal();
  const stats = computeStats(trades);
  const inst = INSTRUMENTS.find((i) => i.symbol === settings.instrument) ?? INSTRUMENTS[0];
  const last = a.candles[a.candles.length - 1];
  const dec = inst.pipSize < 0.01 ? 5 : inst.pipSize < 1 ? 3 : 2;

  return (
    <div className="space-y-6">
      <header>
        <p className="label">Overview</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight mt-1">Dashboard</h1>
      </header>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card title="Market feed" right={<StatusPill status={a.loading ? 'disconnected' : a.status} />}>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-slate-400 text-sm">{inst.symbol}</span>
              <span className="num text-2xl text-white">{last ? fmtPrice(last.close, dec) : '—'}</span>
            </div>
            <p className="text-xs text-slate-500">
              {a.provider} · {a.lastUpdate ? `updated ${new Date(a.lastUpdate).toLocaleTimeString()}` : 'no data yet'}
            </p>
            {a.error && <p className="text-xs text-amber-300">{a.error}</p>}
          </div>
        </Card>

        <Card title="Current signal">
          {a.decision ? (
            <div className="space-y-3">
              <SetupBadge state={a.decision.state} />
              <p className="text-sm text-slate-400 leading-relaxed">{a.decision.reason}</p>
              <Link to="/analysis" className="text-sm text-cyanx hover:underline">Open live analysis →</Link>
            </div>
          ) : <Empty title="No analysis yet" body="Waiting for real candles from the feed." />}
        </Card>

        <Card title="Multi-timeframe bias">
          {a.htf.length ? (
            <ul className="space-y-2.5">
              {a.htf.map((h) => (
                <li key={h.timeframe} className="flex items-center justify-between">
                  <span className="num text-sm uppercase text-slate-300">{h.timeframe}</span>
                  <BiasPill bias={h.sufficient ? h.bias : 'UNAVAILABLE'} />
                </li>
              ))}
            </ul>
          ) : <Empty title="No bias yet" body="Bias appears once higher-timeframe candles load." />}
        </Card>

        <Card title="Performance">
          {stats.closed === 0 ? (
            <Empty title="No closed trades yet" body="Record trades in the journal to see your win rate and statistics here." />
          ) : (
            <div className="flex items-center gap-6">
              <WinRateCircle value={stats.winRate} size={120} />
              <div className="text-sm space-y-1">
                <div className="text-slate-400">Net P&amp;L <span className="num text-slate-100 ml-2">{stats.netPnl.toFixed(2)}</span></div>
                <div className="text-slate-400">Profit factor <span className="num text-slate-100 ml-2">{stats.profitFactor?.toFixed(2) ?? '—'}</span></div>
                <div className="text-slate-400">Trades <span className="num text-slate-100 ml-2">{stats.closed}</span></div>
              </div>
            </div>
          )}
        </Card>

        <Card title="Recent journal entries" right={<Link to="/journal" className="text-xs text-cyanx">View all</Link>}>
          {trades.length === 0 ? (
            <Empty title="Journal is empty" body="Log your first trade to start building a record." />
          ) : (
            <ul className="space-y-2 text-sm">
              {trades.slice(0, 4).map((t) => (
                <li key={t.id} className="flex justify-between">
                  <span className="text-slate-300">{t.instrument} · {t.direction}</span>
                  <span className="num text-slate-500">{t.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Quick actions">
          <div className="grid grid-cols-2 gap-2">
            <Link to="/scanner" className="btn-ghost justify-center">Run scanner</Link>
            <Link to="/mtf" className="btn-ghost justify-center">Multi-timeframe</Link>
            <Link to="/journal" className="btn-primary justify-center col-span-2">New journal entry</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
