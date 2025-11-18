import { TransactionRepository } from '@/infrastructure/repositories/transaction.repository';
import { PositionRepository } from '@/infrastructure/repositories/position.repository';
import { CashTransactionRepository } from '@/infrastructure/repositories/cashTransaction.repository';
import type { Transaction, Position, CashTransaction } from '@/domain/types';

/**
 * Aggregated user data for AI insight generation
 */
export interface UserDataSnapshot {
  // User identification
  userId: string;
  snapshotDate: string;

  // Portfolio metrics
  portfolioMetrics: {
    totalValue: number;
    netCashFlow: number;
    totalUnrealizedPL: number;
    totalRealizedPL: number;
    totalFees: number;
  };

  // Open positions
  openPositions: {
    stocks: Position[];
    options: Position[];
    crypto: Position[];
    futures: Position[];
    summary: {
      totalMarketValue: number;
      totalUnrealizedPL: number;
      count: number;
      byAssetType: Record<string, { count: number; marketValue: number; unrealizedPL: number }>;
    };
  };

  // Closed positions (last 30 days)
  recentClosedPositions: {
    positions: Position[];
    summary: {
      totalRealizedPL: number;
      winRate: number;
      count: number;
      avgHoldingPeriod: number; // in days
    };
  };

  // Recent transactions (last 30 days)
  recentTransactions: {
    transactions: Transaction[];
    summary: {
      count: number;
      totalVolume: number;
      avgTradeSize: number;
      mostTradedSymbols: Array<{ symbol: string; count: number }>;
    };
  };

  // Cash flow analysis
  cashFlow: {
    transactions: CashTransaction[];
    summary: {
      totalDeposits: number;
      totalWithdrawals: number;
      totalFees: number;
      netCashFlow: number;
      last30DaysFlow: number;
    };
  };

  // Risk metrics
  riskMetrics: {
    concentration: Array<{ symbol: string; percentage: number }>;
    expiringOptions: Position[];
    largeUnrealizedLosses: Position[];
    leveragedPositions: Position[];
  };

  // Performance metrics
  performanceMetrics: {
    last7Days: { realizedPL: number; unrealizedPL: number };
    last30Days: { realizedPL: number; unrealizedPL: number };
    allTime: { realizedPL: number; unrealizedPL: number };
  };
}

/**
 * Service to aggregate all user data for AI insight generation
 */
export class InsightDataAggregationService {
  /**
   * Aggregate all user data into a comprehensive snapshot
   */
  static async aggregateUserData(userId: string): Promise<UserDataSnapshot> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all data in parallel
    const [
      allPositions,
      allTransactions,
      allCashTransactions,
    ] = await Promise.all([
      PositionRepository.getAll(userId),
      TransactionRepository.getAll(userId),
      CashTransactionRepository.getByUserId(userId),
    ]);

    // Separate open and closed positions
    const openPositions = allPositions.filter(p => p.status === 'open');
    const closedPositions = allPositions.filter(p => p.status === 'closed');
    const recentClosedPositions = closedPositions.filter(p => {
      if (!p.closed_at) return false;
      return new Date(p.closed_at) >= thirtyDaysAgo;
    });

    // Separate positions by asset type
    const stockPositions = openPositions.filter(p => p.asset_type === 'stock');
    const optionPositions = openPositions.filter(p => p.asset_type === 'option');
    const cryptoPositions = openPositions.filter(p => p.asset_type === 'crypto');
    const futuresPositions = openPositions.filter(p => p.asset_type === 'futures');

    // Calculate portfolio metrics
    const totalUnrealizedPL = openPositions.reduce((sum, p) => sum + (p.unrealized_pl || 0), 0);
    const totalRealizedPL = closedPositions.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
    const totalFees = allCashTransactions
      .filter(tx => tx.transaction_code === 'FEE')
      .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

    // Calculate net cash flow (excluding futures margin)
    const netCashFlow = allCashTransactions
      .filter(tx => !['FUTURES_MARGIN', 'FUTURES_MARGIN_RELEASE'].includes(tx.transaction_code || ''))
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Calculate market value by asset type
    const byAssetType: Record<string, { count: number; marketValue: number; unrealizedPL: number }> = {};
    openPositions.forEach(p => {
      const assetType = p.asset_type || 'unknown';
      if (!byAssetType[assetType]) {
        byAssetType[assetType] = { count: 0, marketValue: 0, unrealizedPL: 0 };
      }
      byAssetType[assetType].count++;

      // Market value calculation
      const costBasis = Math.abs(p.total_cost_basis || 0);
      const unrealizedPL = p.unrealized_pl || 0;
      const marketValue = assetType === 'futures' ? unrealizedPL : costBasis + unrealizedPL;

      byAssetType[assetType].marketValue += marketValue;
      byAssetType[assetType].unrealizedPL += unrealizedPL;
    });

    const totalMarketValue = Object.values(byAssetType).reduce((sum, a) => sum + a.marketValue, 0);

    // Calculate recent transaction metrics
    const recentTransactions = allTransactions.filter(t => {
      if (!t.transaction_date) return false;
      return new Date(t.transaction_date) >= thirtyDaysAgo;
    });

    const symbolCounts: Record<string, number> = {};
    recentTransactions.forEach(t => {
      if (t.symbol) {
        symbolCounts[t.symbol] = (symbolCounts[t.symbol] || 0) + 1;
      }
    });

    const mostTradedSymbols = Object.entries(symbolCounts)
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalVolume = recentTransactions.reduce((sum, t) =>
      sum + Math.abs((t.quantity || 0) * (t.price || 0)), 0
    );

    // Calculate closed position metrics
    const winningTrades = recentClosedPositions.filter(p => (p.realized_pl || 0) > 0).length;
    const winRate = recentClosedPositions.length > 0
      ? (winningTrades / recentClosedPositions.length) * 100
      : 0;

    const avgHoldingPeriod = recentClosedPositions.reduce((sum, p) => {
      if (!p.opened_at || !p.closed_at) return sum;
      const days = (new Date(p.closed_at).getTime() - new Date(p.opened_at).getTime()) / (24 * 60 * 60 * 1000);
      return sum + days;
    }, 0) / (recentClosedPositions.length || 1);

    // Calculate cash flow summary
    const totalDeposits = allCashTransactions
      .filter(tx => tx.transaction_code === 'DEPOSIT')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const totalWithdrawals = allCashTransactions
      .filter(tx => tx.transaction_code === 'WITHDRAWAL')
      .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

    const last30DaysFlow = allCashTransactions
      .filter(tx => {
        if (!tx.transaction_date) return false;
        return new Date(tx.transaction_date) >= thirtyDaysAgo;
      })
      .filter(tx => !['FUTURES_MARGIN', 'FUTURES_MARGIN_RELEASE'].includes(tx.transaction_code || ''))
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    // Calculate concentration risk (top holdings as % of portfolio)
    const positionsBySymbol: Record<string, number> = {};
    openPositions.forEach(p => {
      if (p.symbol) {
        const costBasis = Math.abs(p.total_cost_basis || 0);
        const unrealizedPL = p.unrealized_pl || 0;
        const marketValue = p.asset_type === 'futures' ? unrealizedPL : costBasis + unrealizedPL;
        positionsBySymbol[p.symbol] = (positionsBySymbol[p.symbol] || 0) + marketValue;
      }
    });

    const concentration = Object.entries(positionsBySymbol)
      .map(([symbol, value]) => ({
        symbol,
        percentage: totalMarketValue > 0 ? (value / totalMarketValue) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10);

    // Find expiring options (next 7 days)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringOptions = optionPositions.filter(p => {
      if (!p.expiration_date) return false;
      const expDate = new Date(p.expiration_date);
      return expDate >= now && expDate <= sevenDaysFromNow;
    });

    // Find large unrealized losses (> $500 or > 20%)
    const largeUnrealizedLosses = openPositions.filter(p => {
      const unrealizedPL = p.unrealized_pl || 0;
      const costBasis = Math.abs(p.total_cost_basis || 0);
      const percentLoss = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;
      return unrealizedPL < -500 || percentLoss < -20;
    });

    // Find leveraged positions (options with short side)
    const leveragedPositions = optionPositions.filter(p => p.side === 'short');

    // Calculate performance metrics
    const last7DaysTransactions = allTransactions.filter(t => {
      if (!t.transaction_date) return false;
      return new Date(t.transaction_date) >= sevenDaysAgo;
    });

    const last7DaysClosed = closedPositions.filter(p => {
      if (!p.closed_at) return false;
      return new Date(p.closed_at) >= sevenDaysAgo;
    });

    const last30DaysClosed = closedPositions.filter(p => {
      if (!p.closed_at) return false;
      return new Date(p.closed_at) >= thirtyDaysAgo;
    });

    const last7DaysRealized = last7DaysClosed.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
    const last30DaysRealized = last30DaysClosed.reduce((sum, p) => sum + (p.realized_pl || 0), 0);

    // Aggregate everything
    const snapshot: UserDataSnapshot = {
      userId,
      snapshotDate: now.toISOString(),

      portfolioMetrics: {
        totalValue: netCashFlow + totalMarketValue,
        netCashFlow,
        totalUnrealizedPL,
        totalRealizedPL,
        totalFees,
      },

      openPositions: {
        stocks: stockPositions,
        options: optionPositions,
        crypto: cryptoPositions,
        futures: futuresPositions,
        summary: {
          totalMarketValue,
          totalUnrealizedPL,
          count: openPositions.length,
          byAssetType,
        },
      },

      recentClosedPositions: {
        positions: recentClosedPositions,
        summary: {
          totalRealizedPL: recentClosedPositions.reduce((sum, p) => sum + (p.realized_pl || 0), 0),
          winRate,
          count: recentClosedPositions.length,
          avgHoldingPeriod,
        },
      },

      recentTransactions: {
        transactions: recentTransactions,
        summary: {
          count: recentTransactions.length,
          totalVolume,
          avgTradeSize: recentTransactions.length > 0 ? totalVolume / recentTransactions.length : 0,
          mostTradedSymbols,
        },
      },

      cashFlow: {
        transactions: allCashTransactions,
        summary: {
          totalDeposits,
          totalWithdrawals,
          totalFees,
          netCashFlow,
          last30DaysFlow,
        },
      },

      riskMetrics: {
        concentration,
        expiringOptions,
        largeUnrealizedLosses,
        leveragedPositions,
      },

      performanceMetrics: {
        last7Days: {
          realizedPL: last7DaysRealized,
          unrealizedPL: totalUnrealizedPL, // Current unrealized P&L
        },
        last30Days: {
          realizedPL: last30DaysRealized,
          unrealizedPL: totalUnrealizedPL,
        },
        allTime: {
          realizedPL: totalRealizedPL,
          unrealizedPL: totalUnrealizedPL,
        },
      },
    };

    return snapshot;
  }

  /**
   * Generate a concise summary for AI prompt (to reduce token usage)
   */
  static generatePromptSummary(snapshot: UserDataSnapshot): string {
    const { portfolioMetrics, openPositions, recentClosedPositions, recentTransactions, cashFlow, riskMetrics, performanceMetrics } = snapshot;

    return `
# Portfolio Summary

## Overview
- Total Portfolio Value: $${portfolioMetrics.totalValue.toFixed(2)}
- Net Cash Flow: $${portfolioMetrics.netCashFlow.toFixed(2)}
- Total Unrealized P&L: $${portfolioMetrics.totalUnrealizedPL.toFixed(2)}
- Total Realized P&L: $${portfolioMetrics.totalRealizedPL.toFixed(2)}
- Total Fees Paid: $${portfolioMetrics.totalFees.toFixed(2)}

## Open Positions (${openPositions.summary.count})
- Total Market Value: $${openPositions.summary.totalMarketValue.toFixed(2)}
- Stocks: ${openPositions.stocks.length} positions
- Options: ${openPositions.options.length} positions
- Crypto: ${openPositions.crypto.length} positions
- Futures: ${openPositions.futures.length} positions

### By Asset Type
${Object.entries(openPositions.summary.byAssetType).map(([type, data]) =>
  `- ${type}: ${data.count} positions, Market Value: $${data.marketValue.toFixed(2)}, P&L: $${data.unrealizedPL.toFixed(2)}`
).join('\n')}

## Recent Performance (Last 30 Days)
- Closed Positions: ${recentClosedPositions.summary.count}
- Win Rate: ${recentClosedPositions.summary.winRate.toFixed(1)}%
- Realized P&L: $${recentClosedPositions.summary.totalRealizedPL.toFixed(2)}
- Avg Holding Period: ${recentClosedPositions.summary.avgHoldingPeriod.toFixed(1)} days
- Recent Transactions: ${recentTransactions.summary.count}
- Total Volume: $${recentTransactions.summary.totalVolume.toFixed(2)}

### Most Traded Symbols
${recentTransactions.summary.mostTradedSymbols.slice(0, 5).map(s => `- ${s.symbol}: ${s.count} trades`).join('\n')}

## Cash Flow
- Total Deposits: $${cashFlow.summary.totalDeposits.toFixed(2)}
- Total Withdrawals: $${cashFlow.summary.totalWithdrawals.toFixed(2)}
- Last 30 Days Flow: $${cashFlow.summary.last30DaysFlow.toFixed(2)}

## Risk Metrics
- Concentration (Top Holdings):
${riskMetrics.concentration.slice(0, 5).map(c => `  - ${c.symbol}: ${c.percentage.toFixed(1)}%`).join('\n')}
- Expiring Options (Next 7 Days): ${riskMetrics.expiringOptions.length}
- Large Unrealized Losses: ${riskMetrics.largeUnrealizedLosses.length}
- Leveraged Positions: ${riskMetrics.leveragedPositions.length}

## Performance Trends
- Last 7 Days: Realized: $${performanceMetrics.last7Days.realizedPL.toFixed(2)}
- Last 30 Days: Realized: $${performanceMetrics.last30Days.realizedPL.toFixed(2)}
- All Time: Realized: $${performanceMetrics.allTime.realizedPL.toFixed(2)}, Unrealized: $${performanceMetrics.allTime.unrealizedPL.toFixed(2)}
`.trim();
  }
}
