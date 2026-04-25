import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obmrsotpofjmhqpqxyzg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibXJzb3Rwb2ZqbWhxcHF4eXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwODcxMjQsImV4cCI6MjA5MjY2MzEyNH0.hrQRUxN6TAoUw1i6VHJCAYlP6xi__ElX4u-DPK0_UBw';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAll() {
  // 1. Check users table
  console.log("=== USERS ===");
  const { data: users, error: uErr } = await supabase.from('users').select('*');
  console.log("Users:", JSON.stringify(users, null, 2));
  console.log("Error:", uErr);

  // 2. Check classrooms table
  console.log("\n=== CLASSROOMS ===");
  const { data: classrooms, error: cErr } = await supabase.from('classrooms').select('*');
  console.log("Classrooms:", JSON.stringify(classrooms, null, 2));
  console.log("Error:", cErr);

  // 3. Check enrollments table
  console.log("\n=== ENROLLMENTS ===");
  const { data: enrollments, error: eErr } = await supabase.from('enrollments').select('*');
  console.log("Enrollments:", JSON.stringify(enrollments, null, 2));
  console.log("Error:", eErr);

  // 4. Check what columns the classrooms table actually has
  console.log("\n=== CLASSROOMS INSERT TEST (no auth) ===");
  const { data: testInsert, error: testErr } = await supabase.from('classrooms').insert([{
    name: "Test",
    section: "A",
    teacherId: 1,
    joinCode: "TEST99"
  }]);
  console.log("Insert error:", testErr);
}

checkAll();
