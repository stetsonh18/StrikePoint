import { PositionRepository } from './src/infrastructure/repositories/position.repository';
import { StrategyRepository } from './src/infrastructure/repositories/strategy.repository';

/**
 * Diagnostic script to check today's closed positions
 * Run with: npx tsx check-daily-performance.ts
 */

async function checkDailyPerformance() {
    const userId = process.env.USER_ID || '';

    if (!userId) {
        console.error('❌ Please set USER_ID environment variable');
        console.error('   Example: USER_ID=your-user-id npx tsx check-daily-performance.ts');
        process.exit(1);
    }

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
    console.log('');

    try {
        // Check all closed positions today
        console.log('📊 Checking positions closed today...');
        const closedToday = await PositionRepository.getRealizedPLByDateRange(
            userId,
            start.toISOString(),
            end.toISOString()
        );

        console.log(`   Found ${closedToday.length} positions closed today`);

        if (closedToday.length > 0) {
            const totalPL = closedToday.reduce((sum, p) => sum + Number(p.realized_pl || 0), 0);
            console.log(`   Total realized P&L: $${totalPL.toFixed(2)}`);
            console.log('');
            console.log('   Details:');
            closedToday.forEach((p, i) => {
                console.log(`   ${i + 1}. Position ID: ${p.id}`);
                console.log(`      Realized P&L: $${Number(p.realized_pl || 0).toFixed(2)}`);
                console.log(`      Closed at: ${p.closed_at}`);
            });
        } else {
            console.log('   ❌ No positions found closed today!');
        }
        console.log('');

        // Check all closed positions (any date)
        console.log('📊 Checking all closed positions...');
        const allClosed = await PositionRepository.getAll(userId, { status: 'closed' });
        console.log(`   Total closed positions: ${allClosed.length}`);

        if (allClosed.length > 0) {
            // Show the 5 most recent
            const recent = allClosed
                .filter(p => p.closed_at)
                .sort((a, b) => new Date(b.closed_at!).getTime() - new Date(a.closed_at!).getTime())
                .slice(0, 5);

            console.log('   5 most recently closed:');
            recent.forEach((p, i) => {
                const closedDate = p.closed_at ? new Date(p.closed_at) : null;
                const isToday = closedDate && closedDate >= start && closedDate <= end;
                console.log(`   ${i + 1}. ${p.symbol} (${p.asset_type})`);
                console.log(`      Realized P&L: $${Number(p.realized_pl || 0).toFixed(2)}`);
                console.log(`      Closed at: ${p.closed_at} ${isToday ? '✅ TODAY' : ''}`);
                console.log(`      Strategy ID: ${p.strategy_id || 'none'}`);
            });
        }
        console.log('');

        // Check strategies closed today
        console.log('📊 Checking strategies closed today...');
        const allStrategies = await StrategyRepository.getAll(userId);
        const strategiesClosedToday = allStrategies.filter(s => {
            if (s.status !== 'closed' || !s.closed_at) return false;
            const closedDate = new Date(s.closed_at);
            return closedDate >= start && closedDate <= end;
        });

        console.log(`   Found ${strategiesClosedToday.length} strategies closed today`);

        if (strategiesClosedToday.length > 0) {
            strategiesClosedToday.forEach((s, i) => {
                console.log(`   ${i + 1}. ${s.underlying_symbol} ${s.strategy_type}`);
                console.log(`      Realized P&L: $${Number(s.realized_pl || 0).toFixed(2)}`);
                console.log(`      Closed at: ${s.closed_at}`);
                console.log(`      Strategy ID: ${s.id}`);
            });
        }
        console.log('');

        // Summary
        console.log('📈 Summary:');
        console.log(`   Positions closed today: ${closedToday.length}`);
        console.log(`   Strategies closed today: ${strategiesClosedToday.length}`);

        const totalPositionPL = closedToday.reduce((sum, p) => sum + Number(p.realized_pl || 0), 0);
        const totalStrategyPL = strategiesClosedToday.reduce((sum, s) => sum + Number(s.realized_pl || 0), 0);

        console.log(`   Total P&L from positions: $${totalPositionPL.toFixed(2)}`);
        console.log(`   Total P&L from strategies: $${totalStrategyPL.toFixed(2)}`);
        console.log('');

        if (closedToday.length === 0 && strategiesClosedToday.length === 0) {
            console.log('⚠️  ISSUE FOUND: No positions or strategies closed today!');
            console.log('');
            console.log('Possible causes:');
            console.log('1. Position status is not "closed"');
            console.log('2. closed_at timestamp is not set');
            console.log('3. closed_at timestamp is in a different timezone');
            console.log('4. Position matching did not complete successfully');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkDailyPerformance();
