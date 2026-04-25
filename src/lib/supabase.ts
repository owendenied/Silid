import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Clean Supabase Client
 * Migrated from localStorage mock to real Supabase production client.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For backward compatibility with any files still importing supabaseReal
export const supabaseReal = supabase;
