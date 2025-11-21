// Quick debug to check what getRealizedPLByDateRange returns
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const userId = process.env.USER_ID;

if (!supabaseUrl || !supabaseKey || !userId) {
  console.error('Missing env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, USER_ID');
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

async function debug() {
  console.log('User ID:', userId);
  console.log('');

  const { start, end } = getDateRangeForDays(1);
  console.log('Today date range:');
  console.log('  Start:', start);
  console.log('  End:', end);
  console.log('');

  const { data, error } = await supabase
    .from('positions')
    .select('id, symbol, realized_pl, closed_at, status')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .gte('closed_at', start)
    .lte('closed_at', end);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} positions closed today`);

  if (data && data.length > 0) {
    console.log('');
    data.forEach(pos => {
      console.log(`- ${pos.symbol}: $${pos.realized_pl} (closed at: ${pos.closed_at})`);
    });

    const total = data.reduce((sum, p) => sum + Number(p.realized_pl || 0), 0);
    console.log('');
    console.log(`Total realized P&L today: $${total.toFixed(2)}`);
  } else {
    console.log('');
    console.log('This means realizedPL in useDailyPerformance would be $0.00');
    console.log('So the $52.88 is coming from unrealized change (portfolio value change - realized)');
  }
}

debug().catch(console.error);
