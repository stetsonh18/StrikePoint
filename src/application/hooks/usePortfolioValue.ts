import { useMemo } from 'react';
import { useNetCashFlow } from './useNetCashFlow';
import { usePositions } from './usePositions';
import { useStockQuotes } from './useStockQuotes';
import { useCryptoQuotes } from './useCryptoQuotes';
import { useOptionQuotes } from './useOptionQuotes';
import { useOptionsChain } from './useOptionsChain';
import { getCoinIdFromSymbol } from '@/infrastructure/services/cryptoMarketDataService';
import { buildTradierOptionSymbol } from '@/shared/utils/positionTransformers';
import { useState, useEffect } from 'react';
import type { Position, OptionQuote, OptionsChain } from '@/domain/types';

interface AssetMetrics {
  count: number;
  marketValue: number;
  unrealizedPL: number;
}

interface AssetMetricsMap {
  stocks: AssetMetrics;
  options: AssetMetrics;
  crypto: AssetMetrics;
  futures: AssetMetrics;
}

interface PortfolioValue {
  portfolioValue: number;
  netCashFlow: number;
  unrealizedPL: number;
  stockMarketValue: number;
  cryptoMarketValue: number;
  totalMarketValue: number;
  assetMetrics: AssetMetricsMap;
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

  const optionUnderlyingSymbols = useMemo(() => {
    const symbols = new Set<string>();
    openPositions.forEach((position) => {
      if (position.asset_type === 'option' && position.symbol) {
        symbols.add(position.symbol);
      }
    });
    return Array.from(symbols);
  }, [openPositions]);

  const chain1 = useOptionsChain(optionUnderlyingSymbols[0] || '', undefined, undefined, undefined, !!optionUnderlyingSymbols[0]);
  const chain2 = useOptionsChain(optionUnderlyingSymbols[1] || '', undefined, undefined, undefined, !!optionUnderlyingSymbols[1]);
  const chain3 = useOptionsChain(optionUnderlyingSymbols[2] || '', undefined, undefined, undefined, !!optionUnderlyingSymbols[2]);
  const chain4 = useOptionsChain(optionUnderlyingSymbols[3] || '', undefined, undefined, undefined, !!optionUnderlyingSymbols[3]);
  const chain5 = useOptionsChain(optionUnderlyingSymbols[4] || '', undefined, undefined, undefined, !!optionUnderlyingSymbols[4]);

  const chainsByUnderlying = useMemo(() => {
    const chains = [chain1.data, chain2.data, chain3.data, chain4.data, chain5.data];
    const map: Record<string, OptionsChain> = {};

    optionUnderlyingSymbols.slice(0, chains.length).forEach((symbol, index) => {
      const chainData = chains[index];
      if (chainData) {
        map[symbol] = chainData;
      }
    });

    return map;
  }, [
    optionUnderlyingSymbols,
    chain1.data,
    chain2.data,
    chain3.data,
    chain4.data,
    chain5.data,
  ]);

  const { metrics, totalUnrealizedPL } = useMemo(() => {
    if (!openPositions || openPositions.length === 0) {
      return {
        metrics: {
          stocks: { count: 0, marketValue: 0, unrealizedPL: 0 },
          options: { count: 0, marketValue: 0, unrealizedPL: 0 },
          crypto: { count: 0, marketValue: 0, unrealizedPL: 0 },
          futures: { count: 0, marketValue: 0, unrealizedPL: 0 },
        } as AssetMetricsMap,
        totalUnrealizedPL: 0,
      };
    }

    const metrics: AssetMetricsMap = {
      stocks: { count: 0, marketValue: 0, unrealizedPL: 0 },
      options: { count: 0, marketValue: 0, unrealizedPL: 0 },
      crypto: { count: 0, marketValue: 0, unrealizedPL: 0 },
      futures: { count: 0, marketValue: 0, unrealizedPL: 0 },
    };

    openPositions.forEach((position) => {
      const costBasis = Math.abs(position.total_cost_basis || 0);
      const storedUnrealizedPL = position.unrealized_pl || 0;

      if (position.asset_type === 'stock' && position.symbol) {
        const quote = stockQuotes[position.symbol];
        const isLong = position.side === 'long';
        let marketValue = costBasis + storedUnrealizedPL;
        let unrealizedPL = storedUnrealizedPL;

        if (quote && position.current_quantity) {
          const currentPrice = quote.price;
          const rawMarketValue = currentPrice * position.current_quantity;
          
          // For short positions: market value is negative (liability)
          // For long positions: market value is positive (asset)
          marketValue = isLong ? rawMarketValue : -rawMarketValue;
          
          // Calculate unrealized P&L
          // Long: P&L = marketValue - costBasis
          // Short: P&L = costBasis - marketValue (since marketValue is negative, this becomes costBasis - (-rawMarketValue) = costBasis + rawMarketValue)
          // But we need: P&L = costBasis - rawMarketValue (what you received minus what you'd pay to close)
          unrealizedPL = isLong ? rawMarketValue - costBasis : costBasis - rawMarketValue;
        } else {
          // Fallback: use stored unrealized P&L
          // For short positions, market value should be negative
          marketValue = isLong ? costBasis + storedUnrealizedPL : -costBasis + storedUnrealizedPL;
        }

        metrics.stocks.count++;
        metrics.stocks.marketValue += marketValue;
        metrics.stocks.unrealizedPL += unrealizedPL;
        return;
      }

      if (position.asset_type === 'crypto' && position.symbol) {
        const symbol = position.symbol.toUpperCase();
        const quote = cryptoQuotes[symbol];
        const isLong = position.side === 'long';
        let marketValue = costBasis + storedUnrealizedPL;
        let unrealizedPL = storedUnrealizedPL;

        if (quote && position.current_quantity) {
          const currentPrice = quote.current_price;
          const rawMarketValue = currentPrice * position.current_quantity;
          
          // For short positions: market value is negative (liability)
          // For long positions: market value is positive (asset)
          marketValue = isLong ? rawMarketValue : -rawMarketValue;
          
          // Calculate unrealized P&L
          // Long: P&L = marketValue - costBasis
          // Short: P&L = costBasis - rawMarketValue (what you received minus what you'd pay to close)
          unrealizedPL = isLong ? rawMarketValue - costBasis : costBasis - rawMarketValue;
        } else {
          // Fallback: use stored unrealized P&L
          // For short positions, market value should be negative
          marketValue = isLong ? costBasis + storedUnrealizedPL : -costBasis + storedUnrealizedPL;
        }

        metrics.crypto.count++;
        metrics.crypto.marketValue += marketValue;
        metrics.crypto.unrealizedPL += unrealizedPL;
        return;
      }

      if (
        position.asset_type === 'option' &&
        position.symbol &&
        position.expiration_date &&
        position.strike_price &&
        position.option_type
      ) {
        metrics.options.count++;
        const isLong = position.side === 'long';
        // Fallback: For long: asset value, For short: liability (negative)
        let marketValue = isLong ? costBasis + storedUnrealizedPL : -costBasis + storedUnrealizedPL;
        let unrealizedPL = storedUnrealizedPL;

        let quote: OptionQuote | null = null;
        let tradierSymbol: string | null = null;

        try {
          tradierSymbol = buildTradierOptionSymbol(
            position.symbol,
            position.expiration_date,
            position.option_type as 'call' | 'put',
            position.strike_price
          );
          quote = optionQuotes[tradierSymbol] || null;
        } catch (e) {
          console.error('Error building Tradier option symbol:', e, position);
        }

        if (!quote) {
          const chainData = chainsByUnderlying[position.symbol];
          if (chainData && position.expiration_date) {
            const expirationChain = chainData.chain?.[position.expiration_date];
            if (expirationChain) {
              const chainEntry = expirationChain.find(
                (entry) =>
                  entry.strike === position.strike_price &&
                  entry.option_type === position.option_type
              );

              if (chainEntry) {
                quote = {
                  symbol: chainEntry.symbol || tradierSymbol || `${position.symbol}-${position.expiration_date}-${position.strike_price}-${position.option_type}`,
                  underlying: chainEntry.underlying || position.symbol,
                  expiration: chainEntry.expiration || position.expiration_date,
                  strike: chainEntry.strike,
                  option_type: chainEntry.option_type,
                  bid: chainEntry.bid,
                  ask: chainEntry.ask,
                  last: chainEntry.last,
                };
              }
            }
          }
        }

        if (quote && position.current_quantity) {
          const multiplier = position.multiplier || 100;
          const currentPrice =
            quote.last ||
            (quote.bid && quote.ask ? (quote.bid + quote.ask) / 2 : position.average_opening_price || 0);
          const rawMarketValue = position.current_quantity * multiplier * currentPrice;
          const isLong = position.side === 'long';

          // Calculate unrealized P&L
          unrealizedPL = isLong ? rawMarketValue - costBasis : costBasis - rawMarketValue;

          // For portfolio value: long options are assets (+), short options are liabilities (-)
          marketValue = isLong ? rawMarketValue : -rawMarketValue;
        }

        metrics.options.marketValue += marketValue;
        metrics.options.unrealizedPL += unrealizedPL;
        return;
      }

      if (position.asset_type === 'futures') {
        metrics.futures.count++;
        metrics.futures.marketValue += storedUnrealizedPL;
        metrics.futures.unrealizedPL += storedUnrealizedPL;
        return;
      }

      // Fallback for other/unknown asset types
      const fallbackMarketValue = costBasis + storedUnrealizedPL;
      metrics.stocks.count++;
      metrics.stocks.marketValue += fallbackMarketValue;
      metrics.stocks.unrealizedPL += storedUnrealizedPL;
    });

    const totalUnrealizedPL = Object.values(metrics).reduce((sum, asset) => sum + asset.unrealizedPL, 0);

    return { metrics, totalUnrealizedPL };
  }, [openPositions, stockQuotes, cryptoQuotes, optionQuotes, chainsByUnderlying]);

  const stockMarketValue = metrics.stocks.marketValue;
  const cryptoMarketValue = metrics.crypto.marketValue;
  const optionMarketValue = metrics.options.marketValue;
  const futuresMarketValue = metrics.futures.marketValue;

  const totalMarketValue = stockMarketValue + cryptoMarketValue + optionMarketValue + futuresMarketValue;

  // Portfolio Value = Net Cash Flow + Stock Value + Crypto Value
  const portfolioValue = useMemo(() => {
    return netCashFlow + totalMarketValue;
  }, [netCashFlow, totalMarketValue]);

  return {
    portfolioValue,
    netCashFlow,
    unrealizedPL: totalUnrealizedPL,
    stockMarketValue,
    cryptoMarketValue,
    totalMarketValue,
    assetMetrics: metrics,
    isLoading: cashLoading || positionsLoading,
  };
}

