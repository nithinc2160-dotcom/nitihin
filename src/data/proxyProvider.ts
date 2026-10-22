import type { Candle, Timeframe } from '../engine/types';
import type { CandleResult, MarketDataProvider, Quote } from './provider';
import { INSTRUMENTS } from '../engine/instruments';

/**
 * Calls the server-side market proxy at /api/market. The proxy reads the provider key
 * from server environment variables (MARKET_API_KEY) and never returns it to the browser.
 * If the proxy reports it is unconfigured, every call returns status 'unconfigured' and
 * the UI must disable fresh signals.
 */
export class ProxyProvider implements MarketDataProvider {
  readonly name = 'Market proxy';

  supportsSymbol(symbol: string) {
    return INSTRUMENTS.some((i) => i.symbol === symbol);
  }
  supportsTimeframe(_tf: Timeframe) {
    return true; // the provider decides; proxy returns an explanation if unavailable
  }

  async getCandles(symbol: string, tf: Timeframe, limit: number, signal?: AbortSignal): Promise<CandleResult> {
    const fetchedAt = Date.now();
    try {
      const res = await fetch(`/api/market/candles?symbol=${encodeURIComponent(symbol)}&tf=${tf}&limit=${limit}`, { signal });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          candles: [],
          provider: body.provider ?? this.name,
          status: body.status ?? 'disconnected',
          fetchedAt,
          error: body.error ?? `Request failed (${res.status})`,
        };
      }
      const candles: Candle[] = (body.candles as Candle[]).filter(
        (c) => Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close),
      );
      return { candles, provider: body.provider ?? this.name, status: body.status ?? 'live', fetchedAt };
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      return { candles: [], provider: this.name, status: 'disconnected', fetchedAt, error: 'Could not reach the market proxy.' };
    }
  }

  async getQuote(symbol: string, signal?: AbortSignal): Promise<Quote | null> {
    try {
      const res = await fetch(`/api/market/quote?symbol=${encodeURIComponent(symbol)}`, { signal });
      if (!res.ok) return null;
      return (await res.json()) as Quote;
    } catch {
      return null;
    }
  }
}
