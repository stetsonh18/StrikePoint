import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Calculator, TrendingUp, TrendingDown, Search } from 'lucide-react';
import { TransactionService } from '@/infrastructure/services/transactionService';
import type { OptionLegFormData, MultiLegStrategyFormData, StrategyDetectionResult, OptionChainEntry } from '@/domain/types';
import { SymbolAutocomplete } from './SymbolAutocomplete';
import { OptionsChain } from './OptionsChain';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';

interface OptionsMultiLegFormProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const OptionsMultiLegForm: React.FC<OptionsMultiLegFormProps> = ({
  userId,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useFocusTrap();
  const [showChainSelector, setShowChainSelector] = useState(false);
  const [selectedLegIndex, setSelectedLegIndex] = useState<number | null>(null); // Track which leg is being edited from chain

  // Form state
  const [underlyingSymbol, setUnderlyingSymbol] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Legs state - start with 2 legs minimum
  const [legs, setLegs] = useState<OptionLegFormData[]>([
    {
      expiration: '',
      strike: 0,
      optionType: 'call',
      side: 'long',
      quantity: 1,
      price: 0,
    },
    {
      expiration: '',
      strike: 0,
      optionType: 'call',
      side: 'short',
      quantity: 1,
      price: 0,
    },
  ]);

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

  // Calculate strategy metrics
  const strategyMetrics = useMemo((): StrategyDetectionResult & { netDebit: number } => {
    let netDebit = 0;
    let suggestedType: StrategyDetectionResult['suggestedType'] = 'custom';
    let confidence = 0.5;

    // Calculate net debit/credit
    legs.forEach((leg) => {
      const legCost = leg.quantity * leg.price * 100; // Options are per share, multiply by 100
      if (leg.side === 'long') {
        netDebit -= legCost; // Debit for long
      } else {
        netDebit += legCost; // Credit for short
      }
    });

    // Simple strategy detection
    if (legs.length === 2) {
      const [leg1, leg2] = legs;
      if (leg1.optionType === leg2.optionType && leg1.expiration === leg2.expiration) {
        if (leg1.side !== leg2.side) {
          suggestedType = 'vertical_spread';
          confidence = 0.8;
        }
      } else if (leg1.optionType === leg2.optionType && leg1.strike === leg2.strike) {
        if (leg1.expiration !== leg2.expiration) {
          suggestedType = 'horizontal_spread';
          confidence = 0.8;
        }
      }
    } else if (legs.length === 4) {
      const calls = legs.filter((l) => l.optionType === 'call');
      const puts = legs.filter((l) => l.optionType === 'put');
      if (calls.length === 2 && puts.length === 2) {
        suggestedType = 'iron_condor';
        confidence = 0.7;
      }
    }

    return {
      suggestedType,
      confidence,
      netDebit,
    };
  }, [legs]);

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

      // Create transactions for each leg
      const transactions = legs.map((leg) => {
        const transactionCode =
          leg.side === 'long' ? 'BTO' : 'STO'; // Buy to Open or Sell to Open

        const legAmount = leg.quantity * leg.price * 100; // Options are per share
        const amount = leg.side === 'long' ? -Math.abs(legAmount) : Math.abs(legAmount);

        return {
          user_id: userId,
          activity_date: transactionDate,
          process_date: transactionDate,
          settle_date: transactionDate,
          description:
            description ||
            `${transactionCode} ${leg.quantity} ${underlyingSymbol} ${leg.expiration} ${leg.optionType.toUpperCase()} $${leg.strike}`,
          notes: notes || null,
          tags: [],
          fees: 0, // Fees can be added per leg if needed
          asset_type: 'option' as const,
          transaction_code: transactionCode,
          underlying_symbol: underlyingSymbol,
          option_type: leg.optionType,
          strike_price: leg.strike,
          expiration_date: leg.expiration,
          quantity: leg.quantity,
          price: leg.price,
          amount,
          is_opening: true,
          is_long: leg.side === 'long',
        };
      });

      // Create all transactions in batch
      await TransactionService.createManualTransactions(transactions);

      onSuccess();
    } catch (error) {
      console.error('Error creating multi-leg strategy:', error);
      setError(error instanceof Error ? error.message : 'Failed to create strategy');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Multi-Leg Options Strategy</h2>
            <p className="text-sm text-slate-400 mt-1">Enter all legs of your options strategy</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Common Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Underlying Symbol *
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SymbolAutocomplete
                      value={underlyingSymbol}
                      onChange={setUnderlyingSymbol}
                      placeholder="SPX, SPXW, XSP, AAPL"
                      className="w-full"
                      mode="option"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowChainSelector(true)}
                    disabled={!underlyingSymbol}
                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Search size={16} />
                    Chain
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Transaction Date *
                </label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
            </div>

            {/* Strategy Summary */}
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">Strategy Summary</span>
                <span className="text-xs text-slate-400">
                  {strategyMetrics.suggestedType.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <span className="text-xs text-slate-400">Net Debit/Credit</span>
                  <div
                    className={`text-lg font-semibold ${
                      strategyMetrics.netDebit < 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {strategyMetrics.netDebit < 0 ? '-' : '+'}
                    ${Math.abs(strategyMetrics.netDebit).toFixed(2)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Legs</span>
                  <div className="text-lg font-semibold text-slate-100">{legs.length}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Confidence</span>
                  <div className="text-lg font-semibold text-slate-100">
                    {(strategyMetrics.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Legs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">Legs</h3>
                <button
                  type="button"
                  onClick={addLeg}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-medium transition-all flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Leg
                </button>
              </div>

              {legs.map((leg, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl space-y-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-300">Leg {index + 1}</span>
                    <div className="flex items-center gap-2">
                      {underlyingSymbol && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLegIndex(index);
                            setShowChainSelector(true);
                          }}
                          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-400 text-xs font-medium transition-all flex items-center gap-1"
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
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Expiration *
                      </label>
                      <input
                        type="date"
                        value={leg.expiration}
                        onChange={(e) => updateLeg(index, { expiration: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Strike *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={leg.strike || ''}
                        onChange={(e) => updateLeg(index, { strike: parseFloat(e.target.value) || 0 })}
                        required
                        placeholder="150.00"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Type *
                      </label>
                      <select
                        value={leg.optionType}
                        onChange={(e) =>
                          updateLeg(index, { optionType: e.target.value as 'call' | 'put' })
                        }
                        required
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      >
                        <option value="call">Call</option>
                        <option value="put">Put</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Side *
                      </label>
                      <select
                        value={leg.side}
                        onChange={(e) => updateLeg(index, { side: e.target.value as 'long' | 'short' })}
                        required
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      >
                        <option value="long">Long</option>
                        <option value="short">Short</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={leg.quantity || ''}
                        onChange={(e) => updateLeg(index, { quantity: parseInt(e.target.value) || 1 })}
                        required
                        placeholder="1"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Price *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={leg.price || ''}
                        onChange={(e) => updateLeg(index, { price: parseFloat(e.target.value) || 0 })}
                        required
                        placeholder="2.50"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Description and Notes */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes"
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Calculator size={16} />
                    Create Strategy
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
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">
                Select Option from Chain - {underlyingSymbol}
                {selectedLegIndex !== null && (
                  <span className="text-sm text-slate-400 ml-2">(for Leg {selectedLegIndex + 1})</span>
                )}
              </h3>
              <button
                onClick={() => {
                  setShowChainSelector(false);
                  setSelectedLegIndex(null);
                }}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="text-slate-400" size={20} />
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

