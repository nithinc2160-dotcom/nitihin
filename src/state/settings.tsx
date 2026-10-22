import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Timeframe } from '../engine/types';
import { DEFAULT_HTF, DEFAULT_ENTRY_TF } from '../engine/instruments';

export interface Settings {
  instrument: string;
  entryTf: Timeframe;
  htfs: Timeframe[];
  accountBalance: number;
  accountCurrency: string;
  riskPct: number;
  minRR: number;
  timezone: string;
  assistantAutoOpen: boolean;
  reducedEffects: boolean;
  avatarStyle: 'human' | 'abstract';
  notifications: boolean;
}

const DEFAULTS: Settings = {
  instrument: 'EUR/USD',
  entryTf: DEFAULT_ENTRY_TF,
  htfs: DEFAULT_HTF,
  accountBalance: 10000,
  accountCurrency: 'USD',
  riskPct: 1,
  minRR: 1.5,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  assistantAutoOpen: false,
  reducedEffects: false,
  avatarStyle: 'human',
  notifications: true,
};

const KEY = 'zorvex.settings.v1';

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(settings));
  }, [settings]);
  const value = useMemo(
    () => ({ settings, update: (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p })) }),
    [settings],
  );
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
