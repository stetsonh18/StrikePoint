import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface PortfolioExposure {
  openPositions: number;
  marketValue: number;
  unrealizedPL: number;
}

export interface PortfolioContextSummary {
  snapshot?: Record<string, JsonValue> | null;
  cash?: Record<string, JsonValue> | null;
  exposures: Record<string, PortfolioExposure>;
  totals: {
    openPositions: number;
    marketValue: number;
    unrealizedPL: number;
  };
  riskBudget: {
    portfolioValue: number;
    recommendedRiskPerTrade: number;
    dailyLossCap: number;
    cashBuffer: number;
  };
  recentPerformance?: {
    winRate: number;
    totalRealizedPL: number;
    tradeCount: number;
    avgWin: number;
    avgLoss: number;
  };
}

const SUPPORTED_ASSET_TYPES = ['stock', 'option', 'crypto', 'futures'];

export async function fetchPortfolioContext(
  adminClient: SupabaseClient,
  userId: string
): Promise<PortfolioContextSummary> {
  const [snapshotResult, cashResult, positionsResult] = await Promise.all([
    adminClient
      .from('portfolio_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminClient
      .from('cash_balances')
      .select('*')
      .eq('user_id', userId)
      .order('balance_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminClient
      .from('positions')
      .select('asset_type, status, unrealized_pl, total_cost_basis, realized_pl, closed_at')
      .eq('user_id', userId),
  ]);

  if (snapshotResult.error) {
    throw snapshotResult.error;
  }
  if (cashResult.error) {
    throw cashResult.error;
  }
  if (positionsResult.error) {
    throw positionsResult.error;
  }

  const exposures: Record<string, PortfolioExposure> = SUPPORTED_ASSET_TYPES.reduce((acc, type) => {
    acc[type] = { openPositions: 0, marketValue: 0, unrealizedPL: 0 };
    return acc;
  }, {} as Record<string, PortfolioExposure>);

  let totalOpenPositions = 0;
  let totalMarketValue = 0;
  let totalUnrealized = 0;

  // Performance tracking
  let closedTradeCount = 0;
  let winningTrades = 0;
  let totalRealizedPL = 0;
  let totalWinAmt = 0;
  let totalLossAmt = 0;
  let winCount = 0;
  let lossCount = 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  (positionsResult.data ?? []).forEach((position: any) => {
    // Handle Open Positions
    if (position.status === 'open') {
      const assetType = SUPPORTED_ASSET_TYPES.includes(position.asset_type)
        ? position.asset_type
        : 'stock';

      const exposure = exposures[assetType] ?? { openPositions: 0, marketValue: 0, unrealizedPL: 0 };
      exposure.openPositions += 1;

      const costBasis = Math.abs(Number(position.total_cost_basis) || 0);
      const unrealized = Number(position.unrealized_pl) || 0;
      const isLong = position.side === 'long';
      
      // Calculate market value based on position side
      // For short positions (stocks, crypto, options): negative market value (liability)
      // For long positions: positive market value (asset)
      // For futures: only use unrealized P&L (margin-based)
      let marketValue: number;
      if (assetType === 'futures') {
        marketValue = unrealized;
      } else if (!isLong && (assetType === 'stock' || assetType === 'crypto' || assetType === 'option')) {
        // Short positions: negative market value (liability)
        marketValue = -costBasis + unrealized;
      } else {
        // Long positions: positive market value (asset)
        marketValue = costBasis + unrealized;
      }

      exposure.marketValue += marketValue;
      exposure.unrealizedPL += unrealized;

      exposures[assetType] = exposure;
      totalOpenPositions += 1;
      totalMarketValue += marketValue;
      totalUnrealized += unrealized;
    }
    // Handle Closed Positions (Recent Performance)
    else if (position.status === 'closed' && position.closed_at) {
      const closeDate = new Date(position.closed_at);
      if (closeDate >= thirtyDaysAgo) {
        const realized = Number(position.realized_pl) || 0;
        closedTradeCount++;
        totalRealizedPL += realized;

        if (realized > 0) {
          winningTrades++;
          winCount++;
          totalWinAmt += realized;
        } else if (realized < 0) {
          lossCount++;
          totalLossAmt += Math.abs(realized);
        }
      }
    }
  });

  const portfolioValue = Number(
    snapshotResult.data?.portfolio_value ??
    (totalMarketValue !== 0 ? totalMarketValue : undefined) ??
    cashResult.data?.total_cash ??
    0
  );

  const availableCash = cashResult.data
    ? Number(cashResult.data.available_cash ?? 0)
    : Number(snapshotResult.data?.total_cash ?? 0);

  const recommendedRiskPerTrade = portfolioValue * 0.01; // 1% default
  const dailyLossCap = portfolioValue * 0.03; // 3% default
  const cashBuffer = availableCash * 0.2; // keep 20% cash buffer

  return {
    snapshot: snapshotResult.data,
    cash: cashResult.data,
    exposures,
    totals: {
      openPositions: totalOpenPositions,
      marketValue: Number(totalMarketValue.toFixed(2)),
      unrealizedPL: Number(totalUnrealized.toFixed(2)),
    },
    riskBudget: {
      portfolioValue: Number(portfolioValue.toFixed(2)),
      recommendedRiskPerTrade: Number(recommendedRiskPerTrade.toFixed(2)),
      dailyLossCap: Number(dailyLossCap.toFixed(2)),
      cashBuffer: Number(cashBuffer.toFixed(2)),
    },
    recentPerformance: {
      tradeCount: closedTradeCount,
      totalRealizedPL: Number(totalRealizedPL.toFixed(2)),
      winRate: closedTradeCount > 0 ? Number(((winningTrades / closedTradeCount) * 100).toFixed(1)) : 0,
      avgWin: winCount > 0 ? Number((totalWinAmt / winCount).toFixed(2)) : 0,
      avgLoss: lossCount > 0 ? Number((totalLossAmt / lossCount).toFixed(2)) : 0,
    },
  };
}

export function buildPortfolioPrompt(context: PortfolioContextSummary): string {
  const parts: string[] = [];

  parts.push(`Portfolio Value: $${context.riskBudget.portfolioValue.toLocaleString()}`);
  parts.push(`Recommended Risk Per Trade (1%): $${context.riskBudget.recommendedRiskPerTrade.toLocaleString()}`);
  parts.push(`Daily Loss Cap (3%): $${context.riskBudget.dailyLossCap.toLocaleString()}`);
  parts.push(`Available Cash Buffer (20% of cash): $${context.riskBudget.cashBuffer.toLocaleString()}`);

  parts.push('Exposure by asset type:');
  Object.entries(context.exposures).forEach(([type, exposure]) => {
    parts.push(
      `- ${type}: ${exposure.openPositions} open positions, ` +
      `Market Value $${exposure.marketValue.toFixed(2)}, ` +
      `Unrealized P/L $${exposure.unrealizedPL.toFixed(2)}`
    );
  });

  if (context.recentPerformance) {
    parts.push('Recent Performance (Last 30 Days):');
    parts.push(`- Trades Closed: ${context.recentPerformance.tradeCount}`);
    parts.push(`- Win Rate: ${context.recentPerformance.winRate}%`);
    parts.push(`- Total Realized P/L: $${context.recentPerformance.totalRealizedPL}`);
    parts.push(`- Avg Win: $${context.recentPerformance.avgWin}`);
    parts.push(`- Avg Loss: $${context.recentPerformance.avgLoss}`);
  }

  if (context.snapshot) {
    parts.push(
      `Latest snapshot on ${context.snapshot.snapshot_date ?? context.snapshot.created_at ?? 'n/a'
      }: net cash flow ${context.snapshot.net_cash_flow}, realized P/L ${context.snapshot.total_realized_pl}`
    );
  }

  if (context.cash) {
    parts.push(
      `Cash: available $${context.cash.available_cash ?? 0}, buying power $${context.cash.buying_power ?? 0}, margin used $${context.cash.margin_used ?? 0}`
    );
  }

  return parts.join('\n');
}

