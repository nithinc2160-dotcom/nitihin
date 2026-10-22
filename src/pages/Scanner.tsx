import { useEffect, useRef, useState } from 'react';
import { Radar, Bell } from 'lucide-react';
import { Card, SetupBadge, Empty, fmtPrice } from '../components/ui';
import { useMarketAnalysis } from '../hooks/useMarketAnalysis';
import { useSettings } from '../state/settings';
import { INSTRUMENTS } from '../engine/instruments';
import type { TradeSetup } from '../engine/types';

const HISTORY_KEY = 'zorvex.setups.v1';

/**
 * Scanner shows the setup for the currently selected instrument and entry timeframe, driven by the same
 * live analysis hook. Setups are de-duplicated by id and tracked with ACTIVE/EXPIRED/INVALIDATED status.
 */
export default function Scanner() {
  const { settings, update } = useSettings();
  const a = useMarketAnalysis();
  const [history, setHistory] = useState<TradeSetup[]>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  });
  const [monitoring, setMonitoring] = useState(false);
  const seen = useRef<Set<string>>(new Set(history.map((h) => h.id)));
  const last = a.candles[a.candles.length - 1];

  // Record new setups once each (duplicate prevention) and mark invalidation.
  useEffect(() => {
    const s = a.decision?.setup;
    if (s && !seen.current.has(s.id)) {
      seen.current.add(s.id);
      setHistory((h) => [s, ...h].slice(0, 100));
      if (monitoring && settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`${s.symbol} ${s.direction} setup`, { body: `Entry ${s.entry} · SL ${s.stopLoss}` });
      }
    }
  }, [a.decision, monitoring, settings.notifications]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  // Update status of tracked setups against the latest close.
  useEffect(() => {
    if (!last) return;
    setHistory((h) =>
      h.map((s) => {
        if (s.status !== 'ACTIVE') return s;
        const broken = s.direction === 'BUY' ? last.close < s.stopLoss : last.close > s.stopLoss;
        return broken ? { ...s, status: 'INVALIDATED' } : s;
      }),
    );
  }, [last?.time]);

  const inst = INSTRUMENTS.find((i) => i.symbol === settings.instrument) ?? INSTRUMENTS[0];
  const dec = inst.pipSize < 0.01 ? 5 : inst.pipSize < 1 ? 3 : 2;

  const requestNotify = async () => {
    if ('Notification' in window) await Notification.requestPermission();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label">Scanner</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight mt-1">Trade Setup Scanner</h1>
          <p className="text-sm text-slate-500 mt-1">Scans real candles and only reports setups whose rules are satisfied.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input !w-auto" value={settings.instrument} onChange={(e) => update({ instrument: e.target.value })} aria-label="Instrument">
            {INSTRUMENTS.map((i) => <option key={i.symbol}>{i.symbol}</option>)}
          </select>
          <button className="btn-primary" onClick={a.refresh}><Radar size={14} /> Analyse now</button>
          <button className={monitoring ? 'btn-primary' : 'btn-ghost'} onClick={() => { setMonitoring((m) => !m); requestNotify(); }} aria-pressed={monitoring}>
            <Bell size={14} /> {monitoring ? 'Monitoring on' : 'Continuous monitoring'}
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card title="Current scan">
          {a.decision ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <SetupBadge state={a.decision.state} />
                <span className="num text-xs text-slate-500">{inst.symbol} · {settings.entryTf.toUpperCase()}</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{a.decision.reason}</p>
              {a.decision.setup && <SetupDetail s={a.decision.setup} dec={dec} />}
            </div>
          ) : <Empty title="Waiting for data" body="The scanner runs once real candles are loaded." />}
        </Card>

        <Card title={`Setup history (${history.length})`}>
          {history.length === 0 ? (
            <Empty title="No setups recorded" body="Valid setups appear here, marked ACTIVE, EXPIRED or INVALIDATED." />
          ) : (
            <ul className="space-y-3 max-h-[520px] overflow-auto pr-1">
              {history.map((s) => (
                <li key={s.id} className="rounded-lg border border-white/[0.06] p-3 bg-ink-950/40">
                  <div className="flex justify-between items-center text-sm">
                    <span className={s.direction === 'BUY' ? 'text-bull font-semibold' : 'text-bear font-semibold'}>{s.symbol} {s.direction}</span>
                    <span className={`text-[11px] font-semibold ${s.status === 'ACTIVE' ? 'text-cyanx' : 'text-slate-500'}`}>{s.status}</span>
                  </div>
                  <div className="num text-xs text-slate-500 mt-1">
                    Entry {fmtPrice(s.entry, dec)} · SL {fmtPrice(s.stopLoss, dec)} · TP1 {fmtPrice(s.takeProfits[0], dec)}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1">{new Date(s.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function SetupDetail({ s, dec }: { s: TradeSetup; dec: number }) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <dt className="text-slate-500">Entry</dt><dd className="num text-right">{fmtPrice(s.entry, dec)}</dd>
        <dt className="text-slate-500">Stop-loss</dt><dd className="num text-right">{fmtPrice(s.stopLoss, dec)}</dd>
        {s.takeProfits.map((tp, i) => (
          <>
            <dt key={`k${i}`} className="text-slate-500">TP{i + 1}</dt>
            <dd key={`v${i}`} className="num text-right">{fmtPrice(tp, dec)} <span className="text-slate-500">({s.riskReward[i]}R)</span></dd>
          </>
        ))}
      </dl>
      <div className="text-xs text-slate-400 space-y-1">
        {s.rationale.map((r) => <p key={r}>• {r}</p>)}
      </div>
      <div className="text-xs text-amber-300/80 space-y-1">
        {s.invalidation.map((r) => <p key={r}>⚠ {r}</p>)}
      </div>
    </div>
  );
}
