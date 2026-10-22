import { useEffect, useMemo, useState } from 'react';
import type { Candle, Timeframe, TimeframeAnalysis } from '../engine/types';
import type { FeedStatus } from '../data/provider';
import { ProxyProvider } from '../data/proxyProvider';
import { analyseTimeframe, MIN_CANDLES } from '../engine/bias';
import { evaluateSetup, type SetupDecision } from '../engine/setup';
import { INSTRUMENTS, TIMEFRAMES } from '../engine/instruments';
import { isStale } from '../data/provider';
import { useSettings } from '../state/settings';

const provider = new ProxyProvider();
const REFRESH_MS = 30_000;

interface RawState {
  loading: boolean;
  status: FeedStatus;
  provider: string;
  error?: string;
  lastUpdate: number | null;
  results: Partial<Record<Timeframe, Candle[]>>;
}

export interface AnalysisState {
  loading: boolean;
  status: FeedStatus;
  provider: string;
  error?: string;
  candles: Candle[];
  htf: TimeframeAnalysis[];
  entry: TimeframeAnalysis | null;
  decision: SetupDecision | null;
  lastUpdate: number | null;
  stale: boolean;
  symbol: string;
  entryTf: Timeframe;
}

/**
 * Fetches real candles for the selected instrument and every configured timeframe, then runs the
 * deterministic engine. Stale or missing data disables fresh signals (decision = DATA UNAVAILABLE).
 * Changing instrument or timeframe discards previous results immediately.
 */
export function useMarketAnalysis(): AnalysisState & { refresh: () => void } {
  const { settings } = useSettings();
  const instrument = INSTRUMENTS.find((i) => i.symbol === settings.instrument) ?? INSTRUMENTS[0];
  const { entryTf, htfs } = settings;

  const [tick, setTick] = useState(0);
  const [state, setState] = useState<RawState>({
    loading: true,
    status: 'disconnected',
    provider: provider.name,
    lastUpdate: null,
    results: {},
  });

  // Reset when instrument or timeframe set changes so old signals never leak.
  useEffect(() => {
    setState((s) => ({ ...s, loading: true, results: {}, candles: [], status: 'disconnected', error: undefined, lastUpdate: null }));
  }, [instrument.symbol, entryTf, htfs.join(',')]);

  useEffect(() => {
    const ctrl = new AbortController();
    const tfs = Array.from(new Set<Timeframe>([...htfs, entryTf]));
    (async () => {
      const results: Partial<Record<Timeframe, Candle[]>> = {};
      let worst: FeedStatus = 'live';
      let firstErr: string | undefined;
      let fetched = 0;
      for (const tf of tfs) {
        try {
          const r = await provider.getCandles(instrument.symbol, tf, 500, ctrl.signal);
          if (r.error && !firstErr) firstErr = r.error;
          if (r.status === 'unconfigured' || r.status === 'disconnected') worst = r.status;
          if (r.candles.length) {
            results[tf] = r.candles;
            fetched++;
          }
        } catch (e) {
          if ((e as Error).name === 'AbortError') return;
        }
      }
      if (ctrl.signal.aborted) return;
      setState((s) => ({
        ...s,
        loading: false,
        results,
        status: fetched === 0 ? worst : worst === 'live' ? 'delayed' : worst,
        error: fetched === 0 ? firstErr ?? 'No candles returned.' : firstErr,
        lastUpdate: Date.now(),
      }));
    })();
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, [instrument.symbol, entryTf, htfs.join(','), tick]);

  const analysis = useMemo(() => {
    const entryCandles = state.results[entryTf] ?? [];
    const htf = htfs.map((tf) => analyseTimeframe(tf, state.results[tf] ?? []));
    const entry = entryCandles.length ? analyseTimeframe(entryTf, entryCandles) : null;
    const tfSec = TIMEFRAMES.find((t) => t.value === entryTf)!.seconds;
    const lastT = entryCandles.length ? entryCandles[entryCandles.length - 1].time : 0;
    const stale = entryCandles.length > 0 && isStale(lastT, tfSec);

    let decision: SetupDecision | null = null;
    if (!entryCandles.length || entryCandles.length < MIN_CANDLES) {
      decision = { state: 'DATA UNAVAILABLE', reason: state.error ?? `Need at least ${MIN_CANDLES} closed candles on ${entryTf}.` };
    } else if (stale) {
      decision = { state: 'DATA UNAVAILABLE', reason: 'Latest candle is stale. Fresh signals are disabled until data updates.' };
    } else if (state.status === 'unconfigured' || state.status === 'disconnected') {
      decision = { state: 'DATA UNAVAILABLE', reason: state.error ?? 'Market feed unavailable.' };
    } else {
      decision = evaluateSetup(instrument, entryCandles, htf);
    }
    return { entryCandles, htf, entry, decision, stale };
  }, [state.results, state.status, state.error, entryTf, htfs, instrument]);

  return {
    loading: state.loading,
    status: state.status,
    provider: state.provider,
    error: state.error,
    candles: analysis.entryCandles,
    htf: analysis.htf,
    entry: analysis.entry,
    decision: analysis.decision,
    lastUpdate: state.lastUpdate,
    stale: analysis.stale,
    symbol: instrument.symbol,
    entryTf,
    refresh: () => setTick((t) => t + 1),
  };
}
