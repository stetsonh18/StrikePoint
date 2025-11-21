import { createClient } from '@supabase/supabase-js';

const userId = '5be9c5e6-77dd-49e4-b263-4a4fb56e0df8';

// Load environment variables from .env.local
const fs = await import('fs');
const path = await import('path');

let supabaseUrl, supabaseAnonKey;

try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim();
    }
  }
} catch (e) {
  console.error('Could not read .env.local:', e.message);
  process.exit(1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Checking daily performance for user:', userId);
console.log('');

// Get today's date range
const now = new Date();
const start = new Date(now);
start.setHours(0, 0, 0, 0);
const end = new Date(now);
end.setHours(23, 59, 59, 999);

console.log('📅 Date range:');
console.log('   Start:', start.toISOString());
console.log('   End:', end.toISOString());
console.log('   Local:', start.toLocaleString(), 'to', end.toLocaleString());
console.log('');

// Check positions closed today
console.log('📊 Checking positions closed today...');
const { data: closedToday, error: todayError } = await supabase
  .from('positions')
  .select('id, symbol, realized_pl, closed_at, status')
  .eq('user_id', userId)
  .eq('status', 'closed')
  .gte('closed_at', start.toISOString())
  .lte('closed_at', end.toISOString());

if (todayError) {
  console.error('❌ Error:', todayError);
} else {
  console.log(`   Found ${closedToday.length} positions closed today`);
  
  if (closedToday.length > 0) {
    const totalPL = closedToday.reduce((sum, p) => sum + Number(p.realized_pl || 0), 0);
    console.log(`   Total realized P&L: $${totalPL.toFixed(2)}`);
    console.log('');
    console.log('   Details:');
    closedToday.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.symbol}`);
      console.log(`      Realized P&L: $${Number(p.realized_pl || 0).toFixed(2)}`);
      console.log(`      Closed at: ${p.closed_at}`);
      console.log(`      Status: ${p.status}`);
    });
  } else {
    console.log('   ⚠️  No positions found closed today!');
  }
}
console.log('');

// Check all closed positions (recent)
console.log('📊 Checking all closed positions...');
const { data: allClosed, error: allError } = await supabase
  .from('positions')
  .select('id, symbol, realized_pl, closed_at, status, asset_type, strategy_id')
  .eq('user_id', userId)
  .eq('status', 'closed')
  .order('closed_at', { ascending: false })
  .limit(10);

if (allError) {
  console.error('❌ Error:', allError);
} else {
  console.log(`   Total closed positions (showing last 10):`);
  allClosed.forEach((p, i) => {
    const closedDate = p.closed_at ? new Date(p.closed_at) : null;
    const isToday = closedDate && closedDate >= start && closedDate <= end;
    console.log(`   ${i + 1}. ${p.symbol} (${p.asset_type})`);
    console.log(`      Realized P&L: $${Number(p.realized_pl || 0).toFixed(2)}`);
    console.log(`      Closed at: ${p.closed_at} ${isToday ? '✅ TODAY' : ''}`);
    console.log(`      Local time: ${closedDate ? closedDate.toLocaleString() : 'N/A'}`);
  });
}
console.log('');

// Check open positions
console.log('📊 Checking open positions...');
const { data: openPos, error: openError } = await supabase
  .from('positions')
  .select('id, symbol, unrealized_pl, status')
  .eq('user_id', userId)
  .eq('status', 'open');

if (openError) {
  console.error('❌ Error:', openError);
} else {
  console.log(`   Found ${openPos.length} open positions`);
  const totalUnrealized = openPos.reduce((sum, p) => sum + Number(p.unrealized_pl || 0), 0);
  console.log(`   Total unrealized P&L: $${totalUnrealized.toFixed(2)}`);
}
console.log('');

// Summary
const realizedPL = closedToday ? closedToday.reduce((sum, p) => sum + Number(p.realized_pl || 0), 0) : 0;
const unrealizedPL = openPos ? openPos.reduce((sum, p) => sum + Number(p.unrealized_pl || 0), 0) : 0;
const dailyPL = realizedPL + unrealizedPL;

console.log('📈 DAILY P&L SUMMARY:');
console.log(`   Realized P&L (closed today): $${realizedPL.toFixed(2)}`);
console.log(`   Unrealized P&L (open positions): $${unrealizedPL.toFixed(2)}`);
console.log(`   TOTAL DAILY P&L: $${dailyPL.toFixed(2)}`);
console.log('');

if (realizedPL === 0 && closedToday && closedToday.length === 0) {
  console.log('⚠️  DIAGNOSIS: No positions closed today according to database query');
  console.log('');
  console.log('Possible causes:');
  console.log('1. Position was closed but status is not "closed"');
  console.log('2. Position was closed but closed_at timestamp is not set to today');
  console.log('3. Timezone mismatch - closed_at might be in different timezone');
  console.log('4. Position matching/closing process did not complete');
}
