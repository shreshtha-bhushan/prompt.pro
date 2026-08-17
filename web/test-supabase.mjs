import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://njfhrvxopavloqkylmqc.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('ERROR: SUPABASE_ANON_KEY environment variable is required. Please set it in web/.env.local');
  process.exit(1);
}

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
