import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthProvider';
import { supabase } from '../lib/supabase';

export default function Login() {
  const { session, loading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const next = params.get('next') || '/quotations';

  if (!loading && session) return <Navigate to={next} replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'That email and password do not match an account.'
          : err.message,
      );
      return;
    }
    navigate(next, { replace: true });
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background:
          'radial-gradient(1200px 500px at 50% -10%, var(--color-gold-100), var(--color-desk) 60%)',
      }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/logo.svg" alt="" className="mb-3 h-14 w-14 object-contain" />
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-doc)' }}>
            AALI QUOTATION DESK
          </h1>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--color-ink-soft)' }}>
            Aali Conssultancy — a subsidiary of Aali Group
          </p>
        </div>

        <form onSubmit={onSubmit} className="card flex flex-col gap-4 p-5">
          <label className="flex flex-col gap-1.5">
            <span className="lbl">Email</span>
            <input
              className="fld"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="lbl">Password</span>
            <input
              className="fld"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && (
            <p className="rounded-lg px-3 py-2 text-[12.5px]"
              style={{ background: '#fbeceb', color: '#8f2a2a', border: '1px solid #f0cfcd' }}>
              {error}
            </p>
          )}

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-[11.5px]" style={{ color: 'var(--color-ink-soft)' }}>
            Accounts are created by a super admin. Ask for one if you do not have a login.
          </p>
        </form>
      </div>
    </div>
  );
}
