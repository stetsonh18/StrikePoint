import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from request
    const { userId, dates } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Regenerating snapshots for user ${userId}`);

    // Get dates to regenerate (either from request or all transaction dates)
    let snapshotDates: string[] = dates || [];

    if (snapshotDates.length === 0) {
      // Get all unique transaction dates
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('activity_date')
        .eq('user_id', userId)
        .not('activity_date', 'is', null)
        .order('activity_date', { ascending: false });

      if (txError) throw txError;

      // Extract unique dates
      const uniqueDates = new Set<string>();
      transactions?.forEach((tx: any) => {
        if (tx.activity_date) {
          uniqueDates.add(tx.activity_date);
        }
      });
      snapshotDates = Array.from(uniqueDates).sort();
    }

    console.log(`Found ${snapshotDates.length} dates to regenerate`);

    const results: any[] = [];

    // Generate snapshot for each date
    for (const date of snapshotDates) {
      try {
        console.log(`Generating snapshot for ${date}...`);

        // Get all positions (open and closed)
        const { data: allPositions, error: posError } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', userId);

        if (posError) throw posError;

        // Filter positions by date (only positions that existed on or before this date)
        const positionsAtDate = allPositions?.filter((p: any) => {
          const openedAt = p.opened_at ? new Date(p.opened_at) : null;
          const snapshotDate = new Date(date);
          return openedAt && openedAt <= snapshotDate;
        }) || [];

        const openPositions = positionsAtDate.filter((p: any) => p.status === 'open');
        const closedPositions = positionsAtDate.filter((p: any) =>
          ['closed', 'expired', 'assigned', 'exercised'].includes(p.status)
        );

        // Calculate net cash flow from cash transactions up to this date
        const { data: cashTxs, error: cashError } = await supabase
          .from('cash_transactions')
          .select('*')
          .eq('user_id', userId)
          .lte('transaction_date', date);

        if (cashError) throw cashError;

        const excludedCodes = ['FUTURES_MARGIN', 'FUTURES_MARGIN_RELEASE'];
        const netCashFlow = cashTxs
          ?.filter((tx: any) => !excludedCodes.includes(tx.transaction_code || ''))
          .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0) || 0;

        // Calculate total realized P&L from closed positions
        const totalRealizedPL = closedPositions.reduce((sum: number, p: any) => {
          let realizedPL = p.realized_pl || 0;
          // Fix for expired short options
          if (p.status === 'expired' && p.side === 'short' && realizedPL === 0 && p.total_cost_basis && p.total_cost_basis !== 0) {
            realizedPL = Math.abs(p.total_cost_basis);
          }
          return sum + realizedPL;
        }, 0);

        // Calculate total market value and unrealized P&L from open positions
        // For simplicity in edge function, use stored values (real calculation would fetch live quotes)
        const totalMarketValue = openPositions.reduce((sum: number, p: any) => {
          const costBasis = Math.abs(p.total_cost_basis || 0);
          const unrealizedPL = p.unrealized_pl || 0;
          const isLong = p.side === 'long';

          // Market value = cost basis + unrealized P&L
          // For short positions, market value is negative (liability)
          const marketValue = isLong ? costBasis + unrealizedPL : -costBasis + unrealizedPL;
          return sum + marketValue;
        }, 0);

        const totalUnrealizedPL = openPositions.reduce((sum: number, p: any) =>
          sum + (p.unrealized_pl || 0), 0
        );

        // Calculate portfolio value: net cash flow + realized P&L + market value
        const portfolioValue = netCashFlow + totalRealizedPL + totalMarketValue;

        // Calculate positions breakdown
        const positionsBreakdown = {
          stocks: {
            count: openPositions.filter((p: any) => p.asset_type === 'stock').length,
            value: openPositions
              .filter((p: any) => p.asset_type === 'stock')
              .reduce((sum: number, p: any) => {
                const costBasis = Math.abs(p.total_cost_basis || 0);
                const unrealizedPL = p.unrealized_pl || 0;
                const isLong = p.side === 'long';
                return sum + (isLong ? costBasis + unrealizedPL : -costBasis + unrealizedPL);
              }, 0)
          },
          options: {
            count: openPositions.filter((p: any) => p.asset_type === 'option').length,
            value: openPositions
              .filter((p: any) => p.asset_type === 'option')
              .reduce((sum: number, p: any) => {
                const costBasis = Math.abs(p.total_cost_basis || 0);
                const unrealizedPL = p.unrealized_pl || 0;
                const isLong = p.side === 'long';
                return sum + (isLong ? costBasis + unrealizedPL : -costBasis + unrealizedPL);
              }, 0)
          },
          crypto: {
            count: openPositions.filter((p: any) => p.asset_type === 'crypto').length,
            value: openPositions
              .filter((p: any) => p.asset_type === 'crypto')
              .reduce((sum: number, p: any) => {
                const costBasis = Math.abs(p.total_cost_basis || 0);
                const unrealizedPL = p.unrealized_pl || 0;
                const isLong = p.side === 'long';
                return sum + (isLong ? costBasis + unrealizedPL : -costBasis + unrealizedPL);
              }, 0)
          },
          futures: {
            count: openPositions.filter((p: any) => p.asset_type === 'futures').length,
            value: openPositions
              .filter((p: any) => p.asset_type === 'futures')
              .reduce((sum: number, p: any) => sum + (p.unrealized_pl || 0), 0)
          },
        };

        // Upsert snapshot
        const { error: upsertError } = await supabase
          .from('portfolio_snapshots')
          .upsert({
            user_id: userId,
            snapshot_date: date,
            portfolio_value: portfolioValue,
            net_cash_flow: netCashFlow,
            total_market_value: totalMarketValue,
            total_realized_pl: totalRealizedPL,
            total_unrealized_pl: totalUnrealizedPL,
            open_positions_count: openPositions.length,
            total_positions_count: positionsAtDate.length,
            positions_breakdown: positionsBreakdown,
          }, {
            onConflict: 'user_id,snapshot_date'
          });

        if (upsertError) throw upsertError;

        results.push({ date, success: true, portfolioValue, netCashFlow, totalRealizedPL });
        console.log(`✓ Generated snapshot for ${date}: portfolio_value=${portfolioValue}, net_cash_flow=${netCashFlow}, realized_pl=${totalRealizedPL}`);
      } catch (error) {
        console.error(`✗ Failed to generate snapshot for ${date}:`, error);
        results.push({ date, success: false, error: String(error) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Completed: ${successCount}/${results.length} snapshots generated successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${successCount}/${results.length} snapshots`,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
