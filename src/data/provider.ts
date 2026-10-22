import type { Candle, Timeframe } from '../engine/types';

export interface Quote {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  spread?: number;
  timestamp: number;
}

export type FeedStatus = 'live' | 'delayed' | 'historical' | 'stale' | 'disconnected' | 'unconfigured';

export interface CandleResult {
  candles: Candle[];
  provider: string;
  status: FeedStatus;
  fetchedAt: number;
  error?: string;
}

/**
 * Provider adapter. Real implementations call the server-side proxy (/api/market/*), which
 * holds the private API key. The browser never sees the key.
 */
export interface MarketDataProvider {
  readonly name: string;
  supportsSymbol(symbol: string): boolean;
  supportsTimeframe(tf: Timeframe): boolean;
  getCandles(symbol: string, tf: Timeframe, limit: number, signal?: AbortSignal): Promise<CandleResult>;
  getQuote(symbol: string, signal?: AbortSignal): Promise<Quote | null>;
}

/** Freshness threshold: a last candle older than this many candle periods is stale. */
export function isStale(lastCandleTime: number, tfSeconds: number, nowMs = Date.now()): boolean {
  const ageSec = nowMs / 1000 - lastCandleTime;
  return ageSec > tfSeconds * 3;
}
