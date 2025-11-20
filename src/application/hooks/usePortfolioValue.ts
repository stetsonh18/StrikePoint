import { useMemo } from 'react';
import { useNetCashFlow } from './useNetCashFlow';
import { usePositions } from './usePositions';
import { useStockQuotes } from './useStockQuotes';
import { useCryptoQuotes } from './useCryptoQuotes';
import { useOptionQuotes } from './useOptionQuotes';
import { getCoinIdFromSymbol } from '@/infrastructure/services/cryptoMarketDataService';
import { buildTradierOptionSymbol } from '@/shared/utils/positionTransformers';
import { useState, useEffect } from 'react';
import type { Position } from '@/domain/types';

interface PortfolioValue {
  portfolioValue: number;
  netCashFlow: number;
  unrealizedPL: number;
  totalMarketValue: number;
  isLoading: boolean;
}

/**
 * Hook to calculate portfolio metrics
 * Portfolio Value = Net Cash Flow + Total Market Value of Open Positions
 * Net Cash Flow = Sum of all cash transaction amounts
 * Total Market Value = Sum of current market values of all open positions
 * Unrealized P&L = Total Market Value - Total Cost Basis
 */
export function usePortfolioValue(userId: string): PortfolioValue {
  const { data: netCashFlow = 0, isLoading: cashLoading } = useNetCashFlow(userId);
  const { data: allPositions, isLoading: positionsLoading } = usePositions(userId);

  // Get all open positions
  const openPositions = useMemo(() => {
    if (!allPositions) return [];
    return allPositions.filter((p: Position) => p.status === 'open');
  }, [allPositions]);

  // Separate stock and crypto symbols
  const stockSymbols = useMemo(() => {
    const symbols = new Set<string>();
    openPositions.forEach((p: Position) => {
      if (p.symbol && p.asset_type === 'stock') {
        symbols.add(p.symbol);
      }
    });
    return Array.from(symbols);
  }, [openPositions]);

  const cryptoSymbols = useMemo(() => {
    const symbols = new Set<string>();
    openPositions.forEach((p: Position) => {
      if (p.symbol && p.asset_type === 'crypto') {
        symbols.add(p.symbol);
      }
    });
    return Array.from(symbols);
  }, [openPositions]);

  // Build Tradier option symbols for all open option positions
  const optionSymbols = useMemo(() => {
    const symbols: string[] = [];
    openPositions.forEach((p: Position) => {
      if (p.asset_type === 'option' && p.symbol && p.expiration_date && p.strike_price && p.option_type) {
        try {
          const tradierSymbol = buildTradierOptionSymbol(
            p.symbol,
            p.expiration_date,
            p.option_type as 'call' | 'put',
            p.strike_price
          );
          symbols.push(tradierSymbol);
        } catch (e) {
          console.error('Error building Tradier option symbol:', e, p);
        }
      }
    });
    return symbols;
  }, [openPositions]);

  // Fetch stock quotes
  const shouldFetchStockQuotes = stockSymbols.length > 0;
  const { data: stockQuotes = {} } = useStockQuotes(stockSymbols, shouldFetchStockQuotes);

  // Fetch crypto quotes - need to convert symbols to coin IDs
  const [cryptoCoinIds, setCryptoCoinIds] = useState<string[]>([]);
  useEffect(() => {
    let isMounted = true;

    const fetchCoinIds = async () => {
      const uniqueSymbols = Array.from(new Set(cryptoSymbols));
      if (uniqueSymbols.length === 0) {
        if (isMounted) {
          setCryptoCoinIds([]);
        }
        return;
      }

      const ids = await Promise.all(uniqueSymbols.map((symbol) => getCoinIdFromSymbol(symbol)));
      if (isMounted) {
        setCryptoCoinIds(ids.filter((id): id is string => Boolean(id)));
      }
    };

    fetchCoinIds();

    return () => {
      isMounted = false;
    };
  }, [cryptoSymbols]);

  const { data: cryptoQuotes = {} } = useCryptoQuotes(cryptoCoinIds, cryptoCoinIds.length > 0);

  // Fetch individual option quotes using Tradier API
  const { data: optionQuotes = {} } = useOptionQuotes(optionSymbols, optionSymbols.length > 0);

  // Calculate market value and unrealized P&L from all open positions
  // For stocks/crypto: Use current market price if available, otherwise use stored unrealized_pl
  // For options: Use real-time prices from Tradier API option quotes
  // For futures: Use stored unrealized_pl (real-time pricing coming soon)
  const { totalMarketValue, totalUnrealizedPL: unrealizedPL } = useMemo(() => {
    if (!openPositions || openPositions.length === 0) {
      return { totalMarketValue: 0, totalUnrealizedPL: 0 };
    }

    let totalMarketValue = 0;
    let totalUnrealizedPL = 0;
    const breakdown: Record<string, { market: number; pl: number; count: number }> = {};

    openPositions.forEach((position) => {
      const assetType = position.asset_type || 'unknown';
      if (!breakdown[assetType]) {
        breakdown[assetType] = { market: 0, pl: 0, count: 0 };
      }
      breakdown[assetType].count++;

      // For stocks, calculate dynamically if we have current quotes
      if (position.asset_type === 'stock' && position.symbol) {
        const quote = stockQuotes[position.symbol];
        if (quote && position.current_quantity && position.average_opening_price) {
          const currentPrice = quote.price;
          const marketValue = currentPrice * position.current_quantity;
          const costBasis = Math.abs(position.total_cost_basis || 0);
          const calculatedUnrealizedPL = marketValue - costBasis;

          totalMarketValue += marketValue;
          totalUnrealizedPL += calculatedUnrealizedPL;
          breakdown[assetType].market += marketValue;
          breakdown[assetType].pl += calculatedUnrealizedPL;
          return;
        }
      }

      // For crypto, calculate dynamically if we have current quotes
      if (position.asset_type === 'crypto' && position.symbol) {
        const quote = cryptoQuotes[position.symbol];
        if (quote && position.current_quantity && position.average_opening_price) {
          const currentPrice = quote.current_price;
          const marketValue = currentPrice * position.current_quantity;
          const costBasis = Math.abs(position.total_cost_basis || 0);
          const calculatedUnrealizedPL = marketValue - costBasis;

          totalMarketValue += marketValue;
          totalUnrealizedPL += calculatedUnrealizedPL;
          breakdown[assetType].market += marketValue;
          breakdown[assetType].pl += calculatedUnrealizedPL;
          return;
        }
      }

      // For options, calculate dynamically if we have option quotes
      if (position.asset_type === 'option' && position.symbol && position.expiration_date && position.strike_price && position.option_type) {
        try {
          const tradierSymbol = buildTradierOptionSymbol(
            position.symbol,
            position.expiration_date,
            position.option_type as 'call' | 'put',
            position.strike_price
          );

          const quote = optionQuotes[tradierSymbol];

          if (quote && position.current_quantity) {
            const currentPrice = quote.last ||
              (quote.bid && quote.ask ? (quote.bid + quote.ask) / 2 : position.average_opening_price || 0);

            const multiplier = position.multiplier || 100;
            const marketValue = position.current_quantity * multiplier * currentPrice;
            const costBasis = Math.abs(position.total_cost_basis || 0);
            const isLong = position.side === 'long';

            // Calculate P&L correctly for long vs short:
            // Long: You paid (negative cost basis), P&L = marketValue - |costBasis|
            // Short: You received credit (positive cost basis), P&L = costBasis - marketValue
            const calculatedUnrealizedPL = isLong
              ? marketValue - costBasis
              : costBasis - marketValue;

            totalMarketValue += marketValue;
            totalUnrealizedPL += calculatedUnrealizedPL;
            breakdown[assetType].market += marketValue;
            breakdown[assetType].pl += calculatedUnrealizedPL;
            return;
          }
        } catch (e) {
          console.error('Error calculating option P&L:', e, position);
        }
      }

      // For futures, or if no quote available, use stored unrealized_pl
      const storedUnrealizedPL = position.unrealized_pl || 0;

      // For futures: Only add unrealized P&L (margin-based)
      // For others: Add cost basis + unrealized P&L = market value
      if (position.asset_type === 'futures') {
        totalMarketValue += storedUnrealizedPL;
        totalUnrealizedPL += storedUnrealizedPL;
        breakdown[assetType].market += storedUnrealizedPL;
        breakdown[assetType].pl += storedUnrealizedPL;
      } else {
        const costBasis = Math.abs(position.total_cost_basis || 0);
        const marketValue = costBasis + storedUnrealizedPL;
        totalMarketValue += marketValue;
        totalUnrealizedPL += storedUnrealizedPL;
        breakdown[assetType].market += marketValue;
        breakdown[assetType].pl += storedUnrealizedPL;
      }
    });

    return { totalMarketValue, totalUnrealizedPL };
  }, [openPositions, stockQuotes, cryptoQuotes, optionQuotes]);

  // Calculate total portfolio value
  // Portfolio Value = Net Cash Flow + Market Value of Open Positions
  // Where Net Cash Flow = Deposits - Withdrawals - Fees + Buy/Sell transactions + Realized P&L
  const portfolioValue = useMemo(() => {
    return netCashFlow + totalMarketValue;
  }, [netCashFlow, totalMarketValue]);

  return {
    portfolioValue,
    netCashFlow,
    unrealizedPL,
    totalMarketValue, // Total market value of all open positions
    isLoading: cashLoading || positionsLoading,
  };
}

