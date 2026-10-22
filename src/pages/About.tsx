import { Card } from '../components/ui';

/** Team profiles are editable placeholders — no biographies or credentials are invented. */
const TEAM = [
  { alias: 'NXIN', role: 'Role to be added', bio: 'Add a short biography here.' },
  { alias: 'YUCHI.WJ', role: 'Role to be added', bio: 'Add a short biography here.' },
  { alias: 'KRTN', role: 'Role to be added', bio: 'Add a short biography here.' },
];

export default function About() {
  return (
    <div className="space-y-8">
      <header>
        <p className="label">About</p>
        <h1 className="text-2xl font-semibold text-white tracking-tight mt-1">ZORVEX PRO</h1>
        <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
          A trading analysis, journaling and AI-assisted learning platform. It reads real candles, applies documented rules across
          timeframes, and explains why it does or does not see a setup. It is an analytical tool; it never places trades.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-3">
        <Card title="Mission"><p className="text-sm text-slate-400">Make risk, evidence and discipline the centre of every trading decision.</p></Card>
        <Card title="Vision"><p className="text-sm text-slate-400">A transparent analysis terminal where every signal shows its evidence.</p></Card>
        <Card title="Future goals"><p className="text-sm text-slate-400">More data providers, validated backtests, and a voice-enabled assistant.</p></Card>
      </div>
      <div>
        <h2 className="label mb-3">Team</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {TEAM.map((m) => (
            <Card key={m.alias}>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-neon to-cyanx mb-3" aria-hidden />
              <div className="text-white font-semibold">{m.alias}</div>
              <div className="text-xs text-cyanx mt-0.5">{m.role}</div>
              <p className="text-sm text-slate-500 mt-3">{m.bio}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
