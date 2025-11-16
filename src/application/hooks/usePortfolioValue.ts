import { useMemo } from 'react';
import { useNetCashFlow } from './useNetCashFlow';
import { usePositions } from './usePositions';
import { useStockQuotes } from './useStockQuotes';
import type { Position } from '@/domain/types';

interface PortfolioValue {
  portfolioValue: number;
  netCashFlow: number;
  unrealizedPL: number;
  isLoading: boolean;
}

/**
 * Hook to calculate portfolio metrics
 * Portfolio Value = Net Cash Flow + Unrealized P&L
 * Net Cash Flow = Sum of all cash transaction amounts
 * Unrealized P&L = Sum of unrealized_pl from all open positions
 */
export function usePortfolioValue(userId: string): PortfolioValue {
  const { data: netCashFlow = 0, isLoading: cashLoading } = useNetCashFlow(userId);
  const { data: allPositions, isLoading: positionsLoading } = usePositions(userId);

  // Get all open positions
  const openPositions = useMemo(() => {
    if (!allPositions) return [];
    return allPositions.filter((p: Position) => p.status === 'open');
  }, [allPositions]);

  // Get unique symbols from positions for fetching quotes
  const positionSymbols = useMemo(() => {
    const symbols = new Set<string>();
    openPositions.forEach((p: Position) => {
      if (p.symbol && (p.asset_type === 'stock' || p.asset_type === 'crypto')) {
        symbols.add(p.symbol);
      }
    });
    return Array.from(symbols);
  }, [openPositions]);

  // Fetch quotes for stock/crypto positions
  // Only fetch if we have symbols to query
  const shouldFetchQuotes = positionSymbols.length > 0;
  const { data: quotes = {} } = useStockQuotes(positionSymbols, shouldFetchQuotes);

  // Calculate unrealized P&L from all open positions
  // For stocks/crypto: Use current market price if available, otherwise use stored unrealized_pl
  // For options/futures: Use stored unrealized_pl (would need specialized pricing)
  const unrealizedPL = useMemo(() => {
    if (!openPositions || openPositions.length === 0) return 0;

    return openPositions.reduce((total, position) => {
      // For stocks and crypto, calculate dynamically if we have current quotes
      if ((position.asset_type === 'stock' || position.asset_type === 'crypto') && position.symbol) {
        const quote = quotes[position.symbol];
        if (quote && position.current_quantity && position.average_opening_price) {
          // Calculate: (Current Price - Avg Price) * Quantity
          const currentPrice = quote.price;
          const marketValue = currentPrice * position.current_quantity;
          const costBasis = Math.abs(position.total_cost_basis || 0);
          const calculatedUnrealizedPL = marketValue - costBasis;
          return total + calculatedUnrealizedPL;
        }
      }
      
      // For options, futures, or if no quote available, use stored unrealized_pl
      return total + (position.unrealized_pl || 0);
    }, 0);
  }, [openPositions, quotes]);

  // Calculate total portfolio value
  // Portfolio Value = Net Cash Flow + Unrealized P&L
  const portfolioValue = useMemo(() => {
    return netCashFlow + unrealizedPL;
  }, [netCashFlow, unrealizedPL]);

  return {
    portfolioValue,
    netCashFlow,
    unrealizedPL,
    isLoading: cashLoading || positionsLoading,
  };
}

