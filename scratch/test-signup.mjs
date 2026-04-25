import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
  const email = `test_${Date.now()}@example.com`;
  const password = 'Password123!';
  
  console.log('Signing up user:', email);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    console.error('Auth Error:', authError);
    return;
  }

  const userId = authData.user.id;
  console.log('User created:', userId);

  console.log('Attempting to insert into users table...');
  const { data: insertData, error: insertError } = await supabase
    .from('users')
    .insert([{
      openId: userId,
      name: 'Test User',
      email: email,
      appRole: 'teacher',
      xp: 0,
      level: 1
    }])
    .select()
    .single();

  if (insertError) {
    console.error('Insert Error:', insertError);
  } else {
    console.log('Insert Success, data:', insertData);
  }

  console.log('Attempting to select user profile directly...');
  const { data: selectData, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('openId', userId)
    .single();
    
  if (selectError) {
    console.error('Select Error:', selectError);
  } else {
    console.log('Select Success, data:', selectData);
  }
}

testSignup();
