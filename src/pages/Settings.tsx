import { Card } from '../components/ui';
import { useSettings } from '../state/settings';
import { INSTRUMENTS, TIMEFRAMES } from '../engine/instruments';

export default function Settings() {
  const { settings: s, update } = useSettings();
  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <p className="label">Preferences</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight mt-1">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Stored on this device. API keys are configured on the server, never here.</p>
      </header>

      <Card title="Analysis">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Default instrument">
            <select className="input" value={s.instrument} onChange={(e) => update({ instrument: e.target.value })}>
              {INSTRUMENTS.map((i) => <option key={i.symbol}>{i.symbol}</option>)}
            </select>
          </Field>
          <Field label="Entry timeframe">
            <select className="input" value={s.entryTf} onChange={(e) => update({ entryTf: e.target.value as never })}>
              {TIMEFRAMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Minimum reward-to-risk">
            <input type="number" step="0.1" min="1" className="input num" value={s.minRR} onChange={(e) => update({ minRR: Number(e.target.value) })} />
          </Field>
        </div>
      </Card>

      <Card title="Risk management">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Account balance">
            <input type="number" className="input num" value={s.accountBalance} onChange={(e) => update({ accountBalance: Number(e.target.value) })} />
          </Field>
          <Field label="Currency">
            <input className="input" value={s.accountCurrency} onChange={(e) => update({ accountCurrency: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Risk per trade (%)">
            <input type="number" step="0.1" className="input num" value={s.riskPct} onChange={(e) => update({ riskPct: Number(e.target.value) })} />
          </Field>
        </div>
      </Card>

      <Card title="Assistant & display">
        <div className="space-y-4">
          <Toggle label="Open assistant automatically" checked={s.assistantAutoOpen} onChange={(v) => update({ assistantAutoOpen: v })} />
          <Toggle label="Reduced effects" checked={s.reducedEffects} onChange={(v) => update({ reducedEffects: v })} />
          <Toggle label="Setup notifications" checked={s.notifications} onChange={(v) => update({ notifications: v })} />
          <Field label="Avatar style">
            <select className="input !w-auto" value={s.avatarStyle} onChange={(e) => update({ avatarStyle: e.target.value as 'human' | 'abstract' })}>
              <option value="human">Holographic human</option>
              <option value="abstract">Abstract digital entity</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card title="Market data">
        <p className="text-sm text-slate-400 leading-relaxed">
          Candles come from the server-side market proxy. Set <code className="num text-cyanx">MARKET_API_KEY</code> in your server environment
          (see README). Without it, the app shows the feed as not configured and disables fresh signals.
        </p>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="label">{label}</span>{children}</label>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span className="text-sm text-slate-300">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-violet-500" />
    </label>
  );
}
