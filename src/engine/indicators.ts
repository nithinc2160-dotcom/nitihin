import type { Candle } from './types';

/** All functions return arrays aligned with input; leading values that lack enough data are null. */

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  let prev = seed / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's RSI. */
export function rsi(closes: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/** MACD line, signal line and histogram. */
export function macd(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const line: (number | null)[] = closes.map((_, i) =>
    emaFast[i] !== null && emaSlow[i] !== null ? (emaFast[i] as number) - (emaSlow[i] as number) : null,
  );
  const firstIdx = line.findIndex((v) => v !== null);
  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  if (firstIdx >= 0) {
    const compact = line.slice(firstIdx) as number[];
    const sig = ema(compact, signal);
    sig.forEach((v, j) => {
      signalLine[firstIdx + j] = v;
    });
  }
  const hist = line.map((v, i) => (v !== null && signalLine[i] !== null ? v - (signalLine[i] as number) : null));
  return { line, signal: signalLine, histogram: hist };
}

/** Average True Range (Wilder). */
export function atr(candles: Candle[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return out;
  const tr: number[] = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const pc = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc));
  });
  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i];
  let prev = sum / period;
  out[period] = prev;
  for (let i = period + 1; i < candles.length; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

/** Average Directional Index (Wilder). */
export function adx(candles: Candle[], period = 14): (number | null)[] {
  const n = candles.length;
  const out: (number | null)[] = new Array(n).fill(null);
  if (n <= period * 2) return out;
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  const tr: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < n; i++) {
    const up = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low - candles[i].low;
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
    tr.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close),
      ),
    );
  }
  let sTr = 0;
  let sP = 0;
  let sM = 0;
  for (let i = 1; i <= period; i++) {
    sTr += tr[i];
    sP += plusDM[i];
    sM += minusDM[i];
  }
  const dx: number[] = new Array(n).fill(NaN);
  const calcDx = (p: number, m: number, t: number) => {
    const pdi = t === 0 ? 0 : (100 * p) / t;
    const mdi = t === 0 ? 0 : (100 * m) / t;
    const s = pdi + mdi;
    return s === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / s;
  };
  dx[period] = calcDx(sP, sM, sTr);
  for (let i = period + 1; i < n; i++) {
    sTr = sTr - sTr / period + tr[i];
    sP = sP - sP / period + plusDM[i];
    sM = sM - sM / period + minusDM[i];
    dx[i] = calcDx(sP, sM, sTr);
  }
  let adxPrev = 0;
  for (let i = period; i < 2 * period; i++) adxPrev += dx[i];
  adxPrev /= period;
  out[2 * period - 1] = adxPrev;
  for (let i = 2 * period; i < n; i++) {
    adxPrev = (adxPrev * (period - 1) + dx[i]) / period;
    out[i] = adxPrev;
  }
  return out;
}

/** Bollinger Bands (population std dev). */
export function bollinger(closes: number[], period = 20, mult = 2) {
  const mid = sma(closes, period);
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    const m = mid[i] as number;
    let v = 0;
    for (let j = i - period + 1; j <= i; j++) v += (closes[j] - m) ** 2;
    const sd = Math.sqrt(v / period);
    upper[i] = m + mult * sd;
    lower[i] = m - mult * sd;
  }
  return { mid, upper, lower };
}

/** Last element of an indicator series, normalised to `null` when empty or not yet computed. */
export function last<T>(arr: T[]): T | null {
  const v = arr[arr.length - 1];
  return v === undefined ? null : v;
}
