import type { Instrument, Timeframe } from './types';

/**
 * Pip value per standard lot is approximate and quote-currency dependent; the risk
 * calculator recomputes using the instrument spec and flags it as an estimate.
 * Treat values as configuration to verify against your broker.
 */
export const INSTRUMENTS: Instrument[] = [
  { symbol: 'EUR/USD', label: 'Euro / US Dollar', assetClass: 'forex', pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000 },
  { symbol: 'GBP/USD', label: 'British Pound / US Dollar', assetClass: 'forex', pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000 },
  { symbol: 'USD/JPY', label: 'US Dollar / Japanese Yen', assetClass: 'forex', pipSize: 0.01, pipValuePerLot: 9, contractSize: 100000 },
  { symbol: 'AUD/USD', label: 'Australian Dollar / US Dollar', assetClass: 'forex', pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000 },
  { symbol: 'USD/CAD', label: 'US Dollar / Canadian Dollar', assetClass: 'forex', pipSize: 0.0001, pipValuePerLot: 7.5, contractSize: 100000 },
  { symbol: 'USD/CHF', label: 'US Dollar / Swiss Franc', assetClass: 'forex', pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000 },
  { symbol: 'NZD/USD', label: 'New Zealand Dollar / US Dollar', assetClass: 'forex', pipSize: 0.0001, pipValuePerLot: 10, contractSize: 100000 },
  { symbol: 'XAU/USD', label: 'Gold / US Dollar', assetClass: 'metal', pipSize: 0.1, pipValuePerLot: 10, contractSize: 100 },
  { symbol: 'BTC/USD', label: 'Bitcoin / US Dollar', assetClass: 'crypto', pipSize: 1, pipValuePerLot: 1, contractSize: 1 },
];

export const TIMEFRAMES: { value: Timeframe; label: string; seconds: number }[] = [
  { value: '1m', label: '1M', seconds: 60 },
  { value: '3m', label: '3M', seconds: 180 },
  { value: '5m', label: '5M', seconds: 300 },
  { value: '15m', label: '15M', seconds: 900 },
  { value: '30m', label: '30M', seconds: 1800 },
  { value: '1h', label: '1H', seconds: 3600 },
  { value: '4h', label: '4H', seconds: 14400 },
  { value: '1d', label: '1D', seconds: 86400 },
  { value: '1w', label: '1W', seconds: 604800 },
];

/** Default framework: higher TFs set context, lower TFs confirm entries. */
export const DEFAULT_HTF: Timeframe[] = ['1d', '4h', '1h'];
export const DEFAULT_ENTRY_TF: Timeframe = '15m';
