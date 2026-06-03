import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = 'https://njfhrvxopavloqkylmqc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZmhydnhvcGF2bG9xa3lsbXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNjY5OTIsImV4cCI6MjA5NTk0Mjk5Mn0.afT1kjyqi3796SAy1ExSljj0H6O9vmIY6nT9LwhtS5I';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const mockUuid = crypto.randomUUID();

async function test() {
  console.log('Testing Supabase Anon connection...');
  
  // Test SELECT
  console.log('--- SELECT ---');
  const { data, error } = await supabase.from('optimization_logs').select('*').limit(1);
  if (error) {
    console.error('SELECT ERROR:', error);
  } else {
    console.log('SELECT SUCCESS:', data);
  }

  // Test INSERT
  console.log('\n--- INSERT ---');
  const { error: insertError } = await supabase.from('optimization_logs').insert({
    user_id: mockUuid,
    site: 'test',
    strategy: 'test',
    original_prompt: 'test',
    score_before: 0,
    score_after: 0
  });
  if (insertError) {
    console.error('INSERT ERROR:', insertError);
  } else {
    console.log('INSERT SUCCESS!');
  }
}

test();
