import type { Candle, Instrument, TimeframeAnalysis, TradeSetup } from './types';
import { atr, last } from './indicators';
import { findSwings, classifyStructure, keyLevels } from './structure';

export const SETUP_RULES = {
  /** Entry requires a close beyond the level (confirmed breakout) followed by a retest within N candles. */
  retestWindow: 12,
  /** Retest tolerance as fraction of ATR. */
  retestTolAtr: 0.25,
  /** Stop buffer beyond invalidation point, in ATR. */
  stopBufferAtr: 0.2,
  /** Minimum reward-to-risk on TP1 for a setup to be accepted. */
  minRR: 1.5,
  /** Take-profit multiples of risk. */
  tpMultiples: [1.5, 2.5, 3.5],
  /** Setup expires after this many candles of the entry timeframe without triggering. */
  expiryCandles: 20,
} as const;

export interface SetupDecision {
  state: 'BUY SETUP' | 'SELL SETUP' | 'WAIT' | 'NO VALID SETUP' | 'DATA UNAVAILABLE';
  reason: string;
  setup?: TradeSetup;
}

/** Round to instrument's tick precision. */
export function roundToTick(price: number, inst: Instrument): number {
  const decimals = Math.max(0, Math.ceil(-Math.log10(inst.pipSize)) + 1);
  return Number(price.toFixed(decimals));
}

/**
 * Evaluate a setup on the entry timeframe, aligned to the higher-timeframe bias.
 * Rules (documented):
 *  - HTF bias must be BULLISH (for BUY) or BEARISH (for SELL). NEUTRAL => WAIT.
 *  - Entry TF structure must agree with direction.
 *  - Breakout: a closed candle beyond the most recent resistance (BUY) / support (SELL),
 *    followed within `retestWindow` by a retest of that level within `retestTolAtr * ATR`
 *    and a close back in the direction of the trade.
 *  - Entry = close of the confirming retest candle. Stop = beyond the retest candle's
 *    opposite extreme with an ATR buffer. TPs = risk multiples.
 *  - Reject if TP1 R:R < minRR or levels are mis-ordered.
 * Only closed candles are used.
 */
export function evaluateSetup(
  instrument: Instrument,
  entryCandles: Candle[],
  htf: TimeframeAnalysis[],
  nowMs: number = Date.now(),
): SetupDecision {
  if (entryCandles.length < 60) return { state: 'DATA UNAVAILABLE', reason: 'Not enough entry-timeframe candles.' };

  const dirFromHtf = htfConsensus(htf);
  if (dirFromHtf === 'NEUTRAL')
    return {
      state: 'WAIT',
      reason: 'Higher timeframes do not agree on a direction. A bias alone is not a trade — waiting for alignment.',
    };

  const dir: 'BUY' | 'SELL' = dirFromHtf === 'BULLISH' ? 'BUY' : 'SELL';
  const atrArr = atr(entryCandles, 14);
  const atrVal = last(atrArr);
  if (atrVal === null || atrVal === undefined || atrVal <= 0)
    return { state: 'DATA UNAVAILABLE', reason: 'ATR could not be computed.' };

  const swings = findSwings(entryCandles, 3);
  const structure = classifyStructure(swings);
  const price = entryCandles[entryCandles.length - 1].close;
  const { support, resistance } = keyLevels(swings, price, Math.max(atrVal * 0.5, price * 0.0005));

  // Structure must agree on the entry timeframe.
  if (dir === 'BUY' && structure.trend !== 'UPTREND')
    return { state: 'WAIT', reason: `HTF is bullish but entry timeframe structure is ${structure.trend.toLowerCase()}. Waiting for confirmation.` };
  if (dir === 'SELL' && structure.trend !== 'DOWNTREND')
    return { state: 'WAIT', reason: `HTF is bearish but entry timeframe structure is ${structure.trend.toLowerCase()}. Waiting for confirmation.` };

  // Find most recent breakout level (last swing high for BUY, last swing low for SELL).
  const relevantSwings = swings.filter((s) => (dir === 'BUY' ? s.type === 'high' : s.type === 'low'));
  const level = relevantSwings[relevantSwings.length - 1];
  if (!level) return { state: 'WAIT', reason: 'No recent swing level to trade a breakout from.' };

  const n = entryCandles.length;
  const tol = atrVal * SETUP_RULES.retestTolAtr;
  let breakoutIdx = -1;
  for (let i = level.index + 1; i < n; i++) {
    const c = entryCandles[i];
    if (dir === 'BUY' ? c.close > level.price : c.close < level.price) {
      breakoutIdx = i;
      break;
    }
  }
  if (breakoutIdx < 0) return { state: 'WAIT', reason: `No confirmed close beyond the ${dir === 'BUY' ? 'resistance' : 'support'} at ${level.price}.` };

  // Retest after breakout, within window, with close back in trade direction.
  let retestIdx = -1;
  for (let i = breakoutIdx + 1; i < Math.min(n, breakoutIdx + 1 + SETUP_RULES.retestWindow); i++) {
    const c = entryCandles[i];
    const touched = dir === 'BUY' ? c.low <= level.price + tol : c.high >= level.price - tol;
    const holds = dir === 'BUY' ? c.close > level.price : c.close < level.price;
    if (touched && holds) {
      retestIdx = i;
      break;
    }
  }
  if (retestIdx < 0) return { state: 'WAIT', reason: 'Breakout confirmed but no valid retest yet. Waiting for price to return to the broken level.' };

  // Setup must still be fresh: retest must be among the last `expiryCandles`.
  const age = n - 1 - retestIdx;
  if (age > SETUP_RULES.expiryCandles)
    return { state: 'NO VALID SETUP', reason: `Retest occurred ${age} candles ago — setup has expired.` };

  const rc = entryCandles[retestIdx];
  const entry = roundToTick(rc.close, instrument);
  const buffer = atrVal * SETUP_RULES.stopBufferAtr;
  const rawStop = dir === 'BUY' ? Math.min(rc.low, level.price) - buffer : Math.max(rc.high, level.price) + buffer;
  const stopLoss = roundToTick(rawStop, instrument);
  const risk = Math.abs(entry - stopLoss);
  if (risk <= 0) return { state: 'NO VALID SETUP', reason: 'Calculated risk distance is zero.' };

  const takeProfits = SETUP_RULES.tpMultiples.map((m) =>
    roundToTick(dir === 'BUY' ? entry + risk * m : entry - risk * m, instrument),
  );
  const riskReward = takeProfits.map((tp) => Number((Math.abs(tp - entry) / risk).toFixed(2)));

  // Validation: ordering and direction.
  const orderOk =
    dir === 'BUY'
      ? stopLoss < entry && takeProfits.every((t, i) => t > entry && (i === 0 || t > takeProfits[i - 1]))
      : stopLoss > entry && takeProfits.every((t, i) => t < entry && (i === 0 || t < takeProfits[i - 1]));
  if (!orderOk) return { state: 'NO VALID SETUP', reason: 'Level ordering failed validation.' };
  if (riskReward[0] < SETUP_RULES.minRR)
    return {
      state: 'NO VALID SETUP',
      reason: `TP1 reward-to-risk ${riskReward[0]} is below the minimum ${SETUP_RULES.minRR}.`,
    };

  const setup: TradeSetup = {
    id: `${instrument.symbol}-${dir}-${rc.time}`,
    symbol: instrument.symbol,
    direction: dir,
    entryZone: [roundToTick(Math.min(entry, level.price), instrument), roundToTick(Math.max(entry, level.price), instrument)],
    entry,
    stopLoss,
    takeProfits,
    riskReward,
    rationale: [
      `HTF consensus is ${dirFromHtf.toLowerCase()}.`,
      `Confirmed close beyond ${dir === 'BUY' ? 'resistance' : 'support'} at ${level.price.toFixed(instrument.pipSize < 0.01 ? 5 : 2)}.`,
      `Retest of the broken level with a close back in trade direction.`,
    ],
    invalidation: [
      `A close ${dir === 'BUY' ? 'below' : 'above'} ${stopLoss} invalidates the setup.`,
      `Setup expires if not triggered within ${SETUP_RULES.expiryCandles} candles.`,
    ],
    createdAt: nowMs,
    status: 'ACTIVE',
  };
  return { state: dir === 'BUY' ? 'BUY SETUP' : 'SELL SETUP', reason: 'All rules satisfied.', setup };
}

/** Consensus across the configured higher timeframes. Unanimous-or-majority-with-no-opposition. */
export function htfConsensus(htf: TimeframeAnalysis[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  const usable = htf.filter((h) => h.sufficient);
  if (usable.length === 0) return 'NEUTRAL';
  const bulls = usable.filter((h) => h.bias === 'BULLISH').length;
  const bears = usable.filter((h) => h.bias === 'BEARISH').length;
  if (bulls > 0 && bears === 0 && bulls >= Math.ceil(usable.length / 2)) return 'BULLISH';
  if (bears > 0 && bulls === 0 && bears >= Math.ceil(usable.length / 2)) return 'BEARISH';
  return 'NEUTRAL';
}

/** Risk / position sizing. Contract specs must be supplied; returns null if not reliable. */
export function positionSize(
  instrument: Instrument,
  entry: number,
  stop: number,
  accountBalance: number,
  riskPct: number,
): { units: number; lots: number; riskMoney: number; pipDistance: number } | null {
  if (!(accountBalance > 0) || !(riskPct > 0)) return null;
  const pipDistance = Math.abs(entry - stop) / instrument.pipSize;
  if (pipDistance <= 0 || !instrument.pipValuePerLot) return null;
  const riskMoney = accountBalance * (riskPct / 100);
  const lots = riskMoney / (pipDistance * instrument.pipValuePerLot);
  return { units: lots * instrument.contractSize, lots: Number(lots.toFixed(2)), riskMoney, pipDistance };
}
