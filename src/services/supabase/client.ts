import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

/**
 * `true` when the build was compiled with Supabase env vars present.
 * `false` when the bundle was shipped without them (e.g. on the public
 * demo deploy, before the operator has linked a real Supabase project).
 *
 * Components should check this and render an explanatory screen instead
 * of throwing, so the user sees something useful instead of an empty
 * dark page.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(url) && Boolean(anonKey);
}

let _client: SupabaseClient | null = null;

/**
 * The Supabase client used by the React app.
 * Spec §47, §48, §49.
 *
 * - Created lazily so unit tests can import this file without a network.
 * - The anon key is safe to ship in the client bundle; the SERVICE role key
 *   is NEVER used here (it lives only in Edge Functions / the Codemagic env).
 * - auth.persistSession is wired to localStorage for the web runtime; on
 *   native (Capacitor), the runtime's secure storage plugin is used by the
 *   host app to bridge to NSUserDefaults / SharedPreferences.
 *
 * Throws if env vars are missing. Callers that want a graceful UX should
 * check {@link isSupabaseConfigured} first and show a fallback screen.
 */
export function supabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  if (_client) return _client;
  _client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
  return _client;
}

/**
 * Returns the current Supabase URL. Useful for diagnostics in the admin UI.
 */
export function supabaseUrl(): string {
  return url;
}

/** Authenticated user id, or throw. Used by every private insert. */
export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase().auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error('Not authenticated');
  return id;
}
