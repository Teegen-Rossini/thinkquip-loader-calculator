// api/_lib/auth.js — verify the caller is a logged-in salesman.
//
// The chat endpoint is public on the internet, so without this anyone who
// finds the URL can burn the OpenAI/Pinecone budget. The widget sends the
// user's Supabase access token as "Authorization: Bearer <jwt>"; we ask
// Supabase Auth whether that token is valid. No service-role key needed —
// the anon key + the user's own JWT is exactly what the browser client uses.
//
// Env (same names the frontend uses, so one .env serves both):
//   VITE_SUPABASE_URL       project base URL
//   VITE_SUPABASE_ANON_KEY  public anon key

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export const authConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Returns the Supabase user object for a valid token, or null. */
export async function verifyUser(authorizationHeader) {
  if (!authConfigured()) return null;
  const token = /^Bearer\s+(.+)$/i.exec(authorizationHeader || '')?.[1]?.trim();
  if (!token) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.id ? user : null;
  } catch {
    return null;
  }
}
