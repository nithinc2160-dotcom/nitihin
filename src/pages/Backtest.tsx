import { useState } from 'react';
import { FlaskConical, Download } from 'lucide-react';
import { Card, Empty, Stat } from '../components/ui';
import { INSTRUMENTS, TIMEFRAMES } from '../engine/instruments';
import { backtest, type BacktestResult } from '../engine/backtest';
import { ProxyProvider } from '../data/proxyProvider';
import type { Timeframe } from '../engine/types';

const provider = new ProxyProvider();

/**
 * Backtest replays the same rules over historical candles, using only candles closed before each
 * decision point. The sample split keeps the most recent portion out of development (out-of-sample).
 */
export default function Backtest() {
  const [symbol, setSymbol] = useState('EUR/USD');
  const [tf, setTf] = useState<Timeframe>('15m');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    const r = await provider.getCandles(symbol, tf, 1000);
    if (r.candles.length < 300) {
      setError(r.error ?? `Only ${r.candles.length} candles returned; at least 300 are needed. Provider status: ${r.status}.`);
    } else {
      setResult(backtest(r.candles, symbol));
    }
    setRunning(false);
  };

  const exportCsv = () => {
    if (!result) return;
    const rows = ['time,direction,entry,stop,tp1,outcome,rMultiple', ...result.trades.map((t) => [t.time, t.direction, t.entry, t.stop, t.tp1, t.outcome, t.rMultiple].join(','))];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `backtest-${symbol.replace('/', '')}-${tf}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="label">Research</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight mt-1">Strategy Backtesting</h1>
        <p className="text-sm text-slate-500 mt-1">Historical candles from your provider. Results are a sample, not a guarantee.</p>
      </header>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5"><span className="label">Instrument</span>
            <select className="input !w-auto" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
              {INSTRUMENTS.map((i) => <option key={i.symbol}>{i.symbol}</option>)}
            </select>
          </label>
          <label className="space-y-1.5"><span className="label">Timeframe</span>
            <select className="input !w-auto" value={tf} onChange={(e) => setTf(e.target.value as Timeframe)}>
              {TIMEFRAMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <button className="btn-primary" onClick={run} disabled={running}><FlaskConical size={14} /> {running ? 'Running…' : 'Run backtest'}</button>
          {result && <button className="btn-ghost" onClick={exportCsv}><Download size={14} /> Export CSV</button>}
        </div>
        {error && <p className="text-sm text-amber-300 mt-4">{error}</p>}
      </Card>

      {!result ? (
        <Empty title="No backtest run yet" body="Choose an instrument and timeframe, then run. Results use only candles closed at each decision point." />
      ) : (
        <>
          <Card title={`Results · ${result.sampleSize} signals`}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
              <Stat label="Signals" value={result.sampleSize} />
              <Stat label="Win rate" value={result.winRate === null ? '—' : `${result.winRate.toFixed(1)}%`} />
              <Stat label="Profit factor" value={result.profitFactor === null ? '—' : result.profitFactor.toFixed(2)} />
              <Stat label="Avg R" value={result.avgR === null ? '—' : result.avgR.toFixed(2)} />
              <Stat label="Max drawdown (R)" value={result.maxDrawdownR.toFixed(2)} tone="bear" />
            </div>
          </Card>
          <Card title="Assumptions & limitations">
            <ul className="text-sm text-slate-400 space-y-1.5 list-disc pl-5">
              {result.assumptions.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
