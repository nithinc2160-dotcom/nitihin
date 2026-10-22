import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type TradeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface JournalTrade {
  id: string;
  instrument: string;
  direction: 'BUY' | 'SELL';
  tradeDate: string; // ISO
  session: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  exit?: number;
  positionSize?: number;
  riskMoney?: number;
  pnl?: number; // closed trades only
  strategy: string;
  status: TradeStatus;
  emotion: string;
  reasoning: string;
  technical: string;
  mistakes: string;
  lessons: string;
  tags: string[];
  notes: string;
  screenshots: { id: string; dataUrl: string; description: string }[];
}

const KEY = 'zorvex.journal.v1';

interface Ctx {
  trades: JournalTrade[];
  add: (t: Omit<JournalTrade, 'id'>) => string;
  update: (id: string, patch: Partial<JournalTrade>) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
}

const JournalCtx = createContext<Ctx | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [trades, setTrades] = useState<JournalTrade[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(trades));
  }, [trades]);

  const value = useMemo<Ctx>(
    () => ({
      trades,
      add: (t) => {
        const id = crypto.randomUUID();
        setTrades((ts) => [{ ...t, id }, ...ts]);
        return id;
      },
      update: (id, patch) => setTrades((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t))),
      remove: (id) => setTrades((ts) => ts.filter((t) => t.id !== id)),
      duplicate: (id) =>
        setTrades((ts) => {
          const src = ts.find((t) => t.id === id);
          if (!src) return ts;
          return [{ ...src, id: crypto.randomUUID(), screenshots: [], status: 'OPEN', pnl: undefined, exit: undefined }, ...ts];
        }),
    }),
    [trades],
  );
  return <JournalCtx.Provider value={value}>{children}</JournalCtx.Provider>;
}

export function useJournal() {
  const ctx = useContext(JournalCtx);
  if (!ctx) throw new Error('useJournal must be used inside JournalProvider');
  return ctx;
}
