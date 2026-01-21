import { createClient } from '@supabase/supabase-js';
import { PortfolioSnapshotService } from '../src/infrastructure/services/portfolioSnapshotService';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    console.log('Starting portfolio snapshot regeneration...\n');

    // Get the user ID from the auth.users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (usersError) {
      throw usersError;
    }

    if (!users || users.length === 0) {
      throw new Error('No users found');
    }

    const userId = users[0].id;
    console.log(`Found user ID: ${userId}`);

    // Regenerate all snapshots
    console.log('\nRegenerating all portfolio snapshots...');
    const count = await PortfolioSnapshotService.regenerateAllSnapshots(userId);

    console.log(`\n✅ Successfully regenerated ${count} snapshots`);

    // Verify a few snapshots to check the fix
    const { data: recentSnapshots, error: snapshotsError } = await supabase
      .from('portfolio_snapshots')
      .select('snapshot_date, portfolio_value, net_cash_flow, total_realized_pl, total_market_value')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(5);

    if (snapshotsError) {
      throw snapshotsError;
    }

    console.log('\n📊 Recent snapshots (verification):');
    console.table(recentSnapshots);

    console.log('\n✅ Regeneration complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
