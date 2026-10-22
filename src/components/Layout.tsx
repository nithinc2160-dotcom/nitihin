import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, LineChart, Layers, Radar, BookOpen, BarChart3, FlaskConical,
  Bot, Info, Settings as SettingsIcon, Menu, X,
} from 'lucide-react';
import { useState } from 'react';
import Logo from './Logo';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/analysis', label: 'Live Analysis', icon: LineChart },
  { to: '/mtf', label: 'Multi-Timeframe', icon: Layers },
  { to: '/scanner', label: 'Setup Scanner', icon: Radar },
  { to: '/journal', label: 'Trading Journal', icon: BookOpen },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/backtest', label: 'Backtesting', icon: FlaskConical },
  { to: '/assistant', label: 'AI Assistant', icon: Bot },
  { to: '/about', label: 'About', icon: Info },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-full flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-white/[0.06] bg-ink-900/60 backdrop-blur-sm sticky top-0 h-screen">
        <div className="px-5 py-5"><Logo /></div>
        <nav className="flex-1 px-3 space-y-1" aria-label="Main">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyanx/60 ${
                  isActive ? 'bg-violet-neon/15 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`
              }
            >
              <n.icon size={16} aria-hidden /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 text-[11px] text-slate-600">Analytical tool — not financial advice.</div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-ink-900/90 backdrop-blur border-b border-white/[0.06]">
        <Logo />
        <button className="btn-ghost !p-2" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-30 bg-ink-950/95 pt-16 px-4" onClick={() => setOpen(false)}>
          <nav className="space-y-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className="flex items-center gap-3 rounded-lg px-3 py-3 text-slate-200 hover:bg-white/5">
                <n.icon size={16} aria-hidden /> {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
