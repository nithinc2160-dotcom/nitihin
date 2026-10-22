import type { Candle, Timeframe, TimeframeAnalysis } from './types';
import { analyseTimeframe, MIN_CANDLES } from './bias';
import { evaluateSetup } from './setup';
import { INSTRUMENTS } from './instruments';

export interface BacktestTrade {
  time: number;
  direction: 'BUY' | 'SELL';
  entry: number;
  stop: number;
  tp1: number;
  outcome: 'WIN' | 'LOSS' | 'OPEN';
  rMultiple: number;
}

export interface BacktestResult {
  trades: BacktestTrade[];
  sampleSize: number;
  winRate: number | null;
  profitFactor: number | null;
  avgR: number | null;
  maxDrawdownR: number;
  assumptions: string[];
}

/**
 * Walk-forward replay. At bar i we only pass candles[0..i] to the engine (no look-ahead).
 * The entry is taken at the decision candle close; the outcome is resolved on subsequent candles
 * (stop checked before target within the same bar — conservative). Spread/commission are not modelled.
 * Only the first 70% of the sample is used for signals; the final 30% is the out-of-sample hold-out.
 */
export function backtest(candles: Candle[], symbol: string, htfCandles?: Partial<Record<Timeframe, Candle[]>>): BacktestResult {
  const inst = INSTRUMENTS.find((i) => i.symbol === symbol) ?? INSTRUMENTS[0];
  const splitIdx = Math.floor(candles.length * 0.7);
  const trades: BacktestTrade[] = [];
  let openUntil = -1;

  for (let i = MIN_CANDLES; i < candles.length - 1; i++) {
    if (i > splitIdx) break; // development sample only
    if (i <= openUntil) continue;
    const slice = candles.slice(0, i + 1);
    // Higher-timeframe context: approximate with the same series' trend (documented limitation).
    const htf: TimeframeAnalysis[] = [analyseTimeframe('1h', slice)];
    if (htfCandles) {
      /* reserved for multi-series backtests */
    }
    const dec = evaluateSetup(inst, slice, htf, candles[i].time * 1000);
    if (!dec.setup) continue;
    const s = dec.setup;
    const risk = Math.abs(s.entry - s.stopLoss);
    let outcome: BacktestTrade['outcome'] = 'OPEN';
    let r = 0;
    let exitIdx = i;
    for (let j = i + 1; j < candles.length; j++) {
      const c = candles[j];
      const hitStop = s.direction === 'BUY' ? c.low <= s.stopLoss : c.high >= s.stopLoss;
      const hitTp = s.direction === 'BUY' ? c.high >= s.takeProfits[0] : c.low <= s.takeProfits[0];
      exitIdx = j;
      if (hitStop) { outcome = 'LOSS'; r = -1; break; }
      if (hitTp) { outcome = 'WIN'; r = s.riskReward[0]; break; }
    }
    openUntil = exitIdx;
    trades.push({ time: candles[i].time, direction: s.direction, entry: s.entry, stop: s.stopLoss, tp1: s.takeProfits[0], outcome, rMultiple: r || (risk > 0 ? 0 : 0) });
  }

  const closed = trades.filter((t) => t.outcome !== 'OPEN');
  const wins = closed.filter((t) => t.outcome === 'WIN');
  const losses = closed.filter((t) => t.outcome === 'LOSS');
  const grossW = wins.reduce((s, t) => s + t.rMultiple, 0);
  const grossL = Math.abs(losses.reduce((s, t) => s + t.rMultiple, 0));
  let eq = 0, peak = 0, dd = 0;
  for (const t of closed) {
    eq += t.rMultiple;
    peak = Math.max(peak, eq);
    dd = Math.max(dd, peak - eq);
  }
  return {
    trades,
    sampleSize: closed.length,
    winRate: closed.length ? (wins.length / closed.length) * 100 : null,
    profitFactor: grossL > 0 ? grossW / grossL : null,
    avgR: closed.length ? closed.reduce((s, t) => s + t.rMultiple, 0) / closed.length : null,
    maxDrawdownR: dd,
    assumptions: [
      'Walk-forward: each decision uses only candles closed up to that bar.',
      'Development sample = first 70% of candles; last 30% is held out and not traded.',
      'Entry at decision close; stop checked before target inside the same candle (conservative).',
      'TP1 only is scored; spread, commission and slippage are NOT modelled.',
      'Higher-timeframe context is approximated from the same series (documented limitation).',
      'Small samples are unreliable; this is not evidence of future profitability.',
    ],
  };
}
