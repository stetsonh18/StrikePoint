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

console.log('🔍 Checking ALL positions for user:', userId);
console.log('');

// Get ALL positions regardless of status
const { data: allPositions, error } = await supabase
  .from('positions')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(20);

if (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

console.log(`Found ${allPositions.length} total positions`);
console.log('');

if (allPositions.length === 0) {
  console.log('❌ NO POSITIONS FOUND IN DATABASE!');
  console.log('');
  console.log('This means:');
  console.log('1. Transactions were imported but position matching did not run');
  console.log('2. Position matching failed');
  console.log('3. Transactions are not linked to positions');
  console.log('');
  console.log('Let me check transactions...');

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('activity_date', { ascending: false })
    .limit(10);

  if (txError) {
    console.error('❌ Error fetching transactions:', txError);
  } else {
    console.log(`\nFound ${transactions.length} transactions`);
    if (transactions.length > 0) {
      console.log('\nRecent transactions:');
      transactions.forEach((tx, i) => {
        console.log(`${i + 1}. ${tx.instrument} ${tx.transaction_code}`);
        console.log(`   Date: ${tx.activity_date}`);
        console.log(`   Quantity: ${tx.quantity}, Price: $${tx.price}`);
        console.log(`   Position ID: ${tx.position_id || 'NOT LINKED'}`);
        console.log(`   Is Opening: ${tx.is_opening}`);
      });
    }
  }
} else {
  console.log('Positions found:');
  allPositions.forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.symbol} (${p.asset_type})`);
    console.log(`   Status: ${p.status}`);
    console.log(`   Side: ${p.side}`);
    console.log(`   Opening Qty: ${p.opening_quantity}, Current Qty: ${p.current_quantity}`);
    console.log(`   Realized P&L: $${Number(p.realized_pl || 0).toFixed(2)}`);
    console.log(`   Unrealized P&L: $${Number(p.unrealized_pl || 0).toFixed(2)}`);
    console.log(`   Opened: ${p.opened_at}`);
    console.log(`   Closed: ${p.closed_at || 'Not closed'}`);
  });
}
