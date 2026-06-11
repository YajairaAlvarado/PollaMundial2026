import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const DOMAIN = '@ec.andersen.com';

export function toEmail(username) {
  const u = username.trim().toLowerCase();
  return u.includes('@') ? u : `${u}${DOMAIN}`;
}
