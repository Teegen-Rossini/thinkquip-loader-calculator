import { useCallback, useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from './supabase';

/**
 * Salesman auth + profile.
 *
 * status:
 *   'loading'      — restoring the session / fetching the profile
 *   'signedOut'    — show the login screen
 *   'noProfile'    — signed in, but no `salesman` row for this user (explicit
 *                    error state — we never fall back to placeholder details)
 *   'ready'        — signed in AND profile loaded; `salesman` is populated
 *   'misconfigured'— the Supabase env vars are missing
 *
 * The session is persisted by Supabase itself, so a reload restores it without
 * a fresh login.
 */

const MESSAGES = {
  invalid: 'Incorrect email or password.',
  unconfirmed: "This account's email hasn't been confirmed yet — contact the administrator.",
  network: "We couldn't reach the login server. Check your connection and try again.",
  generic: 'Something went wrong signing you in. Please try again.',
  noProfile: 'Your account has no profile set up — contact the administrator.',
  profileFailed: "We couldn't load your profile. Please try again, or contact the administrator.",
};

/** Map a Supabase auth error to a friendly line — raw error objects never
 *  reach the user. */
function friendlyAuthError(error) {
  const raw = `${error?.message ?? ''}`.toLowerCase();
  const code = `${error?.code ?? ''}`.toLowerCase();
  if (code === 'invalid_credentials' || raw.includes('invalid login credentials')) {
    return MESSAGES.invalid;
  }
  if (code === 'email_not_confirmed' || raw.includes('email not confirmed')) {
    return MESSAGES.unconfirmed;
  }
  if (raw.includes('failed to fetch') || raw.includes('network') || raw.includes('load failed')) {
    return MESSAGES.network;
  }
  return MESSAGES.generic;
}

export function useAuth() {
  const [status, setStatus] = useState(supabaseConfigured ? 'loading' : 'misconfigured');
  const [salesman, setSalesman] = useState(null);
  const [profileError, setProfileError] = useState(null);

  /** Read the logged-in user's own salesman row (RLS restricts it to theirs).
   *  folder_name is fetched and kept now, for the later auto-save work. */
  const loadSalesman = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('salesman')
      .select('name, cell, email, folder_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      setSalesman(null);
      setProfileError(MESSAGES.profileFailed);
      setStatus('noProfile');
      return;
    }
    if (!data) {
      setSalesman(null);
      setProfileError(MESSAGES.noProfile);
      setStatus('noProfile');
      return;
    }
    setSalesman(data);
    setProfileError(null);
    setStatus('ready');
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return undefined;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data?.session?.user;
      if (user) loadSalesman(user.id);
      else setStatus('signedOut');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const user = session?.user;
      if (!user) {
        setSalesman(null);
        setProfileError(null);
        setStatus('signedOut');
        return;
      }
      // Supabase warns against calling its API synchronously inside this
      // callback — defer the profile query out of the auth lock.
      setTimeout(() => {
        if (active) loadSalesman(user.id);
      }, 0);
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, [loadSalesman]);

  /** Returns { ok } or { ok: false, message } — a friendly message, never a raw error. */
  const signIn = useCallback(async (email, password) => {
    if (!supabaseConfigured) return { ok: false, message: MESSAGES.generic };
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { ok: false, message: friendlyAuthError(error) };
      return { ok: true };
    } catch {
      return { ok: false, message: MESSAGES.network };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseConfigured) return;
    try {
      await supabase.auth.signOut();
    } catch {
      // Even if the network call fails, drop the local session state.
    }
    setSalesman(null);
    setProfileError(null);
    setStatus('signedOut');
  }, []);

  return { status, salesman, profileError, signIn, signOut };
}
