import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

export const supabaseEnabled = Boolean(url && secretKey);

// The secret key bypasses row-level security, so this client is server-side
// only — it must never be handed to the browser.
export const supabase = supabaseEnabled
  ? createClient(url, secretKey, { auth: { persistSession: false } })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in server/.env'
    );
  }
  return supabase;
}
