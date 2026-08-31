import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (_client) return _client;
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
  if (!url || !key) {
    throw new Error('Admin supabase env vars missing.');
  }
  _client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return _client;
}
