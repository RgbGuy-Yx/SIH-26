import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Retrieve the current Supabase JWT access token from the active session.
 * Returns null if no session exists or the session has expired and cannot be refreshed.
 * Supabase's autoRefreshToken handles token renewal automatically —
 * this function simply reads whatever token is currently valid.
 */
export async function getAccessToken() {
  try {
    const { data: { session }, error } = await supabase.getSession
      ? await supabase.auth.getSession()
      : { data: { session: null }, error: null };

    if (error) {
      console.warn('[Supabase] Failed to retrieve session for access token:', error.message);
      return null;
    }

    return session?.access_token ?? null;
  } catch (err) {
    console.warn('[Supabase] Unexpected error retrieving access token:', err);
    return null;
  }
}

export default supabase;
