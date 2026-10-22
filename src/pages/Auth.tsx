import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

/**
 * Auth UI. Accounts require Supabase Auth; until it is connected the form does not create a session,
 * and the app runs in local (single-device) mode. No credentials are stored or faked here.
 */
export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [msg, setMsg] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMsg('Accounts are not connected yet. Connect Supabase to enable sign-in, password recovery and private per-user data.');
  };
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="glass w-full max-w-sm p-7 space-y-5">
        <Logo />
        <div>
          <h1 className="text-xl font-semibold text-white">{mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Reset password'}</h1>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input type="email" required className="input" placeholder="Email" aria-label="Email" />
          {mode !== 'reset' && <input type="password" required className="input" placeholder="Password" aria-label="Password" />}
          <button className="btn-primary w-full justify-center" type="submit">
            {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
          </button>
        </form>
        {msg && <p className="text-xs text-amber-300">{msg}</p>}
        <div className="flex justify-between text-xs text-slate-500">
          <button onClick={() => setMode('login')}>Sign in</button>
          <button onClick={() => setMode('register')}>Register</button>
          <button onClick={() => setMode('reset')}>Forgot password</button>
        </div>
        <Link to="/" className="block text-center text-xs text-cyanx">Continue in local mode →</Link>
      </div>
    </div>
  );
}
