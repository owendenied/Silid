import { createClient } from '@supabase/supabase-js';
import { localDb } from './localDb';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Real Supabase client — used ONLY for authentication
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

// The main "supabase" export now uses localStorage for data
// but real Supabase for auth. This is a drop-in replacement.
export const supabase = {
  auth: supabaseAuth.auth,
  from: (table: string) => localDb.from(table),
  channel: (name: string) => localDb.channel(name),
  removeChannel: (channel: any) => localDb.removeChannel(channel),
  storage: localDb.storage,
};
