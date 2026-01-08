/**
 * Utility to fix strategies that have all positions closed but weren't marked as closed
 * Run this from the browser console while logged in:
 *
 * import { fixClosedStrategies } from './infrastructure/utils/fixClosedStrategies'
 * fixClosedStrategies('your-user-id')
 */

import { supabase } from '../api/supabase';
import { StrategyRepository } from '../repositories/strategy.repository';

export async function fixClosedStrategies(userId: string): Promise<void> {
  console.log('=== Fixing Closed Strategies ===\n');

  // Get all strategies for this user
  const strategies = await StrategyRepository.getAll(userId);
  console.log(`Found ${strategies.length} total strategies\n`);

  let fixedCount = 0;
  let alreadyCorrectCount = 0;

  for (const strategy of strategies) {
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
      (p) => ['closed', 'expired', 'assigned', 'exercised'].includes(p.status)
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
    console.log(`\n✓ Fixing strategy: ${strategy.id}`);
    console.log(`  Type: ${strategy.strategy_type || 'unknown'}`);
    console.log(`  Symbol: ${strategy.underlying_symbol || 'unknown'}`);
    console.log(`  Current status: ${strategy.status}`);
    console.log(`  Current realized_pl: ${strategy.realized_pl}`);

    // Calculate total realized P&L from all positions
    const totalRealizedPL = positions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);

    // Get the latest closed_at timestamp from all positions
    const closedAtDates = positions
      .map((p) => p.closed_at)
      .filter((date): date is string => date !== null);

    const latestClosedAt = closedAtDates.length > 0
      ? closedAtDates.reduce((latest, current) =>
          new Date(current) > new Date(latest) ? current : latest
        )
      : new Date().toISOString();

    // Calculate total opening and closing costs
    const totalOpeningCost = positions.reduce((sum, p) => sum + Math.abs(p.total_cost_basis || 0), 0);
    const totalClosingProceeds = positions.reduce((sum, p) => sum + Math.abs(p.total_closing_amount || 0), 0);

    // Determine strategy status
    const hasExpired = positions.some((p) => p.status === 'expired');
    const hasAssigned = positions.some((p) => p.status === 'assigned');
    const hasExercised = positions.some((p) => p.status === 'exercised');

    let strategyStatus: 'closed' | 'expired' | 'assigned' = 'closed';
    if (hasExpired) strategyStatus = 'expired';
    else if (hasAssigned || hasExercised) strategyStatus = 'assigned';

    console.log(`  → New status: ${strategyStatus}`);
    console.log(`  → New realized_pl: $${totalRealizedPL.toFixed(2)}`);
    console.log(`  → New closed_at: ${latestClosedAt}`);

    // Update the strategy
    await StrategyRepository.update(strategy.id, {
      status: strategyStatus,
      realized_pl: totalRealizedPL,
      unrealized_pl: 0,
      closed_at: latestClosedAt,
      total_opening_cost: totalOpeningCost,
      total_closing_proceeds: totalClosingProceeds,
    });

    console.log(`  ✓ Strategy fixed successfully!`);
    fixedCount++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total strategies: ${strategies.length}`);
  console.log(`Already correct: ${alreadyCorrectCount}`);
  console.log(`Fixed: ${fixedCount}`);
  console.log(`\nDone! Your dashboard should now show today's performance.`);
}
