import { useState } from 'react';
import { THINKQUIP_LOGO_TURQUOISE } from '../data/machinesConfig';
import './LoginScreen.css';

/** Shared turquoise-field / white-card shell for every pre-app auth screen. */
function AuthShell({ children }) {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img className="auth-card__logo" src={THINKQUIP_LOGO_TURQUOISE} alt="ThinkQuip" />
        <p className="auth-card__eyebrow">Authorized SANY Distributor</p>
        {children}
      </div>
    </div>
  );
}

/**
 * The login gate. The calculator is only reachable once a salesman is signed in.
 * `onSignIn(email, password)` resolves to { ok } or { ok: false, message } —
 * the message is already a friendly line (no raw error objects reach the user).
 */
export default function LoginScreen({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy || !email.trim() || !password) return;
    setBusy(true);
    setError(null);
    const result = await onSignIn(email, password);
    // On success this component unmounts (the app takes over), so only reset
    // the busy state when the sign-in actually failed.
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="auth-card__title">Salesman Sign In</h1>
      <p className="auth-card__lede">
        Sign in to use the ThinkQuip TCO Calculator. Your quotes are prepared under your
        profile.
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span className="auth-field__label">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@thinkquip.co.za"
          />
        </label>

        <label className="auth-field">
          <span className="auth-field__label">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-cta auth-submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </AuthShell>
  );
}

/**
 * A blocking notice for the states where we must NOT proceed into the app —
 * e.g. signed in but no `salesman` profile row, or missing Supabase config.
 * We never fall back to placeholder "Prepared By" details.
 */
export function AuthNotice({ title, message, onSignOut }) {
  return (
    <AuthShell>
      <h1 className="auth-card__title">{title}</h1>
      <p className="auth-notice" role="alert">
        {message}
      </p>
      {onSignOut && (
        <button type="button" className="btn-cta auth-submit" onClick={onSignOut}>
          Back to Sign In
        </button>
      )}
    </AuthShell>
  );
}

/** Full-screen splash while the stored session is restored. */
export function AuthLoading() {
  return (
    <AuthShell>
      <p className="auth-notice auth-notice--muted">Signing you in…</p>
    </AuthShell>
  );
}
