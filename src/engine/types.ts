export interface Candle {
  time: number; // unix seconds (candle open time)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export type Bias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export type SetupState = 'BUY SETUP' | 'SELL SETUP' | 'WAIT' | 'NO VALID SETUP' | 'DATA UNAVAILABLE';

export interface Instrument {
  symbol: string; // provider symbol, e.g. "EUR/USD"
  label: string;
  assetClass: 'forex' | 'metal' | 'crypto';
  pipSize: number; // price increment of 1 pip / tick
  pipValuePerLot: number; // account-currency value per pip per standard lot (approx; see docs)
  contractSize: number; // units per standard lot
}

export interface Evidence {
  factor: string;
  reading: string;
  weight: 'bullish' | 'bearish' | 'neutral';
}

export interface TimeframeAnalysis {
  timeframe: Timeframe;
  bias: Bias;
  price: number;
  trend: string;
  structure: string;
  momentum: string;
  supportLevels: number[];
  resistanceLevels: number[];
  indicators: Record<string, number | null>;
  lastCandleTime: number;
  candleCount: number;
  evidence: Evidence[];
  summary: string;
  sufficient: boolean;
}

export interface TradeSetup {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryZone: [number, number];
  entry: number;
  stopLoss: number;
  takeProfits: number[];
  riskReward: number[];
  rationale: string[];
  invalidation: string[];
  createdAt: number;
  status: 'ACTIVE' | 'EXPIRED' | 'INVALIDATED';
}
