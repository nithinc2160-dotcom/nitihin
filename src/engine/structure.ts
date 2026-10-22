import type { Candle } from './types';

export interface SwingPoint {
  index: number;
  time: number;
  price: number;
  type: 'high' | 'low';
}

/**
 * Confirmed swing points: a swing high at i requires its high to be the strict maximum
 * over `lookback` candles on each side. Only candles that are fully confirmed (i + lookback < n)
 * are returned, so no look-ahead bias is introduced.
 */
export function findSwings(candles: Candle[], lookback = 3): SwingPoint[] {
  const swings: SwingPoint[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) isHigh = false;
      if (candles[j].low <= candles[i].low) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) swings.push({ index: i, time: candles[i].time, price: candles[i].high, type: 'high' });
    if (isLow) swings.push({ index: i, time: candles[i].time, price: candles[i].low, type: 'low' });
  }
  return swings.sort((a, b) => a.index - b.index);
}

export type StructureLabel = 'HH' | 'HL' | 'LH' | 'LL';

export interface StructureReading {
  sequence: { label: StructureLabel; price: number; time: number }[];
  trend: 'UPTREND' | 'DOWNTREND' | 'RANGE' | 'INSUFFICIENT';
  lastHigh?: SwingPoint;
  lastLow?: SwingPoint;
  prevHigh?: SwingPoint;
  prevLow?: SwingPoint;
}

export function classifyStructure(swings: SwingPoint[]): StructureReading {
  const highs = swings.filter((s) => s.type === 'high');
  const lows = swings.filter((s) => s.type === 'low');
  const sequence: StructureReading['sequence'] = [];
  for (let i = 1; i < highs.length; i++) {
    sequence.push({
      label: highs[i].price > highs[i - 1].price ? 'HH' : 'LH',
      price: highs[i].price,
      time: highs[i].time,
    });
  }
  for (let i = 1; i < lows.length; i++) {
    sequence.push({
      label: lows[i].price > lows[i - 1].price ? 'HL' : 'LL',
      price: lows[i].price,
      time: lows[i].time,
    });
  }
  sequence.sort((a, b) => a.time - b.time);

  const lastHigh = highs[highs.length - 1];
  const prevHigh = highs[highs.length - 2];
  const lastLow = lows[lows.length - 1];
  const prevLow = lows[lows.length - 2];

  let trend: StructureReading['trend'] = 'INSUFFICIENT';
  if (highs.length >= 2 && lows.length >= 2) {
    const hhhl = lastHigh.price > prevHigh.price && lastLow.price > prevLow.price;
    const lhll = lastHigh.price < prevHigh.price && lastLow.price < prevLow.price;
    trend = hhhl ? 'UPTREND' : lhll ? 'DOWNTREND' : 'RANGE';
  }
  return { sequence, trend, lastHigh, lastLow, prevHigh, prevLow };
}

/** Equal highs / lows: two swing points within `tolerance` (price units). */
export function equalLevels(swings: SwingPoint[], tolerance: number) {
  const eqHighs: number[] = [];
  const eqLows: number[] = [];
  const highs = swings.filter((s) => s.type === 'high');
  const lows = swings.filter((s) => s.type === 'low');
  for (let i = 0; i < highs.length; i++)
    for (let j = i + 1; j < highs.length; j++)
      if (Math.abs(highs[i].price - highs[j].price) <= tolerance) eqHighs.push(highs[i].price);
  for (let i = 0; i < lows.length; i++)
    for (let j = i + 1; j < lows.length; j++)
      if (Math.abs(lows[i].price - lows[j].price) <= tolerance) eqLows.push(lows[i].price);
  return { equalHighs: eqHighs, equalLows: eqLows };
}

/**
 * Support / resistance from confirmed swing clusters.
 * Levels within `tolerance` are merged; returns levels nearest to `price`.
 */
export function keyLevels(swings: SwingPoint[], price: number, tolerance: number, maxEach = 3) {
  const cluster = (pts: number[]) => {
    const sorted = [...pts].sort((a, b) => a - b);
    const groups: number[][] = [];
    for (const p of sorted) {
      const g = groups[groups.length - 1];
      if (g && Math.abs(p - g[g.length - 1]) <= tolerance) g.push(p);
      else groups.push([p]);
    }
    return groups
      .map((g) => ({ price: g.reduce((a, b) => a + b, 0) / g.length, touches: g.length }))
      .filter((l) => l.touches >= 1);
  };
  const highs = cluster(swings.filter((s) => s.type === 'high').map((s) => s.price));
  const lows = cluster(swings.filter((s) => s.type === 'low').map((s) => s.price));
  const resistance = highs
    .filter((l) => l.price > price)
    .sort((a, b) => a.price - b.price)
    .slice(0, maxEach)
    .map((l) => l.price);
  const support = lows
    .filter((l) => l.price < price)
    .sort((a, b) => b.price - a.price)
    .slice(0, maxEach)
    .map((l) => l.price);
  return { support, resistance };
}

/** Fair value gap (3-candle): bullish if candle[i-2].high < candle[i].low. */
export interface FVG {
  index: number;
  time: number;
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
}

export function findFVGs(candles: Candle[]): FVG[] {
  const out: FVG[] = [];
  for (let i = 2; i < candles.length; i++) {
    const a = candles[i - 2];
    const c = candles[i];
    if (a.high < c.low) out.push({ index: i - 1, time: candles[i - 1].time, type: 'bullish', top: c.low, bottom: a.high });
    else if (a.low > c.high) out.push({ index: i - 1, time: candles[i - 1].time, type: 'bearish', top: a.low, bottom: c.high });
  }
  return out;
}
