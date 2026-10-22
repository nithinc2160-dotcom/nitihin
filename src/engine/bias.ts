import type { Candle, Bias, Evidence, Timeframe, TimeframeAnalysis } from './types';
import { ema, rsi, macd, atr, adx, bollinger, last } from './indicators';
import { findSwings, classifyStructure, keyLevels } from './structure';

/** Minimum closed candles needed for a reliable reading on each timeframe. */
export const MIN_CANDLES = 210;

export const BIAS_RULES = {
  emaFast: 50,
  emaSlow: 200,
  rsiPeriod: 14,
  adxPeriod: 14,
  adxTrend: 20,
  swingLookback: 3,
  rsiBullAbove: 55,
  rsiBearBelow: 45,
  /** Needs this many bullish (or bearish) factors out of the scored set to classify. */
  minNetScore: 3,
} as const;

/**
 * Deterministic, rules-based bias classification for a single timeframe.
 * Only uses candles supplied (assumed closed). Returns NEUTRAL with an explanation when
 * data is insufficient rather than guessing.
 */
export function analyseTimeframe(timeframe: Timeframe, candles: Candle[]): TimeframeAnalysis {
  const base = {
    timeframe,
    candleCount: candles.length,
    lastCandleTime: candles.length ? candles[candles.length - 1].time : 0,
  };
  if (candles.length < MIN_CANDLES) {
    return {
      ...base,
      bias: 'NEUTRAL',
      price: candles.length ? candles[candles.length - 1].close : NaN,
      trend: 'Insufficient data',
      structure: 'Insufficient data',
      momentum: 'Insufficient data',
      supportLevels: [],
      resistanceLevels: [],
      indicators: {},
      evidence: [],
      summary: `Only ${candles.length} closed candles available; ${MIN_CANDLES} are required for a reliable reading.`,
      sufficient: false,
    };
  }

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const ema50 = last(ema(closes, BIAS_RULES.emaFast));
  const ema200 = last(ema(closes, BIAS_RULES.emaSlow));
  const rsiVal = last(rsi(closes, BIAS_RULES.rsiPeriod));
  const m = macd(closes);
  const macdLine = last(m.line);
  const macdSig = last(m.signal);
  const atrVal = last(atr(candles, 14));
  const adxVal = last(adx(candles, BIAS_RULES.adxPeriod));
  const bb = bollinger(closes, 20, 2);
  const bbMid = last(bb.mid);
  const bbUp = last(bb.upper);
  const bbLo = last(bb.lower);

  const swings = findSwings(candles, BIAS_RULES.swingLookback);
  const structure = classifyStructure(swings);
  const atrNum = atrVal ?? 0;
  const { support, resistance } = keyLevels(swings, price, Math.max(atrNum * 0.5, price * 0.0005));

  const evidence: Evidence[] = [];
  let score = 0;
  const add = (factor: string, reading: string, dir: 'bullish' | 'bearish' | 'neutral') => {
    evidence.push({ factor, reading, weight: dir });
    if (dir === 'bullish') score += 1;
    if (dir === 'bearish') score -= 1;
  };

  // 1. Moving-average position
  if (ema50 !== null && ema200 !== null) {
    if (price > ema50 && price > ema200 && ema50 > ema200)
      add('Moving averages', `Price above EMA50 (${ema50.toFixed(5)}) and EMA200 (${ema200.toFixed(5)}), EMA50 above EMA200`, 'bullish');
    else if (price < ema50 && price < ema200 && ema50 < ema200)
      add('Moving averages', `Price below EMA50 (${ema50.toFixed(5)}) and EMA200 (${ema200.toFixed(5)}), EMA50 below EMA200`, 'bearish');
    else add('Moving averages', 'Mixed alignment between price, EMA50 and EMA200', 'neutral');
  }

  // 2. Market structure
  if (structure.trend === 'UPTREND') add('Market structure', 'Confirmed higher highs and higher lows', 'bullish');
  else if (structure.trend === 'DOWNTREND') add('Market structure', 'Confirmed lower highs and lower lows', 'bearish');
  else add('Market structure', `Structure is ${structure.trend.toLowerCase()} (no clear HH/HL or LH/LL sequence)`, 'neutral');

  // 3. Momentum
  if (rsiVal !== null) {
    if (rsiVal >= BIAS_RULES.rsiBullAbove) add('RSI momentum', `RSI ${rsiVal.toFixed(1)} above ${BIAS_RULES.rsiBullAbove}`, 'bullish');
    else if (rsiVal <= BIAS_RULES.rsiBearBelow) add('RSI momentum', `RSI ${rsiVal.toFixed(1)} below ${BIAS_RULES.rsiBearBelow}`, 'bearish');
    else add('RSI momentum', `RSI ${rsiVal.toFixed(1)} is in the neutral zone`, 'neutral');
  }
  if (macdLine !== null && macdSig !== null) {
    if (macdLine > macdSig && macdLine > 0) add('MACD', 'MACD above signal and above zero', 'bullish');
    else if (macdLine < macdSig && macdLine < 0) add('MACD', 'MACD below signal and below zero', 'bearish');
    else add('MACD', 'MACD has no clear directional alignment', 'neutral');
  }

  // 4. Trend strength (ADX) – modulates confidence, not direction
  const trending = adxVal !== null && adxVal >= BIAS_RULES.adxTrend;
  if (adxVal !== null)
    evidence.push({
      factor: 'Trend strength (ADX)',
      reading: `ADX ${adxVal.toFixed(1)} — ${trending ? 'trending' : 'weak / ranging'}`,
      weight: 'neutral',
    });

  // 5. Bollinger position
  if (bbMid !== null && bbUp !== null && bbLo !== null) {
    if (price > bbMid && price < bbUp) add('Bollinger Bands', 'Price in upper half of bands', 'bullish');
    else if (price < bbMid && price > bbLo) add('Bollinger Bands', 'Price in lower half of bands', 'bearish');
    else add('Bollinger Bands', 'Price at a band extreme — possible overextension', 'neutral');
  }

  let bias: Bias = 'NEUTRAL';
  if (score >= BIAS_RULES.minNetScore && trending) bias = 'BULLISH';
  else if (score <= -BIAS_RULES.minNetScore && trending) bias = 'BEARISH';

  const trendLabel = structure.trend === 'INSUFFICIENT' ? 'Insufficient swing data' : structure.trend.toLowerCase();
  const momentumLabel =
    rsiVal === null ? 'n/a' : rsiVal >= 55 ? 'positive' : rsiVal <= 45 ? 'negative' : 'neutral';

  const summary =
    bias === 'NEUTRAL'
      ? `NEUTRAL: net factor score ${score} with ${trending ? 'trending' : 'weak'} ADX — no sufficiently clear directional evidence.`
      : `${bias}: ${evidence.filter((e) => e.weight === (bias === 'BULLISH' ? 'bullish' : 'bearish')).length} supporting factors vs ${evidence.filter((e) => e.weight === (bias === 'BULLISH' ? 'bearish' : 'bullish')).length} opposing; trend ${trendLabel}.`;

  return {
    ...base,
    bias,
    price,
    trend: trendLabel,
    structure: structure.trend.toLowerCase(),
    momentum: momentumLabel,
    supportLevels: support,
    resistanceLevels: resistance,
    indicators: {
      EMA50: ema50,
      EMA200: ema200,
      RSI14: rsiVal,
      MACD: macdLine,
      MACDSignal: macdSig,
      ATR14: atrVal,
      ADX14: adxVal,
      BBUpper: bbUp,
      BBLower: bbLo,
    },
    evidence,
    summary,
    sufficient: true,
  };
}
