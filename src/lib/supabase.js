/**
 * The single Supabase client for the app.
 *
 * Connection values come ONLY from the Vite env (.env, which is gitignored):
 *   VITE_SUPABASE_URL      — the project URL
 *   VITE_SUPABASE_ANON_KEY — the public/anon key
 *
 * Never put a service-role key in this app: everything here runs in the
 * browser, so the anon key + Row Level Security is the security boundary. The
 * `salesman` table's RLS SELECT policy (auth.uid() = user_id) is what stops a
 * logged-in salesman reading anyone else's row.
 */
import { createClient } from '@supabase/supabase-js';

/**
 * supabase-js wants the PROJECT BASE url (https://<ref>.supabase.co) and builds
 * /auth/v1, /rest/v1 … under it itself. The Supabase dashboard also shows a
 * "/rest/v1" endpoint, which is easy to paste by mistake — and doing so silently
 * breaks auth (calls land on /rest/v1/auth/v1/... and PostgREST 404s). Strip any
 * pasted API path so either form works.
 */
function baseUrl(raw) {
  if (!raw) return raw;
  return raw.trim().replace(/\/(rest|auth|storage|realtime)\/v\d+\/?$/i, '').replace(/\/+$/, '');
}

const url = baseUrl(import.meta.env.VITE_SUPABASE_URL);
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False when the env vars are missing — the app shows a setup message instead
 *  of crashing inside createClient(). */
export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        // Keep the salesman signed in across reloads (Supabase stores the
        // session in localStorage and refreshes the token on its own).
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
