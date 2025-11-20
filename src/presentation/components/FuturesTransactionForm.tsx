import React, { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, Calculator } from 'lucide-react';
import { useActiveFuturesContractSpecs } from '@/application/hooks/useFuturesContractSpecs';
import { TransactionService } from '@/infrastructure/services/transactionService';
import { formatContractSymbol, calculateFuturesValue, calculateMarginRequirement, calculateExpirationDate } from '@/domain/types/futures.types';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';

interface FuturesTransactionFormProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialValues?: {
    contractId?: string;
    transactionType?: 'Buy' | 'Sell';
    maxQuantity?: number;
    contractMonth?: string; // Month code (e.g., 'Z' for December)
    contractYear?: string; // Year (e.g., '25' for 2025)
  };
}

export const FuturesTransactionForm: React.FC<FuturesTransactionFormProps> = ({
  userId,
  onClose,
  onSuccess,
  initialValues,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: contractSpecs = [], isLoading: specsLoading } = useActiveFuturesContractSpecs(userId);

  // Form fields
  const [selectedContractId, setSelectedContractId] = useState(initialValues?.contractId || '');
  const [transactionType, setTransactionType] = useState<'Buy' | 'Sell'>(initialValues?.transactionType || 'Buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('');
  const [contractMonth, setContractMonth] = useState(initialValues?.contractMonth || '');
  const [contractYear, setContractYear] = useState(initialValues?.contractYear || '');
  const [transactionDate, setTransactionDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Get selected contract spec
  const selectedContract = useMemo(() => {
    return contractSpecs.find(spec => spec.id === selectedContractId) || null;
  }, [contractSpecs, selectedContractId]);

  // Auto-populate fees when contract is selected
  useEffect(() => {
    if (selectedContract && !fees) {
      setFees(selectedContract.fees_per_contract.toString());
    }
  }, [selectedContract, fees]);

  // Set default contract year if not provided in initialValues
  useEffect(() => {
    if (!contractYear && !initialValues?.contractYear) {
      const currentYear = new Date().getFullYear();
      setContractYear(currentYear.toString().slice(-2));
    }
  }, [contractYear, initialValues?.contractYear]);

  // Update form fields when initialValues change
  useEffect(() => {
    if (initialValues?.contractId) {
      setSelectedContractId(initialValues.contractId);
    }
    if (initialValues?.contractMonth) {
      setContractMonth(initialValues.contractMonth);
    }
    if (initialValues?.contractYear) {
      setContractYear(initialValues.contractYear);
    }
    if (initialValues?.transactionType) {
      setTransactionType(initialValues.transactionType);
    }
  }, [initialValues]);

  // Calculate contract details
  const contractCalculations = useMemo(() => {
    if (!selectedContract || !quantity || !price) {
      return null;
    }

    const qty = parseFloat(quantity);
    const prc = parseFloat(price);
    const feeAmt = parseFloat(fees) || 0;

    const notionalValue = calculateFuturesValue(prc, qty, selectedContract.multiplier);
    const marginRequired = selectedContract.initial_margin
      ? calculateMarginRequirement(qty, selectedContract.initial_margin)
      : null;
    const totalFees = feeAmt * Math.abs(qty);

    return {
      notionalValue,
      marginRequired,
      totalFees,
      leverage: marginRequired ? notionalValue / marginRequired : null,
    };
  }, [selectedContract, quantity, price, fees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (!selectedContract) {
        throw new Error('Please select a contract');
      }

      if (!contractMonth) {
        throw new Error('Please select a contract month');
      }

      if (!contractYear) {
        throw new Error('Please enter a contract year');
      }

      const qty = parseFloat(quantity);
      const prc = parseFloat(price);
      const feeAmt = parseFloat(fees) || 0;

      if (isNaN(qty) || qty === 0) {
        throw new Error('Please enter a valid quantity');
      }

      if (isNaN(prc) || prc <= 0) {
        throw new Error('Please enter a valid price');
      }

      // Check max quantity if selling
      if (transactionType === 'Sell' && initialValues?.maxQuantity !== undefined) {
        if (Math.abs(qty) > initialValues.maxQuantity) {
          throw new Error(`Cannot sell more than ${initialValues.maxQuantity} contracts`);
        }
      }

      // Build the full contract symbol (e.g., ESH25)
      const fullContractSymbol = formatContractSymbol(selectedContract.symbol, contractMonth, contractYear);

      // Calculate expiration date from contract month and year
      const contractMonthStr = `${contractMonth}${contractYear}`;
      const expirationDate = calculateExpirationDate(contractMonthStr, selectedContract.symbol);

      // Calculate amount for the transaction
      // For futures, amount represents the notional value
      const notionalValue = prc * qty * selectedContract.multiplier;
      const amount = transactionType === 'Buy' ? -Math.abs(notionalValue) : Math.abs(notionalValue);

      // Combine notes with contract spec ID
      const combinedNotes = notes
        ? `${notes}\nContract Spec ID: ${selectedContract.id}`
        : `Contract Spec ID: ${selectedContract.id}`;

      const transactionData = {
        user_id: userId,
        import_id: null,
        activity_date: transactionDate,
        process_date: transactionDate,
        settle_date: transactionDate,
        description: description || `${transactionType} ${Math.abs(qty)} ${fullContractSymbol}`,
        notes: combinedNotes,
        tags: [],
        fees: feeAmt * Math.abs(qty),
        asset_type: 'futures' as const,
        transaction_code: transactionType,
        underlying_symbol: selectedContract.symbol,
        instrument: fullContractSymbol,
        quantity: transactionType === 'Buy' ? Math.abs(qty) : -Math.abs(qty),
        price: prc,
        amount,
        is_opening: null,
        is_long: transactionType === 'Buy',
        expiration_date: expirationDate || null, // Futures can have expiration_date
        // Explicitly set option-specific fields to null (futures are not options)
        option_type: null,
        strike_price: null,
      };

      await TransactionService.createManualTransaction(transactionData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalRef = useFocusTrap(true);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, isSubmitting]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="futures-transaction-title"
      aria-describedby="futures-transaction-description"
    >
      <div
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 id="futures-transaction-title" className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {initialValues?.transactionType === 'Sell' ? 'Close' : 'Add'} Futures Transaction
              </h2>
              <p id="futures-transaction-description" className="text-sm text-slate-600 dark:text-slate-400">
                {initialValues?.transactionType === 'Sell'
                  ? 'Close an existing futures position'
                  : 'Open a new futures position'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X className="text-slate-600 dark:text-slate-400" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Contract Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Contract *
            </label>
            <select
              value={selectedContractId}
              onChange={(e) => setSelectedContractId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 [&>option]:bg-white dark:[&>option]:bg-slate-800 [&>option]:text-slate-900 dark:[&>option]:text-slate-300 [&>option]:py-2"
              required
              disabled={specsLoading}
            >
              <option value="" className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-500">Select a contract...</option>
              {contractSpecs.map((spec) => (
                <option key={spec.id} value={spec.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-300">
                  {spec.symbol} - {spec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Contract Details - Show when contract is selected */}
          {selectedContract && (
            <div className="p-4 bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Exchange:</span>
                  <span className="ml-2 text-slate-900 dark:text-slate-200">{selectedContract.exchange || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Multiplier:</span>
                  <span className="ml-2 text-slate-900 dark:text-slate-200">{selectedContract.multiplier}</span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Tick Size:</span>
                  <span className="ml-2 text-slate-900 dark:text-slate-200">{selectedContract.tick_size}</span>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Tick Value:</span>
                  <span className="ml-2 text-slate-900 dark:text-slate-200">${selectedContract.tick_value}</span>
                </div>
                {selectedContract.initial_margin && (
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Initial Margin:</span>
                    <span className="ml-2 text-slate-900 dark:text-slate-200">
                      ${selectedContract.initial_margin.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Transaction Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTransactionType('Buy')}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  transactionType === 'Buy'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                disabled={initialValues?.transactionType === 'Sell'}
              >
                Buy (Long)
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('Sell')}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  transactionType === 'Sell'
                    ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                    : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                disabled={initialValues?.transactionType === 'Buy'}
              >
                Sell (Short)
              </button>
            </div>
          </div>

          {/* Contract Month and Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Contract Month *
              </label>
              <select
                value={contractMonth}
                onChange={(e) => setContractMonth(e.target.value)}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 [&>option]:bg-white dark:[&>option]:bg-slate-800 [&>option]:text-slate-900 dark:[&>option]:text-slate-300 [&>option]:py-2"
                required
                disabled={!selectedContract}
              >
                <option value="" className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-500">Select month...</option>
                {selectedContract?.contract_months.map((month) => (
                  <option key={month} value={month} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-300">
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Year *
              </label>
              <input
                type="text"
                value={contractYear}
                onChange={(e) => setContractYear(e.target.value.slice(0, 2))}
                placeholder="25"
                maxLength={2}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                required
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Two-digit year (e.g., 25 for 2025)</p>
            </div>
          </div>

          {/* Quantity and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Quantity (Contracts) *
              </label>
              <input
                type="number"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                required
              />
              {initialValues?.maxQuantity !== undefined && (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Max available: {initialValues.maxQuantity}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                required
              />
            </div>
          </div>

          {/* Fees and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Fees per Contract
              </label>
              <input
                type="number"
                step="0.01"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Transaction Date *
              </label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                required
              />
            </div>
          </div>

          {/* Calculations */}
          {contractCalculations && (
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Contract Calculations</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Notional Value:</span>
                  <span className="ml-2 text-slate-900 dark:text-slate-200 font-semibold">
                    ${Math.abs(contractCalculations.notionalValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {contractCalculations.marginRequired && (
                  <>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">Margin Required:</span>
                      <span className="ml-2 text-slate-900 dark:text-slate-200 font-semibold">
                        ${contractCalculations.marginRequired.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400">Leverage:</span>
                      <span className="ml-2 text-slate-900 dark:text-slate-200 font-semibold">
                        {contractCalculations.leverage?.toFixed(2)}x
                      </span>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Total Fees:</span>
                  <span className="ml-2 text-slate-900 dark:text-slate-200 font-semibold">
                    ${contractCalculations.totalFees.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Description and Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={3}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedContract}
              className="flex-1 px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : transactionType === 'Buy' ? 'Open Position' : 'Close Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
