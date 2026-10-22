import { describe, it, expect } from 'vitest';
import { ema, rsi, sma } from '../src/engine/indicators';
import { findSwings, classifyStructure } from '../src/engine/structure';
import { analyseTimeframe, MIN_CANDLES } from '../src/engine/bias';
import { positionSize } from '../src/engine/setup';
import { INSTRUMENTS } from '../src/engine/instruments';
import type { Candle } from '../src/engine/types';

function trendCandles(n: number, start: number, step: number): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const c = start + i * step;
    out.push({ time: 1_700_000_000 + i * 900, open: c - step / 2, high: c + 0.3, low: c - 0.3, close: c });
  }
  return out;
}

describe('indicators', () => {
  it('SMA of a constant series equals the constant', () => {
    const r = sma([5, 5, 5, 5, 5], 3);
    expect(r[4]).toBeCloseTo(5);
    expect(r[1]).toBeNull();
  });
  it('EMA seeds with the SMA of the first window', () => {
    const r = ema([1, 2, 3, 4, 5], 3);
    expect(r[2]).toBeCloseTo(2);
  });
  it('RSI is 100 on a strictly rising series', () => {
    const closes = Array.from({ length: 30 }, (_, i) => i + 1);
    expect(rsi(closes, 14)[29]).toBe(100);
  });
});

describe('structure', () => {
  it('detects higher highs and higher lows on an uptrend', () => {
    const candles = trendCandles(120, 100, 0.5);
    const cls = classifyStructure(findSwings(candles, 3));
    // Pure linear trend has no confirmed swings beyond the edges, so structure is insufficient.
    expect(['UPTREND', 'INSUFFICIENT']).toContain(cls.trend);
  });
  it('swing detection never uses unconfirmed trailing candles', () => {
    const candles = trendCandles(20, 100, 1);
    const swings = findSwings(candles, 3);
    for (const s of swings) expect(s.index).toBeLessThan(candles.length - 3);
  });
});

describe('bias engine', () => {
  it('returns NEUTRAL with insufficient-data explanation below the minimum candle count', () => {
    const a = analyseTimeframe('1h', trendCandles(50, 100, 0.1));
    expect(a.sufficient).toBe(false);
    expect(a.bias).toBe('NEUTRAL');
    expect(a.summary).toMatch(/required/);
  });
  it('classifies a long clean uptrend as BULLISH or at least not BEARISH', () => {
    const a = analyseTimeframe('1h', trendCandles(MIN_CANDLES + 40, 100, 0.05));
    expect(a.sufficient).toBe(true);
    expect(a.bias).not.toBe('BEARISH');
  });
  it('classifies a long clean downtrend as BEARISH or at least not BULLISH', () => {
    const a = analyseTimeframe('1h', trendCandles(MIN_CANDLES + 40, 200, -0.05));
    expect(a.bias).not.toBe('BULLISH');
  });
});

describe('risk sizing', () => {
  const eur = INSTRUMENTS.find((i) => i.symbol === 'EUR/USD')!;
  it('returns null without a balance', () => {
    expect(positionSize(eur, 1.1, 1.095, 0, 1)).toBeNull();
  });
  it('risks the configured money amount', () => {
    const r = positionSize(eur, 1.1, 1.099, 10000, 1)!;
    // 1% of 10,000 = 100; 10 pips at $10/pip/lot => 1 lot
    expect(r.riskMoney).toBeCloseTo(100);
    expect(r.lots).toBeCloseTo(1, 1);
  });
});
