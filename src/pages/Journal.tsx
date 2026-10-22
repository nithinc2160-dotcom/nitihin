import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Copy, Trash2, Search, ImagePlus, X, ZoomIn } from 'lucide-react';
import { Card, Empty } from '../components/ui';
import { useJournal, type JournalTrade } from '../state/journal';
import { INSTRUMENTS } from '../engine/instruments';

const blank: Omit<JournalTrade, 'id'> = {
  instrument: 'EUR/USD', direction: 'BUY', tradeDate: new Date().toISOString().slice(0, 16),
  session: 'London', entry: 0, stopLoss: 0, takeProfit: 0, strategy: 'Breakout & retest',
  status: 'OPEN', emotion: 'Calm', reasoning: '', technical: '', mistakes: '', lessons: '',
  tags: [], notes: '', screenshots: [],
};

const MAX_IMG_BYTES = 4 * 1024 * 1024;
const ACCEPT = ['image/png', 'image/jpeg', 'image/webp'];

export default function Journal() {
  const { trades, add, update, remove, duplicate } = useJournal();
  const [editing, setEditing] = useState<JournalTrade | Omit<JournalTrade, 'id'> | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | JournalTrade['status']>('ALL');

  const list = useMemo(
    () =>
      trades.filter(
        (t) =>
          (statusFilter === 'ALL' || t.status === statusFilter) &&
          (!query || `${t.instrument} ${t.strategy} ${t.tags.join(' ')} ${t.notes}`.toLowerCase().includes(query.toLowerCase())),
      ),
    [trades, query, statusFilter],
  );

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if ('id' in editing) update(editing.id, editing);
    else add(editing);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label">Diary</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight mt-1">Trading Journal</h1>
          <p className="text-sm text-slate-500 mt-1">Saved on this device. Account sync needs Supabase (see Settings).</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing({ ...blank })}><Plus size={14} /> New entry</button>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
          <input className="input pl-9" placeholder="Search instrument, strategy, tags…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input !w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as never)} aria-label="Status filter">
          <option value="ALL">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {list.length === 0 ? (
        <Empty title={trades.length ? 'No matching entries' : 'No entries yet'} body="Log a trade with its reasoning, levels and screenshots to build your record." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-white font-semibold">{t.instrument} <span className={t.direction === 'BUY' ? 'text-bull' : 'text-bear'}>{t.direction}</span></div>
                  <div className="text-xs text-slate-500 mt-0.5">{new Date(t.tradeDate).toLocaleString()} · {t.strategy}</div>
                </div>
                <span className="text-[11px] text-slate-400 border border-white/10 rounded px-2 py-0.5">{t.status}</span>
              </div>
              <div className="num text-xs text-slate-400 mt-3 grid grid-cols-3 gap-2">
                <span>Entry {t.entry}</span><span>SL {t.stopLoss}</span><span>TP {t.takeProfit}</span>
              </div>
              {t.reasoning && <p className="text-sm text-slate-400 mt-3 line-clamp-2">{t.reasoning}</p>}
              <div className="flex gap-2 mt-4">
                <button className="btn-ghost" onClick={() => setEditing(t)}>Edit</button>
                <button className="btn-ghost" onClick={() => duplicate(t.id)} aria-label="Duplicate"><Copy size={14} /></button>
                <button className="btn-ghost text-bear" onClick={() => remove(t.id)} aria-label="Delete"><Trash2 size={14} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Journal entry">
          <form onSubmit={save} className="glass w-full max-w-2xl max-h-[90vh] overflow-auto p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">{'id' in editing ? 'Edit entry' : 'New entry'}</h2>
              <button type="button" className="btn-ghost !p-2" onClick={() => setEditing(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Instrument">
                <select className="input" value={editing.instrument} onChange={(e) => setEditing({ ...editing, instrument: e.target.value })}>
                  {INSTRUMENTS.map((i) => <option key={i.symbol}>{i.symbol}</option>)}
                </select>
              </Field>
              <Field label="Direction">
                <select className="input" value={editing.direction} onChange={(e) => setEditing({ ...editing, direction: e.target.value as 'BUY' | 'SELL' })}>
                  <option>BUY</option><option>SELL</option>
                </select>
              </Field>
              <Field label="Trade date"><input type="datetime-local" className="input" value={editing.tradeDate.slice(0, 16)} onChange={(e) => setEditing({ ...editing, tradeDate: e.target.value })} /></Field>
              <Field label="Status">
                <select className="input" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as JournalTrade['status'] })}>
                  <option>OPEN</option><option>CLOSED</option><option>CANCELLED</option>
                </select>
              </Field>
              <NumField label="Entry" value={editing.entry} onChange={(v) => setEditing({ ...editing, entry: v })} />
              <NumField label="Stop-loss" value={editing.stopLoss} onChange={(v) => setEditing({ ...editing, stopLoss: v })} />
              <NumField label="Take-profit" value={editing.takeProfit} onChange={(v) => setEditing({ ...editing, takeProfit: v })} />
              <NumField label="Exit" value={editing.exit ?? 0} onChange={(v) => setEditing({ ...editing, exit: v || undefined })} />
              <NumField label="Realised P&L" value={editing.pnl ?? 0} onChange={(v) => setEditing({ ...editing, pnl: editing.status === 'CLOSED' ? v : undefined })} />
              <Field label="Strategy"><input className="input" value={editing.strategy} onChange={(e) => setEditing({ ...editing, strategy: e.target.value })} /></Field>
            </div>
            <Field label="Entry reasoning"><textarea className="input min-h-[70px]" value={editing.reasoning} onChange={(e) => setEditing({ ...editing, reasoning: e.target.value })} /></Field>
            <Field label="Mistakes"><textarea className="input min-h-[50px]" value={editing.mistakes} onChange={(e) => setEditing({ ...editing, mistakes: e.target.value })} /></Field>
            <Field label="Lessons learned"><textarea className="input min-h-[50px]" value={editing.lessons} onChange={(e) => setEditing({ ...editing, lessons: e.target.value })} /></Field>
            <Field label="Tags (comma separated)"><input className="input" value={editing.tags.join(', ')} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></Field>

            <Screenshots
              items={editing.screenshots}
              onChange={(screenshots) => setEditing({ ...editing, screenshots })}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn-primary">Save entry</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Screenshots({ items, onChange }: { items: JournalTrade['screenshots']; onChange: (s: JournalTrade['screenshots']) => void }) {
  const [zoom, setZoom] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    setErr(null);
    const next = [...items];
    for (const f of Array.from(files)) {
      if (!ACCEPT.includes(f.type)) { setErr(`${f.name}: use PNG, JPG or WebP.`); continue; }
      if (f.size > MAX_IMG_BYTES) { setErr(`${f.name}: larger than 4 MB.`); continue; }
      const dataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(f);
      });
      next.push({ id: crypto.randomUUID(), dataUrl, description: '' });
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="label">Chart screenshots</span>
        <label className="btn-ghost cursor-pointer">
          <ImagePlus size={14} /> Add images
          <input type="file" accept={ACCEPT.join(',')} multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
        </label>
      </div>
      {err && <p className="text-xs text-amber-300">{err}</p>}
      {items.map((s, i) => (
        <div key={s.id} className="rounded-lg border border-white/[0.06] p-3 space-y-2">
          <div className="relative">
            <img src={s.dataUrl} alt={s.description || `Screenshot ${i + 1}`} className="w-full max-h-64 object-contain rounded bg-ink-950" />
            <button type="button" className="btn-ghost !p-1.5 absolute top-2 right-2" onClick={() => setZoom(s.dataUrl)} aria-label="Zoom"><ZoomIn size={14} /></button>
          </div>
          <textarea
            className="input min-h-[60px]"
            placeholder="Describe the structure, why you entered, what confirmed it, and what you learned…"
            value={s.description}
            onChange={(e) => onChange(items.map((x) => (x.id === s.id ? { ...x, description: e.target.value } : x)))}
          />
          <button type="button" className="text-xs text-bear hover:underline" onClick={() => onChange(items.filter((x) => x.id !== s.id))}>Remove image</button>
        </div>
      ))}
      {zoom && (
        <div className="fixed inset-0 z-[60] bg-black/90 grid place-items-center p-4" onClick={() => setZoom(null)} role="dialog" aria-label="Zoomed screenshot">
          <img src={zoom} alt="Zoomed chart screenshot" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="label">{label}</span>{children}</label>;
}
function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <input type="number" step="any" className="input num" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );
}
