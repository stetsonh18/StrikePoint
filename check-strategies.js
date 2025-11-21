import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const userId = '5be9c5e6-77dd-49e4-b263-4a4fb56e0df8';

// Load environment variables
const envContent = readFileSync('.env.local', 'utf-8');
const lines = envContent.split('\n');
let supabaseUrl, supabaseAnonKey;

for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = line.split('=')[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Checking strategies and cash flow for user:', userId);
console.log('');

// Check strategies
const { data: strategies, error: stratError } = await supabase
  .from('strategies')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(10);

if (stratError) {
  console.error('❌ Error fetching strategies:', stratError);
} else {
  console.log(`Found ${strategies.length} strategies`);
  if (strategies.length > 0) {
    strategies.forEach((s, i) => {
      console.log(`\n${i + 1}. ${s.underlying_symbol} ${s.strategy_type}`);
      console.log(`   Status: ${s.status}`);
      console.log(`   Realized P&L: $${Number(s.realized_pl || 0).toFixed(2)}`);
      console.log(`   Unrealized P&L: $${Number(s.unrealized_pl || 0).toFixed(2)}`);
      console.log(`   Opened: ${s.opened_at}`);
      console.log(`   Closed: ${s.closed_at || 'Not closed'}`);
    });
  }
}

console.log('\n');

// Check cash transactions
const { data: cashTx, error: cashError } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId)
  .in('transaction_code', ['Wire In', 'Wire Out', 'Deposit', 'Withdrawal', 'ACH In', 'ACH Out'])
  .order('activity_date', { ascending: false })
  .limit(10);

if (cashError) {
  console.error('❌ Error fetching cash transactions:', cashError);
} else {
  console.log(`Found ${cashTx.length} cash transactions`);
  if (cashTx.length > 0) {
    const total = cashTx.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
    console.log(`Total net cash flow from these: $${total.toFixed(2)}`);
  }
}

console.log('\n');

// Check total table counts
console.log('📊 Database table counts:');

const { count: posCount } = await supabase
  .from('positions')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId);

const { count: txCount } = await supabase
  .from('transactions')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId);

const { count: stratCount } = await supabase
  .from('strategies')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId);

console.log(`   Positions: ${posCount}`);
console.log(`   Transactions: ${txCount}`);
console.log(`   Strategies: ${stratCount}`);
