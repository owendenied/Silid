import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obmrsotpofjmhqpqxyzg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibXJzb3Rwb2ZqbWhxcHF4eXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwODcxMjQsImV4cCI6MjA5MjY2MzEyNH0.hrQRUxN6TAoUw1i6VHJCAYlP6xi__ElX4u-DPK0_UBw';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDb() {
  const { data, error } = await supabase.from('classrooms').insert([{
    name: "Test",
    teacherId: 1,
    joinCode: "XXXXX",
    coverColor: "test"
  }]);
  console.log("Insert result:", data);
  console.log("Insert error:", error);
}

checkDb();
