import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import type { Candle, TradeSetup } from '../../engine/types';
import { ema } from '../../engine/indicators';

interface Props {
  candles: Candle[];
  setup?: TradeSetup | null;
  supportLevels?: number[];
  resistanceLevels?: number[];
  showEma?: boolean;
  height?: number;
}

/**
 * Real OHLC candlesticks. Only receives the candles for the selected instrument/timeframe;
 * the parent clears candles on change so no previous instrument's data is shown.
 */
export default function CandleChart({ candles, setup, supportLevels = [], resistanceLevels = [], showEma = true, height = 460 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const emaRefs = useRef<ISeriesApi<'Line'>[]>([]);

  // Create chart once.
  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, {
      height,
      layout: { background: { color: 'transparent' }, textColor: '#94a3b8', fontFamily: 'Inter' },
      grid: { vertLines: { color: 'rgba(148,163,184,0.05)' }, horzLines: { color: 'rgba(148,163,184,0.05)' } },
      rightPriceScale: { borderColor: 'rgba(148,163,184,0.12)' },
      timeScale: { borderColor: 'rgba(148,163,184,0.12)', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
    });
    const series = chart.addCandlestickSeries({
      upColor: '#22c55e', downColor: '#ef4444', borderVisible: false,
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });
    const vol = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    chartRef.current = chart;
    seriesRef.current = series;
    volRef.current = vol;

    const onResize = () => chart.applyOptions({ width: ref.current?.clientWidth ?? 600 });
    onResize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volRef.current = null;
      emaRefs.current = [];
    };
  }, [height]);

  // Feed data.
  useEffect(() => {
    const series = seriesRef.current;
    const vol = volRef.current;
    const chart = chartRef.current;
    if (!series || !vol || !chart) return;

    series.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })));
    vol.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume ?? 0,
        color: c.close >= c.open ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
      })),
    );

    // EMA overlays
    emaRefs.current.forEach((s) => chart.removeSeries(s));
    emaRefs.current = [];
    if (showEma && candles.length > 50) {
      const closes = candles.map((c) => c.close);
      for (const [p, color] of [[20, '#22d3ee'], [50, '#a855ff']] as const) {
        const values = ema(closes, p);
        const line = chart.addLineSeries({ color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        line.setData(
          candles
            .map((c, i) => (values[i] !== null ? { time: c.time as UTCTimestamp, value: values[i] as number } : null))
            .filter((x): x is { time: UTCTimestamp; value: number } => x !== null),
        );
        emaRefs.current.push(line);
      }
    }

    const lines: Parameters<typeof series.createPriceLine>[0][] = [];
    const add = (price: number, color: string, title: string, style = 2) =>
      lines.push({ price, color, lineWidth: 1, lineStyle: style, axisLabelVisible: true, title });
    supportLevels.forEach((p) => add(p, '#22c55e', 'Support', 1));
    resistanceLevels.forEach((p) => add(p, '#ef4444', 'Resistance', 1));
    if (setup) {
      add(setup.entry, '#3b82f6', 'Entry', 0);
      add(setup.stopLoss, '#ef4444', 'SL', 0);
      setup.takeProfits.forEach((tp, i) => add(tp, '#22c55e', `TP${i + 1}`, 0));
    }
    lines.forEach((l) => series.createPriceLine(l));

    if (candles.length) chart.timeScale().fitContent();
  }, [candles, setup, supportLevels, resistanceLevels, showEma]);

  return <div ref={ref} className="w-full" />;
}
