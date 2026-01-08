/**
 * Script to fix strategies that have all positions closed but the strategy itself
 * wasn't marked as closed with realized_pl and closed_at timestamps.
 *
 * This fixes a bug where closing all legs of a multi-leg strategy didn't update
 * the strategy record itself.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this script and navigate to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Read .env.local file from project root
const envContent = readFileSync(join(projectRoot, '.env.local'), 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface Position {
  id: string;
  strategy_id: string | null;
  status: string;
  realized_pl: number;
  unrealized_pl: number;
  total_cost_basis: number;
  total_closing_amount: number;
  closed_at: string | null;
}

interface Strategy {
  id: string;
  status: string;
  realized_pl: number | null;
  unrealized_pl: number | null;
  closed_at: string | null;
  total_opening_cost: number | null;
  total_closing_proceeds: number | null;
}

async function fixClosedStrategies() {
  console.log('=== Fixing Closed Strategies ===\n');

  // Get all strategies
  const { data: strategies, error: stratError } = await supabase
    .from('strategies')
    .select('*')
    .order('opened_at', { ascending: false });

  if (stratError) {
    console.error('Error fetching strategies:', stratError);
    process.exit(1);
  }

  console.log(`Found ${strategies?.length || 0} total strategies\n`);

  let fixedCount = 0;
  let alreadyCorrectCount = 0;

  for (const strategy of strategies || []) {
    // Get all positions for this strategy
    const { data: positions, error: posError } = await supabase
      .from('positions')
      .select('*')
      .eq('strategy_id', strategy.id);

    if (posError) {
      console.error(`Error fetching positions for strategy ${strategy.id}:`, posError);
      continue;
    }

    if (!positions || positions.length === 0) {
      continue;
    }

    // Check if all positions are closed
    const allClosed = positions.every(
      (p: Position) => ['closed', 'expired', 'assigned', 'exercised'].includes(p.status)
    );

    if (!allClosed) {
      continue; // Strategy is still open
    }

    // Check if strategy is already marked as closed with realized_pl set
    if (strategy.status !== 'open' && strategy.realized_pl !== null && strategy.closed_at !== null) {
      alreadyCorrectCount++;
      continue; // Already correct
    }

    // Strategy needs to be fixed
    console.log(`\nFixing strategy: ${strategy.id}`);
    console.log(`  Type: ${strategy.strategy_type || 'unknown'}`);
    console.log(`  Symbol: ${strategy.underlying_symbol || 'unknown'}`);
    console.log(`  Current status: ${strategy.status}`);
    console.log(`  Current realized_pl: ${strategy.realized_pl}`);
    console.log(`  Current closed_at: ${strategy.closed_at}`);

    // Calculate total realized P&L from all positions
    const totalRealizedPL = positions.reduce((sum: number, p: Position) => sum + (p.realized_pl || 0), 0);

    // Get the latest closed_at timestamp from all positions
    const closedAtDates = positions
      .map((p: Position) => p.closed_at)
      .filter((date): date is string => date !== null);

    const latestClosedAt = closedAtDates.length > 0
      ? closedAtDates.reduce((latest, current) =>
          new Date(current) > new Date(latest) ? current : latest
        )
      : new Date().toISOString();

    // Calculate total opening and closing costs
    const totalOpeningCost = positions.reduce((sum: number, p: Position) => sum + Math.abs(p.total_cost_basis || 0), 0);
    const totalClosingProceeds = positions.reduce((sum: number, p: Position) => sum + Math.abs(p.total_closing_amount || 0), 0);

    // Determine strategy status based on position statuses
    const hasExpired = positions.some((p: Position) => p.status === 'expired');
    const hasAssigned = positions.some((p: Position) => p.status === 'assigned');
    const hasExercised = positions.some((p: Position) => p.status === 'exercised');

    let strategyStatus: 'closed' | 'expired' | 'assigned' = 'closed';
    if (hasExpired) strategyStatus = 'expired';
    else if (hasAssigned || hasExercised) strategyStatus = 'assigned'; // Treat exercised as assigned

    console.log(`  New status: ${strategyStatus}`);
    console.log(`  New realized_pl: ${totalRealizedPL}`);
    console.log(`  New closed_at: ${latestClosedAt}`);

    // Update the strategy
    const { error: updateError } = await supabase
      .from('strategies')
      .update({
        status: strategyStatus,
        realized_pl: totalRealizedPL,
        unrealized_pl: 0,
        closed_at: latestClosedAt,
        total_opening_cost: totalOpeningCost,
        total_closing_proceeds: totalClosingProceeds,
      })
      .eq('id', strategy.id);

    if (updateError) {
      console.error(`  Error updating strategy:`, updateError);
    } else {
      console.log(`  ✓ Strategy fixed successfully!`);
      fixedCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total strategies: ${strategies?.length || 0}`);
  console.log(`Already correct: ${alreadyCorrectCount}`);
  console.log(`Fixed: ${fixedCount}`);
}

fixClosedStrategies()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
