import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import CandleChart from '../components/chart/CandleChart';
import { Card, BiasPill, StatusPill, SetupBadge, Stat, fmtPrice } from '../components/ui';
import { useMarketAnalysis } from '../hooks/useMarketAnalysis';
import { useSettings } from '../state/settings';
import { INSTRUMENTS, TIMEFRAMES } from '../engine/instruments';
import { positionSize } from '../engine/setup';
import { findSwings, keyLevels } from '../engine/structure';

export default function LiveAnalysis() {
  const { settings, update } = useSettings();
  const a = useMarketAnalysis();
  const inst = INSTRUMENTS.find((i) => i.symbol === settings.instrument) ?? INSTRUMENTS[0];
  const last = a.candles[a.candles.length - 1];
  const decimals = inst.pipSize < 0.01 ? 5 : inst.pipSize < 1 ? 3 : 2;

  const levels = useMemo(() => {
    if (!a.candles.length || !last) return { s: [] as number[], r: [] as number[] };
    const swings = findSwings(a.candles, 3);
    const atr = a.entry?.indicators.ATR14 ?? inst.pipSize * 10;
    const k = keyLevels(swings, last.close, Math.max(Number(atr) * 0.5, last.close * 0.0005));
    return { s: k.support, r: k.resistance };
  }, [a.candles, a.entry, last, inst.pipSize]);

  const d = a.decision;
  const setup = d?.setup ?? null;
  const size = setup ? positionSize(inst, setup.entry, setup.stopLoss, settings.accountBalance, settings.riskPct) : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label">AI Trading Lab</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight mt-1">Live Market Analysis</h1>
          <p className="text-sm text-slate-500 mt-1">Deterministic engine on real candles. Signals are analytical, not advice.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input !w-auto" value={settings.instrument} onChange={(e) => update({ instrument: e.target.value })} aria-label="Instrument">
            {INSTRUMENTS.map((i) => <option key={i.symbol} value={i.symbol}>{i.symbol}</option>)}
          </select>
          <div role="group" aria-label="Entry timeframe" className="flex rounded-lg border border-white/10 overflow-hidden">
            {TIMEFRAMES.map((t) => (
              <button
                key={t.value}
                onClick={() => update({ entryTf: t.value })}
                className={`px-2.5 py-2 text-xs font-medium transition ${settings.entryTf === t.value ? 'bg-violet-neon/25 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                aria-pressed={settings.entryTf === t.value}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button className="btn-ghost" onClick={a.refresh} aria-label="Refresh analysis"><RefreshCw size={14} /> Analyse now</button>
        </div>
      </header>

      {/* Status strip */}
      <div className="glass p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat label="Instrument" value={inst.symbol} />
        <Stat label="Last close" value={last ? fmtPrice(last.close, decimals) : '—'} />
        <div>
          <div className="label">Data feed</div>
          <div className="mt-1"><StatusPill status={a.loading ? 'disconnected' : a.status} /></div>
        </div>
        <Stat label="Provider" value={a.provider} />
        <Stat label="Last update" value={a.lastUpdate ? new Date(a.lastUpdate).toLocaleTimeString() : '—'} />
      </div>

      {a.error && !a.loading && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200" role="alert">
          {a.error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card title={`${inst.symbol} · ${settings.entryTf.toUpperCase()}`} right={a.stale && <span className="text-xs text-amber-300">Latest candle stale</span>}>
          {a.loading ? (
            <div className="h-[460px] grid place-items-center text-sm text-slate-500">Loading real candles…</div>
          ) : a.candles.length ? (
            <CandleChart candles={a.candles} setup={setup} supportLevels={levels.s} resistanceLevels={levels.r} />
          ) : (
            <div className="h-[460px] grid place-items-center text-center text-sm text-slate-500 px-6">
              No candles loaded. {a.error ?? 'Check the market proxy configuration.'}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Signal">
            {d ? (
              <div className="space-y-4">
                <SetupBadge state={d.state} />
                <p className="text-sm text-slate-300 leading-relaxed">{d.reason}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Analysis pending.</p>
            )}
          </Card>

          {setup && (
            <Card title="Trade levels">
              <dl className="space-y-2.5 text-sm">
                <Row k="Direction" v={setup.direction} />
                <Row k="Entry" v={fmtPrice(setup.entry, decimals)} />
                <Row k="Stop-loss" v={fmtPrice(setup.stopLoss, decimals)} />
                {setup.takeProfits.map((tp, i) => (
                  <Row key={i} k={`TP${i + 1} (${setup.riskReward[i]}R)`} v={fmtPrice(tp, decimals)} />
                ))}
                {size && (
                  <>
                    <Row k="Suggested size" v={`${size.lots} lots`} />
                    <Row k="Risk" v={`${settings.accountCurrency} ${size.riskMoney.toFixed(2)}`} />
                  </>
                )}
              </dl>
              <ul className="mt-4 space-y-1 text-xs text-slate-400 list-disc pl-4">
                {setup.invalidation.map((x) => <li key={x}>{x}</li>)}
              </ul>
              <p className="mt-3 text-[11px] text-slate-600">Pip value is an estimate; verify contract specs with your broker.</p>
            </Card>
          )}

          <Card title="Higher-timeframe context">
            <ul className="space-y-3">
              {a.htf.map((h) => (
                <li key={h.timeframe} className="flex items-center justify-between gap-3">
                  <span className="num text-sm text-slate-300 uppercase">{h.timeframe}</span>
                  <BiasPill bias={h.sufficient ? h.bias : 'UNAVAILABLE'} />
                </li>
              ))}
            </ul>
            {a.entry && (
              <div className="mt-5 pt-4 border-t border-white/[0.06]">
                <p className="label mb-2">Evidence · {settings.entryTf.toUpperCase()}</p>
                <ul className="space-y-1.5 text-xs text-slate-400">
                  {a.entry.evidence.map((e, i) => (
                    <li key={i} className="flex gap-2">
                      <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${e.weight === 'bullish' ? 'bg-bull' : e.weight === 'bearish' ? 'bg-bear' : 'bg-slate-500'}`} />
                      <span><span className="text-slate-300">{e.factor}:</span> {e.reading}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{k}</dt>
      <dd className="num text-slate-100">{v}</dd>
    </div>
  );
}
