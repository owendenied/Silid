import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing connection...');
  const { data, error } = await supabase.from('users').select('*').limit(5);
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Users found:', data.length);
    console.log(data);
  }
}

test();
