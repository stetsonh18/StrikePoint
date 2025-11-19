import React, { useState, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Plus, Download, Search, Calendar, DollarSign, Activity, Sparkles, Layers, Edit, Trash2 } from 'lucide-react';
import type { OptionContract, OptionTransaction, OptionChainEntry, Position, Transaction } from '@/domain/types';
import { useAuthStore } from '@/application/stores/auth.store';
import { usePositions, useUpdatePosition, useDeletePosition } from '@/application/hooks/usePositions';
import { useTransactions, useUpdateTransaction, useDeleteTransaction } from '@/application/hooks/useTransactions';
import { useOptionsChain } from '@/application/hooks/useOptionsChain';
import { useOptionQuotes } from '@/application/hooks/useOptionQuotes';
import { useStrategies } from '@/application/hooks/useStrategies';
import { toOptionContract, toOptionTransaction, buildTradierOptionSymbol } from '@/shared/utils/positionTransformers';
import { TransactionForm } from '@/presentation/components/TransactionForm';
import { PositionEditForm } from '@/presentation/components/PositionEditForm';
import { OptionsMultiLegForm } from '@/presentation/components/OptionsMultiLegForm';
import { OptionsChain } from '@/presentation/components/OptionsChain';
import { MarketStatusIndicator } from '@/presentation/components/MarketStatusIndicator';
import { PositionDetailsModal } from '@/presentation/components/PositionDetailsModal';
import { useQueryClient } from '@tanstack/react-query';
import { TableSkeleton } from '@/presentation/components/SkeletonLoader';
import { EmptyPositions } from '@/presentation/components/EnhancedEmptyState';
import { formatDate as formatDateUtil } from '@/shared/utils/dateUtils';
import { useToast } from '@/shared/hooks/useToast';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { ConfirmationDialog } from '@/presentation/components/ConfirmationDialog';
import { SortableTableHeader } from '@/presentation/components/SortableTableHeader';
import { sortData, type SortConfig } from '@/shared/utils/tableSorting';
import { getUserFriendlyErrorMessage } from '@/shared/utils/errorHandler';
import { logger } from '@/shared/utils/logger';
import { MobileTableCard, MobileTableCardHeader, MobileTableCardRow } from '@/presentation/components/MobileTableCard';

const Options: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id || '';
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'positions' | 'transactions' | 'chain'>('positions');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'call' | 'put'>('all');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showMultiLegForm, setShowMultiLegForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [chainSymbol, setChainSymbol] = useState('');
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<OptionContract | null>(null);
  const [selectedPositionForClose, setSelectedPositionForClose] = useState<OptionContract | null>(null);
  const [selectedStrategyGroupForClose, setSelectedStrategyGroupForClose] = useState<OptionContract[] | null>(null);
  const [showCloseMultiLegForm, setShowCloseMultiLegForm] = useState(false);
  const [selectedStrategyGroup, setSelectedStrategyGroup] = useState<OptionContract[] | null>(null);
  const [positionSort, setPositionSort] = useState<SortConfig<OptionContract> | null>(null);
  const [transactionSort, setTransactionSort] = useState<SortConfig<OptionTransaction> | null>(null);
  
  const toast = useToast();
  const confirmation = useConfirmation();
  const updatePositionMutation = useUpdatePosition();
  const deletePositionMutation = useDeletePosition();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();

  // Fetch option positions (open only for display)
  const { data: allPositions, isLoading: positionsLoading } = usePositions(userId, {
    asset_type: 'option',
    status: 'open',
  });

  // Fetch all option positions (including closed) for realized P&L calculation
  const { data: allOptionPositions } = usePositions(userId, {
    asset_type: 'option',
  });

  // Fetch option transactions
  const { data: allTransactions, isLoading: transactionsLoading } = useTransactions(userId, {
    asset_type: 'option',
  });

  // Fetch strategies to get total_opening_cost for spread P&L calculation
  const { data: strategies } = useStrategies(userId, {
    status: 'open',
  });

  // Fetch all strategies (including closed) for realized P&L calculation
  const { data: allStrategies } = useStrategies(userId);


  // Build Tradier option symbols for all open positions
  const optionSymbols = useMemo(() => {
    if (!allPositions) return [];
    const symbols: string[] = [];
    allPositions
      .filter((p) => p.asset_type === 'option' && p.status === 'open' && p.symbol && p.expiration_date && p.strike_price && p.option_type)
      .forEach((p) => {
        try {
          const tradierSymbol = buildTradierOptionSymbol(
            p.symbol,
            p.expiration_date,
            p.option_type as 'call' | 'put',
            p.strike_price
          );
          symbols.push(tradierSymbol);
        } catch (e) {
          logger.error('Error building Tradier option symbol', e, { position: p });
        }
      });
    return symbols;
  }, [allPositions]);

  // Fetch individual option quotes using Tradier API
  const { data: optionQuotes = {} } = useOptionQuotes(optionSymbols, optionSymbols.length > 0);

  // Get unique underlying symbols from positions (for options chain display, limit to first 5 for performance)
  const underlyingSymbols = useMemo(() => {
    if (!allPositions) return [];
    const symbols = new Set<string>();
    allPositions
      .filter((p) => p.asset_type === 'option' && p.status === 'open' && p.symbol)
      .forEach((p) => symbols.add(p.symbol));
    return Array.from(symbols).slice(0, 5); // Limit to 5 symbols to avoid too many API calls
  }, [allPositions]);

  // Fetch options chains for each underlying symbol (up to 5) - used for chain display only
  const chain1 = useOptionsChain(underlyingSymbols[0] || '', undefined, undefined, undefined, !!underlyingSymbols[0]);
  const chain2 = useOptionsChain(underlyingSymbols[1] || '', undefined, undefined, undefined, !!underlyingSymbols[1]);
  const chain3 = useOptionsChain(underlyingSymbols[2] || '', undefined, undefined, undefined, !!underlyingSymbols[2]);
  const chain4 = useOptionsChain(underlyingSymbols[3] || '', undefined, undefined, undefined, !!underlyingSymbols[3]);
  const chain5 = useOptionsChain(underlyingSymbols[4] || '', undefined, undefined, undefined, !!underlyingSymbols[4]);
  
  // Combine all chain data into a map (for chain display)
  const chainsByUnderlying = useMemo(() => {
    const map: Record<string, typeof chain1.data> = {};
    const chains = [chain1, chain2, chain3, chain4, chain5];
    underlyingSymbols.forEach((symbol, index) => {
      const chainData = chains[index]?.data;
      if (chainData) {
        map[symbol] = chainData;
      }
    });
    return map;
  }, [underlyingSymbols, chain1.data, chain2.data, chain3.data, chain4.data, chain5.data]);

  // Transform positions with real-time prices from Tradier option quotes
  // Include all positions (both with and without strategies) for price updates
  const positions = useMemo(() => {
    if (!allPositions) return [];
    
    const basePositions = allPositions
      .filter((p) => p.asset_type === 'option' && p.status === 'open' && p.option_type && p.strike_price && p.expiration_date)
      .map((p) => {
        try {
          return toOptionContract(p);
        } catch (e) {
          return null;
        }
      })
      .filter((p): p is OptionContract => p !== null);

    // Update positions with real-time quotes from Tradier API
    return basePositions.map((position) => {
      // Build Tradier option symbol for this position
      let tradierSymbol: string | null = null;
      try {
        tradierSymbol = buildTradierOptionSymbol(
          position.underlyingSymbol,
          position.expirationDate,
          position.optionType,
          position.strikePrice
        );
      } catch (e) {
        logger.error('Error building Tradier symbol for position', e, { position });
      }

      // Get quote for this option symbol
      let quote = tradierSymbol ? optionQuotes[tradierSymbol] : null;
      
      // If no direct quote, try to find it in the options chain data as fallback
      if (!quote && position.underlyingSymbol) {
        const chainData = chainsByUnderlying[position.underlyingSymbol];
        if (chainData?.chain && position.expirationDate) {
          const expirationChain = chainData.chain[position.expirationDate];
          if (expirationChain) {
            const chainEntry = expirationChain.find(
              (entry) =>
                entry.strike === position.strikePrice &&
                entry.option_type === position.optionType
            );
            if (chainEntry) {
              // Convert chain entry to quote-like object
              quote = {
                symbol: chainEntry.symbol,
                underlying: chainEntry.underlying,
                expiration: chainEntry.expiration,
                strike: chainEntry.strike,
                option_type: chainEntry.option_type,
                bid: chainEntry.bid,
                ask: chainEntry.ask,
                last: chainEntry.last,
                volume: chainEntry.volume,
                open_interest: chainEntry.open_interest,
                implied_volatility: chainEntry.implied_volatility,
                delta: chainEntry.delta,
                gamma: chainEntry.gamma,
                theta: chainEntry.theta,
                vega: chainEntry.vega,
                rho: chainEntry.rho,
              };
              logger.debug('Using chain data for option', { 
                underlyingSymbol: position.underlyingSymbol,
                expirationDate: position.expirationDate,
                optionType: position.optionType,
                strikePrice: position.strikePrice
              });
            }
          }
        }
      }

      if (quote) {
        // Use last price, or mid price (bid/ask average) if last is not available
        const currentPrice = quote.last || 
          (quote.bid && quote.ask ? (quote.bid + quote.ask) / 2 : position.averagePrice);
        
        const multiplier = position.multiplier || 100;
        const marketValue = position.quantity * multiplier * currentPrice;
        
        // Get original position to check side and actual total_cost_basis
        const originalPosition = allPositions.find(p => p.id === position.id);
        const actualCostBasis = originalPosition?.total_cost_basis || 0;
        const isLong = position.side === 'long';
        
        // Calculate P&L correctly for long vs short:
        // Long: You paid (negative cost basis), P&L = marketValue - |costBasis|
        // Short: You received credit (positive cost basis), P&L = costBasis - marketValue
        const unrealizedPL = isLong 
          ? marketValue - Math.abs(actualCostBasis)
          : Math.abs(actualCostBasis) - marketValue;
        
        const costBasisAbs = Math.abs(actualCostBasis);
        const unrealizedPLPercent = costBasisAbs > 0 ? (unrealizedPL / costBasisAbs) * 100 : 0;

        return {
          ...position,
          currentPrice,
          marketValue,
          unrealizedPL,
          unrealizedPLPercent,
          delta: quote.delta,
          gamma: quote.gamma,
          theta: quote.theta,
          vega: quote.vega,
          impliedVolatility: quote.implied_volatility,
        };
      }

      // If no quote available, return position with average price as fallback
      // Still calculate P&L correctly
      const originalPosition = allPositions.find(p => p.id === position.id);
      const actualCostBasis = originalPosition?.total_cost_basis || 0;
      const isLong = position.side === 'long';
      const fallbackMarketValue = position.quantity * (position.multiplier || 100) * position.averagePrice;
      
      const fallbackUnrealizedPL = isLong
        ? fallbackMarketValue - Math.abs(actualCostBasis)
        : Math.abs(actualCostBasis) - fallbackMarketValue;
      
      const costBasisAbs = Math.abs(actualCostBasis);
      const fallbackUnrealizedPLPercent = costBasisAbs > 0 ? (fallbackUnrealizedPL / costBasisAbs) * 100 : 0;
      
      return {
        ...position,
        currentPrice: position.averagePrice,
        marketValue: fallbackMarketValue,
        unrealizedPL: fallbackUnrealizedPL,
        unrealizedPLPercent: fallbackUnrealizedPLPercent,
      };
    });
  }, [allPositions, optionQuotes, chainsByUnderlying]);

  // Transform transactions
  const transactions = useMemo(() => {
    if (!allTransactions) return [];
    return allTransactions
      .filter((t) => t.asset_type === 'option' && t.option_type && t.strike_price && t.expiration_date)
      .map((t) => {
        try {
          return toOptionTransaction(t);
        } catch (e) {
          return null;
        }
      })
      .filter((t): t is OptionTransaction => t !== null);
  }, [allTransactions]);

  // Calculate realized P&L from all option positions and strategies
  const realizedPL = useMemo(() => {
    if (!allOptionPositions || !allStrategies) return 0;

    // Get closed strategies with realized P/L (multi-leg trades count as one)
    const strategiesWithRealizedPL = allStrategies.filter(
      (s) => s.status !== 'open' && (s.realized_pl || 0) !== 0
    );

    // Get individual positions with realized P/L
    // Include positions that are:
    // 1. Not part of a strategy, OR
    // 2. Part of a strategy but the strategy is open or doesn't have realized_pl (count position individually)
    // Exclude positions that are part of a closed strategy with realized_pl (those are counted via the strategy)
    const individualPositionsWithRealizedPL = allOptionPositions.filter(
      (p) => {
        const hasRealizedPL = p.status === 'closed' || 
          (p.status === 'open' && (p.realized_pl || 0) !== 0 && (p.current_quantity || 0) < (p.opening_quantity || 0));
        
        if (!hasRealizedPL) return false;
        
        // If position is not part of a strategy, include it
        if (!p.strategy_id) return true;
        
        // If position is part of a strategy, check if we should exclude it
        const strategy = allStrategies.find(s => s.id === p.strategy_id);
        if (!strategy) return true; // Strategy not found, count position individually
        
        // Only exclude if strategy is closed AND has realized_pl
        const strategyIsClosedWithPL = strategy.status !== 'open' && (strategy.realized_pl || 0) !== 0;
        return !strategyIsClosedWithPL; // Include if strategy is NOT closed with PL
      }
    );

    // Calculate realized P&L from strategies (multi-leg trades count as one)
    const strategyRealizedPL = strategiesWithRealizedPL.reduce((sum, s) => sum + (s.realized_pl || 0), 0);
    
    // Calculate realized P&L from individual positions (single-leg trades)
    const individualRealizedPL = individualPositionsWithRealizedPL.reduce((sum, p) => sum + (p.realized_pl || 0), 0);
    
    // Total realized P&L
    return strategyRealizedPL + individualRealizedPL;
  }, [allOptionPositions, allStrategies]);

  // Calculate portfolio summary
  const portfolioSummary = useMemo(() => {
    const totalValue = positions.reduce((sum, pos) => sum + (pos.marketValue || 0), 0);
    const totalCost = positions.reduce((sum, pos) => sum + pos.costBasis, 0);
    const totalPL = positions.reduce((sum, pos) => sum + (pos.unrealizedPL || 0), 0);
    const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;

    const callsCount = positions.filter(p => p.optionType === 'call').length;
    const putsCount = positions.filter(p => p.optionType === 'put').length;

    return {
      totalValue,
      totalCost,
      totalPL,
      totalPLPercent,
      positionsCount: positions.length,
      callsCount,
      putsCount,
      realizedPL,
    };
  }, [positions, realizedPL]);

  // Group positions by strategy_id - positions with same strategy_id are grouped together
  // Only group if the strategy has more than one position (multi-leg)
  const groupedPositions = useMemo(() => {
    if (!allPositions || !positions) return { individual: [], strategies: [] };
    
    // Separate positions into individual and strategy groups
    const individual: OptionContract[] = [];
    const strategyGroups: Record<string, OptionContract[]> = {};
    
    positions.forEach((pos) => {
      const originalPosition = allPositions.find(p => p.id === pos.id);
      if (originalPosition?.strategy_id) {
        const strategyId = originalPosition.strategy_id;
        if (!strategyGroups[strategyId]) {
          strategyGroups[strategyId] = [];
        }
        strategyGroups[strategyId].push(pos);
      } else {
        individual.push(pos);
      }
    });
    
    // Only group strategies that have more than one position (multi-leg)
    // Single positions with a strategy_id should be displayed as individual
    const multiLegStrategies = Object.values(strategyGroups).filter(group => group.length > 1);
    const singleLegWithStrategy = Object.values(strategyGroups).filter(group => group.length === 1).flat();
    
    return {
      individual: [...individual, ...singleLegWithStrategy],
      strategies: multiLegStrategies,
    };
  }, [positions, allPositions]);

  // Filter and sort grouped positions
  const filteredGroupedPositions = useMemo(() => {
    let filtered = groupedPositions;

    if (searchQuery) {
      filtered = {
        individual: filtered.individual.filter(pos =>
          pos.underlyingSymbol.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        strategies: filtered.strategies.filter(strategyGroup =>
          strategyGroup.some(pos =>
            pos.underlyingSymbol.toLowerCase().includes(searchQuery.toLowerCase())
          )
        ),
      };
    }

    if (filterType !== 'all') {
      filtered = {
        individual: filtered.individual.filter(pos => pos.optionType === filterType),
        strategies: filtered.strategies.filter(strategyGroup =>
          strategyGroup.some(pos => pos.optionType === filterType)
        ),
      };
    }

    // Sort individual positions
    if (positionSort && positionSort.direction) {
      filtered = {
        ...filtered,
        individual: sortData(filtered.individual, positionSort),
      };
    }

    return filtered;
  }, [groupedPositions, searchQuery, filterType, positionSort]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (searchQuery) {
      filtered = filtered.filter(tx =>
        tx.underlyingSymbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return sortData(filtered, transactionSort);
  }, [searchQuery, transactions, transactionSort]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const formatDate = formatDateUtil;

  const getDaysToExpiration = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleEditPosition = useCallback((position: OptionContract) => {
    // Find the original position from allPositions
    const originalPosition = allPositions?.find(p => p.id === position.id);
    if (originalPosition) {
      setEditingPosition(originalPosition);
      setShowTransactionForm(true);
    }
  }, [allPositions]);

  const handleClosePosition = useCallback((position: OptionContract) => {
    // Check if this position is part of a multi-leg strategy
    const positionInDb = allPositions?.find(p => p.id === position.id);
    const strategyId = positionInDb?.strategy_id;
    
    // Close the position details modal if it's open
    setSelectedPosition(null);
    setSelectedStrategyGroup(null);
    
    if (strategyId) {
      // This is a multi-leg position - find all positions in the strategy
      const strategyPositions = allPositions?.filter(p => p.strategy_id === strategyId) || [];
      if (strategyPositions.length > 1) {
        // Multi-leg spread - open the multi-leg close form
        const strategyGroup = strategyPositions.map(p => toOptionContract(p));
        setSelectedStrategyGroupForClose(strategyGroup);
        setShowCloseMultiLegForm(true);
        return;
      }
    }
    
    // Single leg position - use regular close form
    setSelectedPositionForClose(position);
    setShowCloseForm(true);
  }, [allPositions]);

  const handleDeletePosition = useCallback(async (position: OptionContract) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Position',
      message: `Are you sure you want to delete the position for ${position.underlyingSymbol} ${position.optionType.toUpperCase()} $${position.strikePrice}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;
    await deletePositionMutation.mutateAsync(position.id);
  }, [confirmation, deletePositionMutation]);

  const handleEditTransaction = useCallback((transaction: OptionTransaction) => {
    // Find the original transaction from allTransactions
    const originalTransaction = allTransactions?.find(t => t.id === transaction.id);
    if (originalTransaction) {
      setEditingTransaction(originalTransaction);
      setShowTransactionForm(true);
    }
  }, [allTransactions]);

  const handleDeleteTransaction = useCallback(async (transaction: OptionTransaction) => {
    // Check if this transaction is part of a multi-leg strategy
    const originalTransaction = allTransactions?.find(t => t.id === transaction.id);
    const isPartOfStrategy = originalTransaction?.strategy_id !== null && originalTransaction?.strategy_id !== undefined;

    const confirmed = await confirmation.confirm({
      title: 'Delete Transaction',
      message: isPartOfStrategy
        ? `This transaction is part of a multi-leg option strategy. Deleting it will delete ALL transactions in this strategy (all option transactions and their associated cash transactions). This action cannot be undone.`
        : `Are you sure you want to delete this transaction? This action cannot be undone and may affect your positions.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;
    await deleteTransactionMutation.mutateAsync({ id: transaction.id, userId });
  }, [confirmation, deleteTransactionMutation, allTransactions]);

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
            Options
          </h1>
          <p className="text-slate-600 dark:text-slate-500 mt-2 text-lg">
            Track your options positions, strategies, and Greeks
          </p>
          <div className="mt-3">
            <MarketStatusIndicator assetType="option" />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-medium transition-all touch-target w-full sm:w-auto">
            <Download size={18} className="inline mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowMultiLegForm(true)}
            className="px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400 text-sm font-medium transition-all touch-target w-full sm:w-auto"
          >
            <Layers size={18} className="inline mr-2" />
            Multi-Leg Strategy
          </button>
          <button
            onClick={() => setShowTransactionForm(true)}
            className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium transition-all touch-target w-full sm:w-auto"
          >
            <Plus size={18} className="inline mr-2" />
            Single Leg Strategy
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
        <StatCard
          title="Total Value"
          value={formatCurrency(portfolioSummary.totalValue)}
          icon={DollarSign}
          positive
        />
        <StatCard
          title="Cost Basis"
          value={formatCurrency(portfolioSummary.totalCost)}
          icon={DollarSign}
          positive
        />
        <StatCard
          title="Realized P&L"
          value={formatCurrency(portfolioSummary.realizedPL)}
          icon={TrendingUp}
          positive={portfolioSummary.realizedPL >= 0}
        />
        <StatCard
          title="Unrealized P&L"
          value={formatCurrency(portfolioSummary.totalPL)}
          subtitle={formatPercent(portfolioSummary.totalPLPercent)}
          icon={TrendingUp}
          positive={portfolioSummary.totalPL >= 0}
        />
        <StatCard
          title="Total Positions"
          value={portfolioSummary.positionsCount.toString()}
          icon={Activity}
          positive
        />
        <StatCard
          title="Calls / Puts"
          value={`${portfolioSummary.callsCount} / ${portfolioSummary.putsCount}`}
          icon={Sparkles}
          positive
        />
      </div>

      {/* Tabs */}
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 overflow-hidden shadow-sm dark:shadow-none">
        <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800/50 scrollbar-hide">
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex-1 min-w-[120px] px-4 md:px-6 py-3 font-medium transition-all whitespace-nowrap touch-target ${
              activeTab === 'positions'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Positions
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 min-w-[120px] px-4 md:px-6 py-3 font-medium transition-all whitespace-nowrap touch-target ${
              activeTab === 'transactions'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('chain')}
            className={`flex-1 min-w-[120px] px-4 md:px-6 py-3 font-medium transition-all whitespace-nowrap touch-target ${
              activeTab === 'chain'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            Options Chain
          </button>
        </div>

        {/* Filters */}
        <div className="p-3 md:p-4 border-b border-slate-200 dark:border-slate-800/50 flex flex-col sm:flex-row gap-3 md:gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by underlying symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 md:py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-base md:text-sm"
            />
          </div>
          {activeTab === 'positions' && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2.5 md:py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-base md:text-sm touch-target w-full sm:w-auto"
            >
              <option value="all">All Types</option>
              <option value="call">Calls Only</option>
              <option value="put">Puts Only</option>
            </select>
          )}
        </div>

        {/* Content */}
        {/* Mobile Card Views */}
        {activeTab === 'positions' && (
          <div className="md:hidden space-y-3">
            {positionsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredGroupedPositions.individual.length === 0 && filteredGroupedPositions.strategies.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <EmptyPositions
                  assetType="options"
                  onAddTrade={() => setShowTransactionForm(true)}
                />
              </div>
            ) : (
              <>
                {filteredGroupedPositions.individual.map((position) => {
                  const daysToExp = getDaysToExpiration(position.expirationDate);
                  return (
                    <MobileTableCard key={position.id} onClick={() => setSelectedPosition(position)}>
                      <MobileTableCardHeader
                        title={position.underlyingSymbol}
                        subtitle={`${position.optionType.toUpperCase()} $${position.strikePrice}`}
                        badge={
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              position.optionType === 'call'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {position.optionType.toUpperCase()}
                          </span>
                        }
                        actions={
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPosition(position);
                              }}
                              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors touch-target"
                              title="Edit position"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePosition(position);
                              }}
                              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors touch-target"
                              title="Delete position"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        }
                      />
                      <MobileTableCardRow 
                        label="Expiration" 
                        value={
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-slate-500 dark:text-slate-400" />
                            <span>{formatDate(position.expirationDate)}</span>
                            <span className={`text-xs ${daysToExp < 7 ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                              ({daysToExp}d)
                            </span>
                          </div>
                        } 
                      />
                      <MobileTableCardRow label="Contracts" value={position.quantity} />
                      <MobileTableCardRow label="Avg Price" value={`${formatCurrency(position.averagePrice)}/contract`} />
                      <MobileTableCardRow label="Current Price" value={formatCurrency(position.currentPrice || 0)} />
                      <MobileTableCardRow label="Market Value" value={formatCurrency(position.marketValue || 0)} highlight />
                      <MobileTableCardRow
                        label="Unrealized P&L"
                        value={formatCurrency(position.unrealizedPL || 0)}
                        positive={(position.unrealizedPL || 0) >= 0}
                        negative={(position.unrealizedPL || 0) < 0}
                        highlight
                      />
                      <MobileTableCardRow
                        label="P&L %"
                        value={formatPercent(position.unrealizedPLPercent || 0)}
                        positive={(position.unrealizedPLPercent || 0) >= 0}
                        negative={(position.unrealizedPLPercent || 0) < 0}
                      />
                      {position.delta !== null && position.delta !== undefined && (
                        <MobileTableCardRow label="Delta" value={position.delta.toFixed(2)} />
                      )}
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClosePosition(position);
                          }}
                          className="w-full px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all touch-target"
                        >
                          Close Position
                        </button>
                      </div>
                    </MobileTableCard>
                  );
                })}
                {/* Strategy groups - simplified for mobile */}
                {filteredGroupedPositions.strategies.map((strategyGroup, groupIdx) => {
                  const firstPosition = strategyGroup[0];
                  const originalPosition = allPositions.find(p => p.id === firstPosition.id);
                  const strategyId = originalPosition?.strategy_id;
                  const strategy = strategies?.find(s => s.id === strategyId);
                  const totalContracts = strategyGroup.reduce((sum, pos) => sum + pos.quantity, 0);
                  const weightedAvgCurrentPrice = totalContracts > 0
                    ? strategyGroup.reduce((sum, pos) => sum + (pos.currentPrice || 0) * pos.quantity, 0) / totalContracts
                    : 0;
                  const totalMarketValue = strategyGroup.reduce((sum, pos) => sum + (pos.marketValue || 0), 0);
                  const totalUnrealizedPL = strategyGroup.reduce((sum, pos) => sum + (pos.unrealizedPL || 0), 0);
                  const totalOpeningCost = strategy?.total_opening_cost || strategyGroup.reduce((sum, pos) => sum + pos.averagePrice * pos.quantity, 0);
                  const totalPLPercent = totalOpeningCost > 0 ? (totalUnrealizedPL / totalOpeningCost) * 100 : 0;
                  
                  return (
                    <MobileTableCard key={`strategy-${groupIdx}`}>
                      <MobileTableCardHeader
                        title={`Strategy: ${firstPosition.underlyingSymbol}`}
                        subtitle={`${strategyGroup.length} legs`}
                        badge={
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            STRATEGY
                          </span>
                        }
                      />
                      <MobileTableCardRow label="Total Contracts" value={totalContracts} />
                      <MobileTableCardRow label="Market Value" value={formatCurrency(totalMarketValue)} highlight />
                      <MobileTableCardRow
                        label="Unrealized P&L"
                        value={formatCurrency(totalUnrealizedPL)}
                        positive={totalUnrealizedPL >= 0}
                        negative={totalUnrealizedPL < 0}
                        highlight
                      />
                      <MobileTableCardRow
                        label="P&L %"
                        value={formatPercent(totalPLPercent)}
                        positive={totalPLPercent >= 0}
                        negative={totalPLPercent < 0}
                      />
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/50">
                        <button
                          onClick={() => {
                            setSelectedStrategyGroupForClose(strategyGroup);
                            setShowCloseMultiLegForm(true);
                          }}
                          className="w-full px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all touch-target"
                        >
                          Close Strategy
                        </button>
                      </div>
                    </MobileTableCard>
                  );
                })}
              </>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="md:hidden space-y-3">
            {transactionsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                No transactions found
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <MobileTableCard key={transaction.id}>
                  <MobileTableCardHeader
                    title={transaction.description}
                    subtitle={formatDate(transaction.activityDate)}
                    badge={
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.transactionType === 'BTO' || transaction.transactionType === 'STO'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {transaction.transactionType}
                      </span>
                    }
                    actions={
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTransaction(transaction);
                          }}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors touch-target"
                          title="Edit transaction"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTransaction(transaction);
                          }}
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors touch-target"
                          title="Delete transaction"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    }
                  />
                  <MobileTableCardRow label="Contracts" value={transaction.quantity} />
                  <MobileTableCardRow label="Price" value={transaction.price ? formatCurrency(transaction.price) : '-'} />
                  <MobileTableCardRow label="Amount" value={transaction.amount ? formatCurrency(Math.abs(transaction.amount)) : '-'} highlight />
                </MobileTableCard>
              ))
            )}
          </div>
        )}

        {/* Desktop Table Views */}
        <div className="hidden md:block overflow-x-auto table-wrapper">
          {activeTab === 'chain' ? (
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Underlying Symbol
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={chainSymbol}
                    onChange={(e) => setChainSymbol(e.target.value.toUpperCase())}
                    placeholder="AAPL"
                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700/50 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
              </div>
              {chainSymbol ? (
                <OptionsChain
                  underlyingSymbol={chainSymbol}
                  onSelectOption={(entry: OptionChainEntry) => {
                    // Pre-fill transaction form with selected option
                    setChainSymbol('');
                    setActiveTab('positions');
                    setShowTransactionForm(true);
                    // Could pass entry data to form if needed
                  }}
                />
              ) : (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <p>Enter an underlying symbol to view options chain</p>
                </div>
              )}
            </div>
          ) : activeTab === 'positions' ? (
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-800/50">
                  <tr>
                    <SortableTableHeader
                      label="Symbol"
                      sortKey="underlyingSymbol"
                      currentSort={positionSort}
                      onSortChange={setPositionSort}
                      align="left"
                    />
                    <SortableTableHeader
                      label="Type"
                      sortKey="optionType"
                      currentSort={positionSort}
                      onSortChange={setPositionSort}
                      align="left"
                    />
                    <SortableTableHeader
                      label="Strike"
                      sortKey="strikePrice"
                      currentSort={positionSort}
                      onSortChange={setPositionSort}
                      align="right"
                    />
                    <SortableTableHeader
                      label="Expiration"
                      sortKey="expirationDate"
                      currentSort={positionSort}
                      onSortChange={setPositionSort}
                      align="left"
                    />
                    <SortableTableHeader
                      label="Contracts"
                      sortKey="quantity"
                      currentSort={positionSort}
                      onSortChange={setPositionSort}
                      align="right"
                    />
                    <SortableTableHeader
                      label="Avg Price"
                      sortKey="averagePrice"
                      currentSort={positionSort}
                      onSortChange={setPositionSort}
                      align="right"
                    />
                    <SortableTableHeader
                      label="Current"
                      sortKey="currentPrice"
                      currentSort={positionSort}
                      onSortChange={setPositionSort}
                      align="right"
                    />
                    <SortableTableHeader
                      label="Value"
                      sortKey="marketValue"
                      currentSort={positionSort}
                      onSortChange={setPositionSort}
                      align="right"
                    />
                    <SortableTableHeader
                      label="P&L"
                      sortKey="unrealizedPL"
                      currentSort={positionSort}
                      onSortChange={setPositionSort}
                      align="right"
                    />
                    <SortableTableHeader
                      label="Delta"
                      sortKey="delta"
                      currentSort={positionSort}
                      onSortChange={setPositionSort}
                      align="right"
                    />
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                  {positionsLoading ? (
                    <TableSkeleton rows={5} columns={11} />
                  ) : filteredGroupedPositions.individual.length === 0 && filteredGroupedPositions.strategies.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12">
                        <EmptyPositions
                          assetType="options"
                          onAddTrade={() => setShowTransactionForm(true)}
                        />
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* Individual positions (not part of a strategy) */}
                      {filteredGroupedPositions.individual.map((position) => {
                        const daysToExp = getDaysToExpiration(position.expirationDate);
                        return (
                          <tr
                            key={position.id}
                            className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                            onClick={() => setSelectedPosition(position)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {position.underlyingSymbol}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  position.optionType === 'call'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}
                              >
                                {position.optionType.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                              ${position.strikePrice}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                              <div className="flex items-center gap-1">
                                <Calendar size={14} className="text-slate-500 dark:text-slate-400" />
                                <span>{formatDate(position.expirationDate)}</span>
                                <span className={`text-xs ${daysToExp < 7 ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                  ({daysToExp}d)
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                              {position.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                              {formatCurrency(position.averagePrice)}/contract
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                              {formatCurrency(position.currentPrice || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                              {formatCurrency(position.marketValue || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <div>
                                <span
                                className={`font-semibold ${
                                  (position.unrealizedPL || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}
                                >
                                  {formatCurrency(position.unrealizedPL || 0)}
                                </span>
                                <div className={`text-xs ${(position.unrealizedPLPercent || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {formatPercent(position.unrealizedPLPercent || 0)}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                              {position.delta?.toFixed(2) || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClosePosition(position);
                                  }}
                                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all"
                                >
                                  Close
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditPosition(position);
                                  }}
                                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                                  title="Edit position"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePosition(position);
                                  }}
                                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                  title="Delete position"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      
                      {/* Grouped strategy positions */}
                      {filteredGroupedPositions.strategies.map((strategyGroup, groupIdx) => {
                        const firstPosition = strategyGroup[0];
                        
                        // Find the strategy for this group to get total_opening_cost
                        const originalPosition = allPositions.find(p => p.id === firstPosition.id);
                        const strategyId = originalPosition?.strategy_id;
                        const strategy = strategies?.find(s => s.id === strategyId);
                        
                        // Calculate weighted average current price and average entry price
                        const totalContracts = strategyGroup.reduce((sum, pos) => sum + pos.quantity, 0);
                        const weightedAvgCurrentPrice = totalContracts > 0
                          ? strategyGroup.reduce((sum, pos) => {
                              const posValue = (pos.currentPrice || pos.averagePrice) * pos.quantity;
                              return sum + posValue;
                            }, 0) / totalContracts
                          : 0;
                        
                        // Calculate weighted average entry price (price per contract, not total cost)
                        const weightedAvgEntryPrice = totalContracts > 0
                          ? strategyGroup.reduce((sum, pos) => {
                              const posValue = pos.averagePrice * pos.quantity;
                              return sum + posValue;
                            }, 0) / totalContracts
                          : 0;
                        
                        // Calculate total value and P&L correctly accounting for long/short
                        let totalValue = 0;
                        let totalPL = 0;
                        let totalCostBasis = 0;
                        
                        strategyGroup.forEach((pos) => {
                          const origPos = allPositions.find(p => p.id === pos.id);
                          const actualCostBasis = origPos?.total_cost_basis || 0;
                          const isLong = pos.side === 'long';
                          
                          const marketValue = pos.marketValue || 0;
                          totalValue += marketValue;
                          
                          // Calculate P&L for this position
                          // Long: You paid (negative cost basis), P&L = marketValue - |costBasis|
                          // Short: You received credit (positive cost basis), P&L = costBasis - marketValue
                          const posPL = isLong
                            ? marketValue - Math.abs(actualCostBasis)
                            : Math.abs(actualCostBasis) - marketValue;
                          totalPL += posPL;
                          totalCostBasis += Math.abs(actualCostBasis);
                        });
                        
                        // For spreads, calculate P&L using strategy's total_opening_cost (net credit/debit)
                        // This is more accurate for multi-leg strategies
                        let finalPL = totalPL;
                        let finalPLPercent = totalCostBasis > 0 ? (totalPL / totalCostBasis) * 100 : 0;
                        
                        if (strategy && strategy.total_opening_cost !== undefined) {
                          // For spreads, calculate cost to close and compare to net credit/debit
                          let longLegsValue = 0;
                          let shortLegsValue = 0;
                          
                          strategyGroup.forEach((pos) => {
                            const marketValue = pos.marketValue || 0;
                            if (pos.side === 'long') {
                              longLegsValue += marketValue;
                            } else {
                              shortLegsValue += marketValue;
                            }
                          });
                          
                          // Cost to close the spread (always positive, represents money you'd pay to close)
                          const costToClose = shortLegsValue - longLegsValue;
                          
                          // Net credit/debit when opened (positive = credit received, negative = debit paid)
                          const netCreditDebit = strategy.total_opening_cost;
                          
                          // P&L = Credit/Debit received when opening - Cost/Value to close
                          // For credit spread: P&L = credit - costToClose
                          // For debit spread: P&L = -debit - (-valueToClose) = valueToClose - debit
                          // Since costToClose = shortLegsValue - longLegsValue, and valueToClose = longLegsValue - shortLegsValue = -costToClose
                          // We can use: finalPL = netCreditDebit - costToClose
                          // This works for both: credit (positive netCreditDebit) and debit (negative netCreditDebit)
                          finalPL = netCreditDebit - costToClose;
                          
                          // Calculate percentage based on net credit/debit
                          const netCreditDebitAbs = Math.abs(netCreditDebit);
                          finalPLPercent = netCreditDebitAbs > 0 ? (finalPL / netCreditDebitAbs) * 100 : 0;
                        }
                        
                        const daysToExp = getDaysToExpiration(firstPosition.expirationDate);
                        
                        return (
                          <tr
                            key={`strategy-${groupIdx}`}
                            className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                            onClick={() => setSelectedStrategyGroup(strategyGroup)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {firstPosition.underlyingSymbol}
                              </span>
                            </td>
                            <td className="px-6 py-4" colSpan={2}>
                              <div className="flex flex-wrap gap-1">
                                {strategyGroup.map((pos, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      pos.optionType === 'call'
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    }`}
                                  >
                                    {pos.optionType.toUpperCase()} ${pos.strikePrice}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                              <div className="flex items-center gap-1">
                                <Calendar size={14} className="text-slate-500 dark:text-slate-400" />
                                <span>{formatDate(firstPosition.expirationDate)}</span>
                                <span className={`text-xs ${daysToExp < 7 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                  ({daysToExp}d)
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                              {strategyGroup.reduce((sum, pos) => sum + pos.quantity, 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                              {formatCurrency(weightedAvgEntryPrice)}/contract
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                              {weightedAvgCurrentPrice > 0 ? formatCurrency(weightedAvgCurrentPrice) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                              {formatCurrency(totalValue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <div>
                                <span
                                  className={`font-semibold ${
                                    finalPL >= 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}
                                >
                                  {formatCurrency(finalPL)}
                                </span>
                                <div className={`text-xs ${finalPLPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {formatPercent(finalPLPercent)}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                              {strategyGroup.reduce((sum, pos) => sum + (pos.delta || 0), 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Close first position as representative (will close the entire spread)
                                    handleClosePosition(firstPosition);
                                  }}
                                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all"
                                  title="Close strategy"
                                >
                                  Close
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Edit first position as representative
                                    handleEditPosition(firstPosition);
                                  }}
                                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                                  title="Edit strategy"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Delete first position as representative
                                    handleDeletePosition(firstPosition);
                                  }}
                                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                  title="Delete strategy"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-800/50">
                  <tr>
                    <SortableTableHeader
                      label="Date"
                      sortKey="activityDate"
                      currentSort={transactionSort}
                      onSortChange={setTransactionSort}
                      align="left"
                    />
                    <SortableTableHeader
                      label="Description"
                      sortKey="description"
                      currentSort={transactionSort}
                      onSortChange={setTransactionSort}
                      align="left"
                    />
                    <SortableTableHeader
                      label="Action"
                      sortKey="transactionType"
                      currentSort={transactionSort}
                      onSortChange={setTransactionSort}
                      align="left"
                    />
                    <SortableTableHeader
                      label="Contracts"
                      sortKey="quantity"
                      currentSort={transactionSort}
                      onSortChange={setTransactionSort}
                      align="right"
                    />
                    <SortableTableHeader
                      label="Price"
                      sortKey="price"
                      currentSort={transactionSort}
                      onSortChange={setTransactionSort}
                      align="right"
                    />
                    <SortableTableHeader
                      label="Amount"
                      sortKey="amount"
                      currentSort={transactionSort}
                      onSortChange={setTransactionSort}
                      align="right"
                    />
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                  {transactionsLoading ? (
                    <TableSkeleton rows={5} columns={7} />
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                          {formatDate(transaction.activityDate)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                          {transaction.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                transaction.transactionType === 'BTO' || transaction.transactionType === 'STO'
                                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                              }`}
                          >
                            {transaction.transactionType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                          {transaction.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-900 dark:text-slate-100">
                          {transaction.price ? formatCurrency(transaction.price) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-900 dark:text-slate-100">
                          {transaction.amount ? formatCurrency(Math.abs(transaction.amount)) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTransaction(transaction);
                              }}
                              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                              title="Edit transaction"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTransaction(transaction);
                              }}
                              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="Delete transaction"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        title={confirmation.options.title}
        message={confirmation.options.message}
        confirmLabel={confirmation.options.confirmLabel}
        cancelLabel={confirmation.options.cancelLabel}
        variant={confirmation.options.variant}
        onConfirm={confirmation.handleConfirm}
        onCancel={confirmation.handleCancel}
      />

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <>
          {editingPosition ? (
            <PositionEditForm
              position={editingPosition}
              userId={userId}
              onClose={() => {
                setShowTransactionForm(false);
                setEditingPosition(null);
                setEditingTransaction(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['positions'] });
                queryClient.invalidateQueries({ queryKey: ['position-statistics'] });
                setShowTransactionForm(false);
                setEditingPosition(null);
                setEditingTransaction(null);
              }}
            />
          ) : (
            <TransactionForm
              assetType="option"
              userId={userId}
              onClose={() => {
                setShowTransactionForm(false);
                setEditingPosition(null);
                setEditingTransaction(null);
              }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['positions'] });
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
                setShowTransactionForm(false);
                setEditingPosition(null);
                setEditingTransaction(null);
              }}
            />
          )}
        </>
      )}

      {/* Close Position Form Modal - Single Leg */}
      {showCloseForm && selectedPositionForClose && (
        <TransactionForm
          assetType="option"
          userId={userId}
          initialValues={{
            underlyingSymbol: selectedPositionForClose.underlyingSymbol,
            optionType: selectedPositionForClose.optionType,
            strikePrice: selectedPositionForClose.strikePrice,
            expirationDate: selectedPositionForClose.expirationDate,
            optionTransactionCode: selectedPositionForClose.side === 'long' ? 'STC' : 'BTC',
            maxQuantity: selectedPositionForClose.quantity,
          }}
          onClose={() => {
            setShowCloseForm(false);
            setSelectedPositionForClose(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
            setShowCloseForm(false);
            setSelectedPositionForClose(null);
          }}
        />
      )}


      {/* Multi-Leg Strategy Form Modal - Opening */}
      {showMultiLegForm && (
        <OptionsMultiLegForm
          userId={userId}
          onClose={() => setShowMultiLegForm(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
            queryClient.invalidateQueries({ queryKey: ['strategies'] });
            setShowMultiLegForm(false);
          }}
        />
      )}

      {/* Multi-Leg Strategy Form Modal - Closing */}
      {showCloseMultiLegForm && selectedStrategyGroupForClose && (
        <OptionsMultiLegForm
          userId={userId}
          initialPositions={selectedStrategyGroupForClose}
          isClosing={true}
          onClose={() => {
            setShowCloseMultiLegForm(false);
            setSelectedStrategyGroupForClose(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['positions'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
            queryClient.invalidateQueries({ queryKey: ['strategies'] });
            setShowCloseMultiLegForm(false);
            setSelectedStrategyGroupForClose(null);
          }}
        />
      )}

      {/* Position Details Modal */}
      {(selectedPosition || selectedStrategyGroup) && (
        <PositionDetailsModal
          position={selectedPosition}
          strategyGroup={selectedStrategyGroup || undefined}
          strategy={
            selectedStrategyGroup
              ? strategies?.find(
                  (s) =>
                    allPositions?.find((p) => p.id === selectedStrategyGroup[0]?.id)?.strategy_id ===
                    s.id
                ) || null
              : null
          }
          allPositions={allPositions || []}
          onClose={() => {
            setSelectedPosition(null);
            setSelectedStrategyGroup(null);
          }}
          onClosePosition={handleClosePosition}
        />
      )}
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  positive: boolean;
}

const StatCard = ({ title, value, subtitle, icon: Icon, positive }: StatCardProps) => (
  <div className="group relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden shadow-sm dark:shadow-none">
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:to-transparent transition-all duration-300" />
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${positive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <Icon className={`w-5 h-5 ${positive ? 'text-emerald-400' : 'text-red-400'}`} />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        {subtitle && (
          <p className={`text-sm font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  </div>
);

export default Options;
