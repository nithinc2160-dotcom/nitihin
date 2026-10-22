import { Card, BiasPill, Empty, StatusPill } from '../components/ui';
import { useMarketAnalysis } from '../hooks/useMarketAnalysis';
import { useSettings } from '../state/settings';
import { TIMEFRAMES } from '../engine/instruments';
import type { Timeframe } from '../engine/types';

export default function MultiTimeframe() {
  const { settings, update } = useSettings();
  const a = useMarketAnalysis();
  const all = [...settings.htfs, settings.entryTf].filter((v, i, arr) => arr.indexOf(v) === i);

  const toggle = (tf: Timeframe) => {
    const has = settings.htfs.includes(tf);
    update({ htfs: has ? settings.htfs.filter((t) => t !== tf) : [...settings.htfs, tf] });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label">Context</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight mt-1">Multi-Timeframe Analysis</h1>
          <p className="text-sm text-slate-500 mt-1">
            Higher timeframes set context; the entry timeframe ({settings.entryTf.toUpperCase()}) confirms. A bullish HTF alone is not an entry.
          </p>
        </div>
        <StatusPill status={a.loading ? 'disconnected' : a.status} />
      </header>

      <Card title="Framework">
        <div className="flex flex-wrap gap-2">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.value}
              onClick={() => toggle(t.value)}
              aria-pressed={settings.htfs.includes(t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${settings.htfs.includes(t.value) ? 'border-violet-neon/50 bg-violet-neon/15 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">Entry timeframe: <span className="text-slate-300 uppercase">{settings.entryTf}</span> (change on Live Analysis).</p>
      </Card>

      {a.htf.length === 0 ? (
        <Empty title="No timeframes selected" body="Select one or more higher timeframes above." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {all.map((tf) => {
            const h = a.htf.find((x) => x.timeframe === tf) ?? (a.entry?.timeframe === tf ? a.entry : null);
            return (
              <Card key={tf} title={tf.toUpperCase()} right={h ? <BiasPill bias={h.sufficient ? h.bias : 'UNAVAILABLE'} /> : <BiasPill bias="UNAVAILABLE" />}>
                {!h || !h.sufficient ? (
                  <p className="text-sm text-slate-500">{h?.summary ?? 'Candles not loaded for this timeframe.'}</p>
                ) : (
                  <div className="space-y-3 text-sm">
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <dt className="text-slate-500">Trend</dt><dd className="text-slate-200 text-right">{h.trend}</dd>
                      <dt className="text-slate-500">Structure</dt><dd className="text-slate-200 text-right">{h.structure}</dd>
                      <dt className="text-slate-500">Momentum</dt><dd className="text-slate-200 text-right">{h.momentum}</dd>
                      <dt className="text-slate-500">RSI(14)</dt><dd className="num text-slate-200 text-right">{h.indicators.RSI14?.toFixed(1) ?? '—'}</dd>
                      <dt className="text-slate-500">ADX(14)</dt><dd className="num text-slate-200 text-right">{h.indicators.ADX14?.toFixed(1) ?? '—'}</dd>
                      <dt className="text-slate-500">Candles</dt><dd className="num text-slate-200 text-right">{h.candleCount}</dd>
                    </dl>
                    <div className="text-xs text-slate-500">
                      Resistance: <span className="num text-slate-300">{h.resistanceLevels.map((x) => x.toFixed(5)).join(', ') || '—'}</span><br />
                      Support: <span className="num text-slate-300">{h.supportLevels.map((x) => x.toFixed(5)).join(', ') || '—'}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed border-t border-white/[0.06] pt-3">{h.summary}</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
