import type { JournalTrade } from '../state/journal';

/**
 * Win rate denominator = eligible closed trades (CLOSED status with a recorded P&L).
 * Break-even trades (pnl === 0) are counted separately and excluded from the win rate.
 */
export function computeStats(trades: JournalTrade[]) {
  const closed = trades.filter((t) => t.status === 'CLOSED' && typeof t.pnl === 'number');
  const wins = closed.filter((t) => (t.pnl as number) > 0);
  const losses = closed.filter((t) => (t.pnl as number) < 0);
  const be = closed.filter((t) => t.pnl === 0);
  const eligible = wins.length + losses.length;
  const grossWin = wins.reduce((s, t) => s + (t.pnl as number), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl as number), 0));
  const net = closed.reduce((s, t) => s + (t.pnl as number), 0);

  // Equity curve & max drawdown across closed trades in chronological order.
  const ordered = [...closed].sort((a, b) => new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime());
  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  const curve = ordered.map((t) => {
    equity += t.pnl as number;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, peak - equity);
    return { date: t.tradeDate, equity };
  });

  return {
    total: trades.length,
    closed: closed.length,
    wins: wins.length,
    losses: losses.length,
    breakEven: be.length,
    winRate: eligible > 0 ? (wins.length / eligible) * 100 : null,
    netPnl: net,
    avgWin: wins.length ? grossWin / wins.length : null,
    avgLoss: losses.length ? -grossLoss / losses.length : null,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    maxDrawdown: maxDd,
    curve,
  };
}
