// Debug script to check daily performance calculation
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getDateRangeForDays(lengthInDays) {
  const sanitizedLength = Math.max(1, Math.floor(lengthInDays));
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  if (sanitizedLength > 1) {
    start.setDate(start.getDate() - (sanitizedLength - 1));
  }
  start.setHours(0, 0, 0, 0);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

async function checkDailyPerformance(userId) {
  console.log('=== Checking Daily Performance ===\n');

  // Get today's date range
  const { start, end } = getDateRangeForDays(1);
  console.log('Date Range:');
  console.log('  Start:', start);
  console.log('  End:', end);
  console.log();

  // Get all closed positions today
  const { data: closedPositions, error } = await supabase
    .from('positions')
    .select('id, symbol, asset_type, realized_pl, closed_at, status')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .gte('closed_at', start)
    .lte('closed_at', end);

  if (error) {
    console.error('Error fetching positions:', error);
    return;
  }

  console.log(`Found ${closedPositions?.length || 0} closed positions today`);

  if (closedPositions && closedPositions.length > 0) {
    console.log('\nClosed Positions:');
    closedPositions.forEach(pos => {
      console.log(`  - ${pos.symbol} (${pos.asset_type})`);
      console.log(`    Realized P&L: $${pos.realized_pl}`);
      console.log(`    Closed At: ${pos.closed_at}`);
    });

    const totalRealizedPL = closedPositions.reduce((sum, pos) => sum + Number(pos.realized_pl || 0), 0);
    console.log(`\nTotal Realized P&L Today: $${totalRealizedPL.toFixed(2)}`);
  } else {
    console.log('\nNo closed positions found today.');
  }

  // Also check all closed positions in the last 7 days for comparison
  console.log('\n=== Recent Closed Positions (Last 7 Days) ===\n');
  const { start: weekStart } = getDateRangeForDays(7);

  const { data: recentPositions } = await supabase
    .from('positions')
    .select('id, symbol, asset_type, realized_pl, closed_at, status')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .gte('closed_at', weekStart)
    .order('closed_at', { ascending: false });

  if (recentPositions && recentPositions.length > 0) {
    console.log(`Found ${recentPositions.length} closed positions in last 7 days:`);
    recentPositions.forEach(pos => {
      console.log(`  - ${pos.symbol} (${pos.asset_type})`);
      console.log(`    Realized P&L: $${pos.realized_pl}`);
      console.log(`    Closed At: ${pos.closed_at}`);
      console.log();
    });
  } else {
    console.log('No closed positions in the last 7 days.');
  }

  // Check open positions for unrealized P&L
  console.log('\n=== Open Positions (for Unrealized P&L) ===\n');
  const { data: openPositions } = await supabase
    .from('positions')
    .select('id, symbol, asset_type, unrealized_pl, status')
    .eq('user_id', userId)
    .eq('status', 'open');

  if (openPositions && openPositions.length > 0) {
    console.log(`Found ${openPositions.length} open positions:`);
    const totalUnrealizedPL = openPositions.reduce((sum, pos) => sum + Number(pos.unrealized_pl || 0), 0);
    console.log(`Total Unrealized P&L: $${totalUnrealizedPL.toFixed(2)}`);
  } else {
    console.log('No open positions.');
  }
}

// Get user ID from command line or use a test user
const userId = process.argv[2];

if (!userId) {
  console.error('Usage: node check-daily-performance-issue.js <user_id>');
  process.exit(1);
}

checkDailyPerformance(userId).then(() => {
  console.log('\n=== Done ===');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
