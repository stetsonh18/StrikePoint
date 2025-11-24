import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Calculator, Search } from 'lucide-react';
import { TransactionService } from '@/infrastructure/services/transactionService';
import { StrategyRepository, PositionRepository } from '@/infrastructure/repositories';
import type {
  OptionLegFormData,
  StrategyDetectionResult,
  OptionChainEntry,
  StrategyType,
  StrategyInsert,
  OptionContract,
  StrategyLeg,
  TransactionInsert,
} from '@/domain/types';
import { SymbolAutocomplete } from './SymbolAutocomplete';
import { OptionsChain } from './OptionsChain';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import { logger } from '@/shared/utils/logger';

interface OptionsMultiLegFormProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialPositions?: OptionContract[]; // For closing existing positions
  isClosing?: boolean; // If true, this is for closing, not opening
}

export const OptionsMultiLegForm: React.FC<OptionsMultiLegFormProps> = ({
  userId,
  onClose,
  onSuccess,
  initialPositions,
  isClosing = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useFocusTrap(true);
  const [showChainSelector, setShowChainSelector] = useState(false);
  const [selectedLegIndex, setSelectedLegIndex] = useState<number | null>(null); // Track which leg is being edited from chain

  // Initialize form from existing positions if provided (for closing)
  // Store original positions to reference later
  const originalPositions = useMemo(() => initialPositions || [], [initialPositions]);

  const initialLegs = useMemo<OptionLegFormData[]>(() => {
    if (initialPositions && initialPositions.length > 0) {
      return initialPositions.map((pos) => ({
        expiration: pos.expirationDate ?? '',
        strike: pos.strikePrice ?? 0,
        optionType: pos.optionType,
        side: pos.side,
        quantity: pos.quantity,
        price: 0,
        fee: 0,
        priceInput: '',
      }));
    }
    // Default legs for opening new positions
    return [
      {
        expiration: '',
        strike: 0,
        optionType: 'call',
        side: 'long',
        quantity: 1,
        price: 0,
        fee: 0,
        priceInput: '',
      },
      {
        expiration: '',
        strike: 0,
        optionType: 'call',
        side: 'short',
        quantity: 1,
        price: 0,
        fee: 0,
        priceInput: '',
      },
    ];
  }, [initialPositions]);

  // Form state
  const [underlyingSymbol, setUnderlyingSymbol] = useState(
    initialPositions && initialPositions.length > 0 ? initialPositions[0].underlyingSymbol : ''
  );
  const [transactionDate, setTransactionDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isWorthlessClose, setIsWorthlessClose] = useState(false);
  const savedLegPricesRef = useRef<Array<{ price: number; priceInput?: string }> | null>(null);
  const [strategyOpeningCost, setStrategyOpeningCost] = useState<number | null>(null);
  const [transactionTime, setTransactionTime] = useState(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');
    return `${hours}:${minutes}`;
  });

  const roundTo5Minutes = (time: string): string => {
    if (!time) return '00:00';
    const [hours, minutes] = time.split(':').map(Number);
    const roundedMinutes = Math.floor((minutes || 0) / 5) * 5;
    return `${String(hours || 0).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTransactionTime(roundTo5Minutes(e.target.value));
  };

  const getTimestampFromDateTime = (date: string, time: string) => {
    const safeTime = time || '00:00';
    const [hours, minutes] = safeTime.split(':').map(Number);
    const dateTime = new Date(`${date}T00:00:00`);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      dateTime.setHours(hours, minutes, 0, 0);
    }
    return dateTime.toISOString();
  };

  // Legs state - initialize from initialPositions if provided
  const [legs, setLegs] = useState<OptionLegFormData[]>(initialLegs);

  // Fetch strategy opening cost when in closing mode
  useEffect(() => {
    const fetchStrategyOpeningCost = async () => {
      if (isClosing && initialPositions && initialPositions.length > 0) {
        try {
          // Get the strategy ID from the first position
          const allPositions = await PositionRepository.getAll(userId, { status: 'open' });
          const firstPosition = allPositions.find(p => p.id === initialPositions[0].id);

          if (firstPosition?.strategy_id) {
            const strategy = await StrategyRepository.getById(firstPosition.strategy_id);
            if (strategy) {
              setStrategyOpeningCost(strategy.total_opening_cost ?? null);
              logger.debug('[OptionsMultiLegForm] Fetched strategy opening cost', {
                strategyId: strategy.id,
                openingCost: strategy.total_opening_cost,
              });
            }
          }
        } catch (error) {
          logger.error('[OptionsMultiLegForm] Error fetching strategy opening cost', error);
        }
      }
    };

    fetchStrategyOpeningCost();
  }, [isClosing, initialPositions, userId]);

  useEffect(() => {
    if (!isClosing) {
      setIsWorthlessClose(false);
      savedLegPricesRef.current = null;
      setLegs((prev) =>
        prev.map((leg) => ({
          ...leg,
          priceInput: leg.price?.toString() ?? '',
        }))
      );
    }
  }, [isClosing]);

  useEffect(() => {
    if (!isClosing) return;

    if (isWorthlessClose) {
      setLegs((prev) => {
        savedLegPricesRef.current = prev.map((leg) => ({
          price: leg.price || 0,
          priceInput: leg.priceInput,
        }));
        return prev.map((leg) => ({ ...leg, price: 0, priceInput: '0' }));
      });
    } else if (savedLegPricesRef.current) {
      const previous = savedLegPricesRef.current;
      savedLegPricesRef.current = null;
      setLegs((prev) =>
        prev.map((leg, index) => {
          const saved = previous[index];
          return {
            ...leg,
            price: saved?.price ?? leg.price,
            priceInput:
              saved?.priceInput ??
              (typeof saved?.price === 'number'
                ? saved.price.toString()
                : leg.priceInput ?? leg.price?.toString() ?? ''),
          };
        })
      );
    }
  }, [isWorthlessClose, isClosing]);

  const buildOptionTransaction = (
    leg: OptionLegFormData,
    config: {
      transactionCode: 'BTO' | 'STO' | 'BTC' | 'STC';
      amount: number;
      isOpening: boolean;
      isLong: boolean;
      descriptionText: string;
      notesText: string;
      strategyId?: string | null;
    }
  ): Omit<TransactionInsert, 'import_id'> => ({
    user_id: userId,
    activity_date: transactionDate,
    process_date: transactionDate,
    settle_date: transactionDate,
    description: config.descriptionText,
    notes: config.notesText,
    tags: [] as string[],
    fees: leg.fee || 0,
    asset_type: 'option' as const,
    transaction_code: config.transactionCode,
    underlying_symbol: underlyingSymbol,
    instrument: null,
    option_type: leg.optionType,
    strike_price: leg.strike,
    expiration_date: leg.expiration,
    quantity: leg.quantity,
    price: leg.price,
    amount: config.amount,
    is_opening: config.isOpening,
    is_long: config.isLong,
    position_id: null,
    strategy_id: config.strategyId ?? null,
  });

  // Add a new leg
  const addLeg = () => {
    if (legs.length >= 8) {
      setError('Maximum 8 legs allowed');
      return;
    }
    setLegs([
      ...legs,
      {
        expiration: '',
        strike: 0,
        optionType: 'call',
        side: 'long',
        quantity: 1,
        price: 0,
        fee: 0,
        priceInput: '',
      },
    ]);
  };

  // Remove a leg
  const removeLeg = (index: number) => {
    if (legs.length <= 2) {
      setError('Minimum 2 legs required');
      return;
    }
    setLegs(legs.filter((_, i) => i !== index));
  };

  // Update a leg
  const updateLeg = (index: number, updates: Partial<OptionLegFormData>) => {
    setLegs(legs.map((leg, i) => (i === index ? { ...leg, ...updates } : leg)));
  };

  const handleLegPriceChange = (index: number, rawValue: string) => {
    setLegs((prev) =>
      prev.map((leg, i) => {
        if (i !== index) return leg;
        if (rawValue === '') {
          return { ...leg, price: 0, priceInput: '' };
        }
        const numeric = Number(rawValue);
        if (Number.isNaN(numeric)) {
          return { ...leg, priceInput: rawValue };
        }
        return { ...leg, price: Math.max(0, numeric), priceInput: rawValue };
      })
    );
  };

  // Calculate strategy metrics
  const strategyMetrics = useMemo((): StrategyDetectionResult & { netDebit: number } => {
    let netDebit = 0;
    let suggestedType: StrategyDetectionResult['suggestedType'] = 'custom';
    let confidence = 0.5;

    // Calculate net debit/credit
    legs.forEach((leg) => {
      const legCost = leg.quantity * leg.price * 100; // Options are per share, multiply by 100

      if (isClosing) {
        // When CLOSING:
        // - SHORT position → BTC (Buy to Close) → You PAY (debit, negative)
        // - LONG position → STC (Sell to Close) → You RECEIVE (credit, positive)
        if (leg.side === 'short') {
          netDebit -= legCost; // Debit for closing short (buying back)
        } else {
          netDebit += legCost; // Credit for closing long (selling)
        }
      } else {
        // When OPENING:
        // - LONG position → BTO (Buy to Open) → You PAY (debit, negative)
        // - SHORT position → STO (Sell to Open) → You RECEIVE (credit, positive)
        if (leg.side === 'long') {
          netDebit -= legCost; // Debit for long
        } else {
          netDebit += legCost; // Credit for short
        }
      }
    });

    // If closing and we have the opening cost, calculate total P&L
    // Total P&L = Opening Cost + Closing Cost (closing cost is already signed)
    // Example: Opened for +$66 credit, closing for -$10 debit = $66 + (-$10) = $56 profit
    // Example: Opened for -$100 debit, closing for +$80 credit = -$100 + $80 = -$20 loss
    if (isClosing && strategyOpeningCost !== null) {
      netDebit = strategyOpeningCost + netDebit;
    }

    // Strategy detection logic
    if (legs.length === 2) {
      const [leg1, leg2] = legs;

      // Calendar Spread: Same strike, different expirations, opposite sides
      if (leg1.optionType === leg2.optionType && leg1.strike === leg2.strike && leg1.expiration !== leg2.expiration && leg1.side !== leg2.side) {
        suggestedType = 'calendar_spread';
        confidence = 0.9;
      }
      // Diagonal Spread: Different strikes AND different expirations, opposite sides
      else if (leg1.optionType === leg2.optionType && leg1.strike !== leg2.strike && leg1.expiration !== leg2.expiration && leg1.side !== leg2.side) {
        suggestedType = 'diagonal_spread';
        confidence = 0.9;
      }
      // Vertical Spread: Same expiration, different strikes, opposite sides
      else if (leg1.optionType === leg2.optionType && leg1.expiration === leg2.expiration && leg1.strike !== leg2.strike && leg1.side !== leg2.side) {
        suggestedType = 'vertical_spread';
        confidence = 0.8;
        // Check for ratio spread (unequal quantities)
        if (leg1.quantity !== leg2.quantity) {
          suggestedType = 'ratio_spread';
          confidence = 0.85;
        }
      }
      // Straddle: Same strike, same expiration, one call one put, same side
      else if (leg1.strike === leg2.strike && leg1.expiration === leg2.expiration && leg1.optionType !== leg2.optionType && leg1.side === leg2.side) {
        suggestedType = 'straddle';
        confidence = 0.9;
      }
      // Strangle: Different strikes, same expiration, one call one put, same side
      else if (leg1.strike !== leg2.strike && leg1.expiration === leg2.expiration && leg1.optionType !== leg2.optionType && leg1.side === leg2.side) {
        suggestedType = 'strangle';
        confidence = 0.9;
      }
    } else if (legs.length === 3) {
      // Butterfly: 3 strikes, 1-2-1 ratio
      const sorted = [...legs].sort((a, b) => a.strike - b.strike);
      const [l1, l2, l3] = sorted;
      if (
        l1.optionType === l2.optionType &&
        l2.optionType === l3.optionType &&
        l1.expiration === l2.expiration &&
        l2.expiration === l3.expiration &&
        l1.quantity === l3.quantity &&
        l2.quantity === l1.quantity * 2
      ) {
        suggestedType = 'butterfly';
        confidence = 0.85;
      }
    } else if (legs.length === 4) {
      const calls = legs.filter((l) => l.optionType === 'call');
      const puts = legs.filter((l) => l.optionType === 'put');
      const sorted = [...legs].sort((a, b) => a.strike - b.strike);
      const [l1, l2, l3, l4] = sorted;

      // Iron Butterfly: Straddle + wings (4 legs, same expiration)
      // Pattern: Long put (lower), Short put (middle), Short call (middle), Long call (higher)
      if (
        calls.length === 2 &&
        puts.length === 2 &&
        l1.expiration === l2.expiration &&
        l2.expiration === l3.expiration &&
        l3.expiration === l4.expiration &&
        l1.optionType === 'put' &&
        l1.side === 'long' &&
        l2.optionType === 'put' &&
        l2.side === 'short' &&
        l2.strike === l3.strike &&
        l3.optionType === 'call' &&
        l3.side === 'short' &&
        l4.optionType === 'call' &&
        l4.side === 'long'
      ) {
        suggestedType = 'iron_butterfly';
        confidence = 0.85;
      }
      // Iron Condor: Bull put spread + Bear call spread
      else if (calls.length === 2 && puts.length === 2) {
        suggestedType = 'iron_condor';
        confidence = 0.7;
      }
    }

    return {
      suggestedType,
      confidence,
      netDebit,
    };
  }, [legs, isClosing, strategyOpeningCost]);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validation
      if (!underlyingSymbol) {
        throw new Error('Please enter an underlying symbol');
      }

      if (legs.length < 2) {
        throw new Error('At least 2 legs are required');
      }

      // Validate all legs
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        if (!leg.expiration) {
          throw new Error(`Leg ${i + 1}: Please enter an expiration date`);
        }
        if (!leg.strike || leg.strike <= 0) {
          throw new Error(`Leg ${i + 1}: Please enter a valid strike price`);
        }
        if (!leg.quantity || leg.quantity <= 0) {
          throw new Error(`Leg ${i + 1}: Please enter a valid quantity`);
        }
        if (leg.price < 0) {
          throw new Error(`Leg ${i + 1}: Please enter a valid price`);
        }
      }

      const timeTag = isClosing ? 'EXIT_TIME' : 'ENTRY_TIME';
      const timeNote = `${timeTag}:${transactionTime}`;
      const combinedNotes = notes ? `${notes}\n${timeNote}` : timeNote;

      if (isClosing && initialPositions && initialPositions.length > 0) {
        // CLOSING MODE: Close existing positions
        // Get all positions to find the strategy
        const allPositions = await PositionRepository.getAll(userId, {
          status: 'open',
        });

        logger.debug('[OptionsMultiLegForm] Closing positions', {
          initialPositionsCount: initialPositions.length,
          initialPositionIds: initialPositions.map(p => p.id),
          allPositionsCount: allPositions.length,
        });

        // Find the existing strategy from the first position
        const firstPositionId = initialPositions[0].id;
        const firstPosition = allPositions.find(p => p.id === firstPositionId);

        logger.debug('[OptionsMultiLegForm] Position lookup', {
          lookingForId: firstPositionId,
          foundPosition: firstPosition ? {
            id: firstPosition.id,
            strategy_id: firstPosition.strategy_id,
            symbol: firstPosition.symbol,
          } : null,
        });

        const existingStrategyId = firstPosition?.strategy_id;

        if (!existingStrategyId) {
          logger.error('[OptionsMultiLegForm] Cannot find strategy for position', {
            positionId: firstPositionId,
            foundPosition: firstPosition,
            allPositionIds: allPositions.map(p => p.id).slice(0, 10),
          });
          throw new Error(`Cannot find strategy for this position (ID: ${firstPositionId}). The position may have been deleted or the strategy may not exist. Please close positions individually.`);
        }

        // Step 1: Create closing transactions for each leg
        const transactions = legs.map((leg, index) => {
          // Get the original position to know the original side
          const originalPosition = originalPositions[index];
          const originalSide = originalPosition?.side || leg.side;

          // For closing: 
          // - LONG position -> STC (Sell to Close) - sell transaction
          // - SHORT position -> BTC (Buy to Close) - buy transaction
          const transactionCode = originalSide === 'long' ? 'STC' : 'BTC';

          const legAmount = leg.quantity * leg.price * 100; // Options are per share
          // For closing: STC (selling) = credit (+), BTC (buying) = debit (-)
          const amount = transactionCode === 'STC' ? Math.abs(legAmount) : -Math.abs(legAmount);

          return buildOptionTransaction(leg, {
            transactionCode,
            amount,
            isOpening: false,
            isLong: transactionCode === 'STC',
            descriptionText:
              description ||
              `${transactionCode} ${leg.quantity} ${underlyingSymbol} ${leg.expiration} ${leg.optionType.toUpperCase()} $${leg.strike}`,
            notesText: combinedNotes,
            strategyId: existingStrategyId,
          });
        });

        // Step 2: Create all closing transactions in batch
        // This will trigger position matching to close the positions
        logger.debug('[OptionsMultiLegForm] Creating closing transactions', {
          transactionCount: transactions.length,
          strategyId: existingStrategyId,
          transactions: transactions.map(t => ({
            code: t.transaction_code,
            symbol: t.underlying_symbol,
            strike: t.strike_price,
            quantity: t.quantity,
            price: t.price,
          })),
        });

        await TransactionService.createManualTransactions(transactions, existingStrategyId);

        // If this is a worthless/expired close, update position statuses to 'expired'
        if (isWorthlessClose) {
          try {
            const { PositionRepository } = await import('@/infrastructure/repositories');
            const positions = await PositionRepository.getByStrategyId(existingStrategyId);

            // Update all positions in this strategy to 'expired' status
            for (const position of positions) {
              if (position.status === 'closed') {
                await PositionRepository.updateStatus(
                  position.id,
                  'expired',
                  position.closed_at || undefined
                );
              }
            }

            logger.info('[OptionsMultiLegForm] Updated positions to expired status', {
              strategyId: existingStrategyId,
              positionCount: positions.length,
            });
          } catch (error) {
            logger.error('[OptionsMultiLegForm] Error updating position status to expired', error);
            // Don't fail the entire close operation if status update fails
          }
        }

        logger.info('[OptionsMultiLegForm] Successfully closed multi-leg strategy', {
          strategyId: existingStrategyId,
          legCount: transactions.length,
          isExpired: isWorthlessClose,
        });

        onSuccess();
      } else {
        // OPENING MODE: Create new strategy and positions
        // Step 1: Create the strategy first
        const strategyLegs: StrategyLeg[] = legs.map((leg) => ({
          strike: leg.strike,
          expiration: leg.expiration || null,
          option_type: leg.optionType,
          side: leg.side,
          quantity: leg.quantity,
          opening_price: leg.price,
        }));

        // Calculate total opening cost (net debit/credit)
        const totalOpeningCost = strategyMetrics.netDebit;

        // Determine strategy type
        let strategyType: StrategyType = strategyMetrics.suggestedType as StrategyType;
        if (strategyType === 'custom' && legs.length === 2) {
          // Default to vertical_spread if we have 2 legs but detection didn't work
          strategyType = 'vertical_spread';
        }

        // Find primary expiration (use first leg's expiration, or most common)
        const primaryExpiration = legs[0]?.expiration || null;

        const openedAtTimestamp = getTimestampFromDateTime(transactionDate, transactionTime);

        const strategyInsert: StrategyInsert = {
          user_id: userId,
          strategy_type: strategyType,
          underlying_symbol: underlyingSymbol,
          direction: null, // Can be calculated later
          leg_count: legs.length,
          legs: strategyLegs,
          opened_at: openedAtTimestamp,
          expiration_date: primaryExpiration,
          entry_time: transactionTime, // Save entry time in HH:MM format
          total_opening_cost: totalOpeningCost,
          total_closing_proceeds: 0,
          realized_pl: 0,
          unrealized_pl: 0,
          max_risk: null,
          max_profit: null,
          breakeven_points: [],
          status: 'open',
          notes: notes || null,
          tags: [],
          is_adjustment: false,
          original_strategy_id: null,
          adjusted_from_strategy_id: null,
        };

        // Create the strategy
        const strategy = await StrategyRepository.create(strategyInsert);

        // Step 2: Create transactions for each leg, linked to the strategy
        const transactions = legs.map((leg) => {
          const transactionCode =
            leg.side === 'long' ? 'BTO' : 'STO'; // Buy to Open or Sell to Open

          const legAmount = leg.quantity * leg.price * 100; // Options are per share
          const amount = leg.side === 'long' ? -Math.abs(legAmount) : Math.abs(legAmount);

          return buildOptionTransaction(leg, {
            transactionCode,
            amount,
            isOpening: true,
            isLong: leg.side === 'long',
            descriptionText:
              description ||
              `${transactionCode} ${leg.quantity} ${underlyingSymbol} ${leg.expiration} ${leg.optionType.toUpperCase()} $${leg.strike}`,
            notesText: combinedNotes,
            strategyId: strategy.id,
          });
        });

        // Step 3: Create all transactions in batch, linked to the strategy
        // This will also trigger position matching and strategy detection
        await TransactionService.createManualTransactions(transactions, strategy.id);

        // Step 4: Link positions to the strategy after they're created
        // Get positions for this symbol that match our legs
        const allPositions = await PositionRepository.getAll(userId, {
          status: 'open',
        });

        // Find positions that match our legs and don't have a strategy yet
        // (They might not be linked if strategy detection didn't run or failed)
        const positionsToLink = allPositions.filter((pos) => {
          if (pos.strategy_id) return false; // Already linked
          if (pos.symbol !== underlyingSymbol) return false; // Wrong symbol

          // Check if this position matches one of our legs
          return legs.some((leg) => {
            return (
              pos.strike_price === leg.strike &&
              pos.expiration_date === leg.expiration &&
              pos.option_type === leg.optionType &&
              pos.side === leg.side &&
              pos.opening_quantity === leg.quantity
            );
          });
        });

        // Link all matching positions to the strategy
        for (const position of positionsToLink) {
          await PositionRepository.update(position.id, { strategy_id: strategy.id });
        }

        onSuccess();
      }
    } catch (error) {
      logger.error('Error creating multi-leg strategy', error);
      setError(error instanceof Error ? error.message : 'Failed to create strategy');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {isClosing ? 'Close Multi-Leg Options Strategy' : 'Multi-Leg Options Strategy'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {isClosing
                ? 'Enter close prices for each leg of the spread'
                : 'Enter all legs of your options strategy'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Underlying Symbol *
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    {isClosing ? (
                      <input
                        type="text"
                        value={underlyingSymbol}
                        readOnly
                        className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 cursor-not-allowed"
                      />
                    ) : (
                      <SymbolAutocomplete
                        value={underlyingSymbol}
                        onChange={setUnderlyingSymbol}
                        placeholder="SPX, SPXW, XSP, AAPL"
                        className="w-full"
                        mode="option"
                      />
                    )}
                  </div>
                  {!isClosing && (
                    <button
                      type="button"
                      onClick={() => setShowChainSelector(true)}
                      disabled={!underlyingSymbol}
                      className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Search size={16} />
                      Chain
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Transaction Date *
                </label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {isClosing ? 'Close Time (5-min increments) *' : 'Entry Time (5-min increments) *'}
                </label>
                <input
                  type="time"
                  step="300"
                  value={transactionTime}
                  onChange={handleTimeChange}
                  required
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
            </div>

            {isClosing && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-2">
                <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isWorthlessClose}
                    onChange={(e) => setIsWorthlessClose(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                  />
                  Mark this strategy as expired worthless
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enables a zero-cost close so you can realize the full credit from an expiring spread without entering market
                  quotes. You can toggle this off to restore your previous close prices.
                </p>
              </div>
            )}

            {/* Strategy Summary */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Strategy Summary</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {strategyMetrics.suggestedType.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Net Debit/Credit</span>
                  <div
                    className={`text-lg font-semibold ${strategyMetrics.netDebit < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                  >
                    {strategyMetrics.netDebit < 0 ? '-' : '+'}
                    ${Math.abs(strategyMetrics.netDebit).toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Legs</span>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{legs.length}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Confidence</span>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {(strategyMetrics.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Legs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Legs</h3>
                <button
                  type="button"
                  onClick={addLeg}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-600 dark:text-emerald-400 text-sm font-medium transition-all flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Leg
                </button>
              </div>

              {legs.map((leg, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Leg {index + 1}</span>
                    <div className="flex items-center gap-2">
                      {underlyingSymbol && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLegIndex(index);
                            setShowChainSelector(true);
                          }}
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-600 dark:text-emerald-400 text-xs font-medium transition-all flex items-center gap-1"
                          title="Select from options chain"
                        >
                          <Search size={12} />
                          Chain
                        </button>
                      )}
                      {legs.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeLeg(index)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Expiration *
                      </label>
                      <input
                        type="date"
                        value={leg.expiration}
                        onChange={(e) => updateLeg(index, { expiration: e.target.value })}
                        required
                        disabled={isClosing}
                        readOnly={isClosing}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${isClosing
                          ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Strike *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={leg.strike || ''}
                        onChange={(e) => updateLeg(index, { strike: parseFloat(e.target.value) || 0 })}
                        required
                        placeholder="150.00"
                        disabled={isClosing}
                        readOnly={isClosing}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${isClosing
                          ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Type *
                      </label>
                      <select
                        value={leg.optionType}
                        onChange={(e) =>
                          updateLeg(index, { optionType: e.target.value as 'call' | 'put' })
                        }
                        required
                        disabled={isClosing}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${isClosing
                          ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50'
                          }`}
                      >
                        <option value="call">Call</option>
                        <option value="put">Put</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Side *
                      </label>
                      <select
                        value={leg.side}
                        disabled={isClosing}
                        onChange={(e) => updateLeg(index, { side: e.target.value as 'long' | 'short' })}
                        required
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${isClosing
                          ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50'
                          }`}
                      >
                        <option value="long">Long</option>
                        <option value="short">Short</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={leg.quantity || ''}
                        onChange={(e) => updateLeg(index, { quantity: parseInt(e.target.value) || 1 })}
                        required
                        placeholder="1"
                        disabled={isClosing}
                        readOnly={isClosing}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${isClosing
                          ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50'
                          }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {isClosing ? 'Close Price *' : 'Price *'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={leg.priceInput ?? (Number.isFinite(leg.price) ? leg.price.toString() : '')}
                        onChange={(e) => handleLegPriceChange(index, e.target.value)}
                        required
                        placeholder="2.50"
                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {isClosing ? 'Close Fees' : 'Entry Fees'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={leg.fee ?? ''}
                        onChange={(e) =>
                          updateLeg(index, { fee: e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value)) })
                        }
                        placeholder="0.35"
                        className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Description and Notes */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    {isClosing ? 'Closing...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Calculator size={16} />
                    {isClosing ? 'Close Strategy' : 'Create Strategy'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Options Chain Selector Modal */}
      {showChainSelector && underlyingSymbol && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Select Option from Chain - {underlyingSymbol}
                {selectedLegIndex !== null && (
                  <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">(for Leg {selectedLegIndex + 1})</span>
                )}
              </h3>
              <button
                onClick={() => {
                  setShowChainSelector(false);
                  setSelectedLegIndex(null);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="text-slate-600 dark:text-slate-400" size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <OptionsChain
                underlyingSymbol={underlyingSymbol}
                onSelectOption={(entry: OptionChainEntry) => {
                  // Auto-fill the selected leg (or first leg if none selected)
                  const legIndex = selectedLegIndex !== null ? selectedLegIndex : 0;
                  updateLeg(legIndex, {
                    expiration: entry.expiration,
                    strike: entry.strike,
                    optionType: entry.option_type,
                    price: entry.last || (entry.bid && entry.ask ? (entry.bid + entry.ask) / 2 : 0),
                  });
                  setShowChainSelector(false);
                  setSelectedLegIndex(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



