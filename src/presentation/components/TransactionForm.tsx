import React, { useState, useEffect, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import type { AssetType, OptionChainEntry } from '@/domain/types';
import { TransactionService } from '@/infrastructure/services/transactionService';
import { CashTransactionRepository } from '@/infrastructure/repositories/cashTransaction.repository';
import { useTransactionCodeCategories, useTransactionCodesByCategory } from '@/application/hooks/useTransactionCodes';
import { CashBalanceService } from '@/infrastructure/services/cashBalanceService';
import { SymbolAutocomplete } from './SymbolAutocomplete';
import { OptionsChain } from './OptionsChain';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import { logger } from '@/shared/utils/logger';

interface TransactionFormProps {
  assetType: AssetType;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
  // Pre-fill values for selling from a position
  initialValues?: {
    symbol?: string;
    transactionType?: 'Buy' | 'Sell';
    maxQuantity?: number;
    // Option-specific fields
    underlyingSymbol?: string;
    optionType?: 'call' | 'put';
    strikePrice?: number;
    expirationDate?: string;
    optionTransactionCode?: 'BTO' | 'STO' | 'BTC' | 'STC';
  };
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  assetType,
  userId,
  onClose,
  onSuccess,
  initialValues,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common fields - single date for all transactions
  // Use local date, not UTC
  const [transactionDate, setTransactionDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  // Time field - restricted to 5-minute increments
  const [transactionTime, setTransactionTime] = useState(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
  
  // Helper function to round time to nearest 5 minutes
  const roundTo5Minutes = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const roundedMinutes = Math.floor(minutes / 5) * 5;
    return `${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
  };
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const roundedTime = roundTo5Minutes(e.target.value);
    setTransactionTime(roundedTime);
  };
  
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Stock/Crypto/Futures fields
  const [symbol, setSymbol] = useState(initialValues?.symbol || '');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('');
  const [transactionCode, setTransactionCode] = useState<'Buy' | 'Sell'>(initialValues?.transactionType || 'Buy');

  // Option fields
  const [underlyingSymbol, setUnderlyingSymbol] = useState(initialValues?.underlyingSymbol || '');
  const [optionType, setOptionType] = useState<'call' | 'put'>(initialValues?.optionType || 'call');
  const [strikePrice, setStrikePrice] = useState(initialValues?.strikePrice?.toString() || '');
  const [expirationDate, setExpirationDate] = useState(initialValues?.expirationDate || '');
  const [optionTransactionCode, setOptionTransactionCode] = useState<'BTO' | 'STO' | 'BTC' | 'STC'>(
    initialValues?.optionTransactionCode || 'BTO'
  );
  const [showChainSelector, setShowChainSelector] = useState(false);

  // Cash fields
  const [cashTransactionCategory, setCashTransactionCategory] = useState<string>('');
  const [cashTransactionCode, setCashTransactionCode] = useState<string>('');
  const [amount, setAmount] = useState('');
  
  // Fetch categories for cash transactions (Cash Movement, Fees)
  const { data: categories = [], isLoading: categoriesLoading } = useTransactionCodeCategories();
  
  // Filter categories relevant to cash transactions
  const cashRelevantCategories = useMemo(() => {
    return categories.filter(cat => 
      ['Cash Movement', 'Fees'].includes(cat)
    );
  }, [categories]);
  
  // Fetch transaction codes for selected category
  const { data: transactionCodes = [], isLoading: codesLoading } = useTransactionCodesByCategory(
    cashTransactionCategory
  );
  
  // Set default category when categories are loaded
  useEffect(() => {
    if (cashRelevantCategories.length > 0 && !cashTransactionCategory) {
      // Default to Cash Movement
      setCashTransactionCategory('Cash Movement');
    }
  }, [cashRelevantCategories, cashTransactionCategory]);
  
  // Set default transaction code when codes are loaded for selected category
  useEffect(() => {
    if (transactionCodes.length > 0 && !cashTransactionCode) {
      // Default to first code in the list
      setCashTransactionCode(transactionCodes[0].trans_code);
    }
  }, [transactionCodes, cashTransactionCode]);
  
  // Reset transaction code when category changes
  useEffect(() => {
    if (cashTransactionCategory) {
      setCashTransactionCode('');
    }
  }, [cashTransactionCategory]);

  // Futures fields
  const [contractMonth, setContractMonth] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Build transaction based on asset type
      // Use single date for all three date fields
      const useDate = transactionDate;
      const useProcessDate = transactionDate;
      const useSettleDate = transactionDate;
      
      // Store entry time in notes for position matching and analytics
      // Format: "ENTRY_TIME:HH:MM" (will be extracted when creating positions)
      const entryTimeNote = `ENTRY_TIME:${transactionTime}`;
      const combinedNotes = notes 
        ? `${notes}\n${entryTimeNote}` 
        : entryTimeNote;
      
      let transactionData: any = {
        user_id: userId,
        import_id: null,
        activity_date: useDate,
        process_date: useProcessDate,
        settle_date: useSettleDate,
        description: description || 'Manual entry',
        notes: combinedNotes,
        tags: [],
        fees: parseFloat(fees) || 0,
      };

      switch (assetType) {
        case 'stock':
          transactionData = {
            ...transactionData,
            asset_type: 'stock',
            transaction_code: transactionCode,
            underlying_symbol: symbol,
            instrument: symbol,
            quantity: parseFloat(quantity) || 0,
            price: parseFloat(price) || 0,
            amount: transactionCode === 'Buy' 
              ? -(parseFloat(price) || 0) * (parseFloat(quantity) || 0) // Negative for buy (debit)
              : (parseFloat(price) || 0) * (parseFloat(quantity) || 0), // Positive for sell (credit)
            is_opening: null,
            is_long: transactionCode === 'Buy',
            // Explicitly set option-specific fields to null for non-option transactions
            option_type: null,
            strike_price: null,
            expiration_date: null,
          };
          break;

        case 'option':
          transactionData = {
            ...transactionData,
            asset_type: 'option',
            transaction_code: optionTransactionCode,
            underlying_symbol: underlyingSymbol,
            instrument: `${underlyingSymbol} ${expirationDate} ${optionType} $${strikePrice}`,
            option_type: optionType,
            strike_price: parseFloat(strikePrice) || 0,
            expiration_date: expirationDate,
            quantity: parseFloat(quantity) || 0,
            price: parseFloat(price) || 0,
            amount: ['BTO', 'BTC'].includes(optionTransactionCode)
              ? -(parseFloat(price) || 0) * (parseFloat(quantity) || 0) * 100 // Negative for buying (debit)
              : (parseFloat(price) || 0) * (parseFloat(quantity) || 0) * 100, // Positive for selling (credit)
            is_opening: ['BTO', 'STO'].includes(optionTransactionCode),
            is_long: ['BTO', 'BTC'].includes(optionTransactionCode),
          };
          break;

        case 'crypto':
          transactionData = {
            ...transactionData,
            asset_type: 'crypto',
            transaction_code: transactionCode,
            underlying_symbol: symbol,
            instrument: symbol,
            quantity: parseFloat(quantity) || 0,
            price: parseFloat(price) || 0,
            amount: transactionCode === 'Buy'
              ? -(parseFloat(price) || 0) * (parseFloat(quantity) || 0)
              : (parseFloat(price) || 0) * (parseFloat(quantity) || 0),
            is_opening: null,
            is_long: transactionCode === 'Buy',
            // Explicitly set option-specific fields to null for non-option transactions
            option_type: null,
            strike_price: null,
            expiration_date: null,
          };
          break;

        case 'futures':
          transactionData = {
            ...transactionData,
            asset_type: 'futures',
            transaction_code: transactionCode,
            underlying_symbol: symbol,
            instrument: `${symbol} ${contractMonth}`,
            quantity: parseFloat(quantity) || 0,
            price: parseFloat(price) || 0,
            amount: transactionCode === 'Buy'
              ? -(parseFloat(price) || 0) * (parseFloat(quantity) || 0)
              : (parseFloat(price) || 0) * (parseFloat(quantity) || 0),
            is_opening: null,
            is_long: transactionCode === 'Buy',
            expiration_date: expirationDate || null, // Futures can have expiration_date
            // Explicitly set option-specific fields to null (futures are not options)
            option_type: null,
            strike_price: null,
          };
          break;

        case 'cash':
          const cashAmount = parseFloat(amount) || 0;
          
          // Determine if this is a credit (positive) or debit (negative) transaction
          // Credits: ACH, RTP, DCF, INT, CDIV, SLIP, GMPC, OCC (deposits, income)
          // Debits: WD, WDRL, WITHD, WIRE, WT, FEE, GOLD (withdrawals, fees)
          const creditCodes = ['ACH', 'RTP', 'DCF', 'INT', 'CDIV', 'SLIP', 'GMPC', 'OCC', 'DEP', 'DEPOSIT', 'WIRE'];
          const isCredit = creditCodes.includes(cashTransactionCode);
          
          // Save to cash_transactions table
          await CashTransactionRepository.create({
            user_id: userId,
            transaction_code: cashTransactionCode,
            amount: isCredit ? cashAmount : -cashAmount,
            description: description || null,
            notes: notes || null,
            activity_date: useDate,
            process_date: useProcessDate,
            settle_date: useSettleDate,
            symbol: null,
            tags: [],
          });
          
          // Also update cash balance
          try {
            await CashBalanceService.updateBalanceFromTransaction(
              userId,
              {
                id: '',
                user_id: userId,
                import_id: null,
                activity_date: useDate,
                process_date: useProcessDate,
                settle_date: useSettleDate,
                description: description || 'Manual entry',
                notes: notes || null,
                tags: [],
                fees: 0,
                asset_type: 'cash',
                transaction_code: cashTransactionCode,
                underlying_symbol: null,
                instrument: null,
                quantity: null,
                price: null,
                amount: isCredit ? cashAmount : -cashAmount,
                is_opening: null,
                is_long: null,
                position_id: null,
                strategy_id: null,
                option_type: null,
                strike_price: null,
                expiration_date: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            );
          } catch (error) {
            logger.error('Error updating cash balance', error);
            // Don't fail the transaction creation if balance update fails
          }
          
          onSuccess();
          onClose();
          return; // Early return for cash transactions
      }

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
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transaction-form-title"
    >
      <div
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 md:p-6 flex items-center justify-between">
          <h2 id="transaction-form-title" className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
            Add {assetType.charAt(0).toUpperCase() + assetType.slice(1)} Transaction
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="text-slate-600 dark:text-slate-400" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Common Fields - Date and Time Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Date *
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
                Time (5-min increments) *
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

          {/* Asset Type Specific Fields */}
          {assetType === 'stock' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Symbol *
                </label>
                <SymbolAutocomplete
                  value={symbol}
                  onChange={setSymbol}
                  placeholder="AAPL"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Type *
                  </label>
                  <select
                    value={transactionCode}
                    onChange={(e) => setTransactionCode(e.target.value as 'Buy' | 'Sell')}
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  >
                    <option value="Buy">Buy</option>
                    <option value="Sell">Sell</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100"
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Price per Share *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="150.00"
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Fees
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </>
          )}

          {assetType === 'option' && (
            <>
              <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Underlying Symbol *
                </label>
                <div className="flex gap-2">
                  <SymbolAutocomplete
                    value={underlyingSymbol}
                    onChange={setUnderlyingSymbol}
                    placeholder="SPX, SPXW, XSP, AAPL"
                    required
                    mode="option"
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setShowChainSelector(true)}
                    disabled={!underlyingSymbol}
                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Search size={16} />
                    Chain
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Transaction Type *
                  </label>
                  <select
                    value={optionTransactionCode}
                    onChange={(e) => setOptionTransactionCode(e.target.value as any)}
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  >
                    <option value="BTO">Buy To Open</option>
                    <option value="STO">Sell To Open</option>
                    <option value="BTC">Buy To Close</option>
                    <option value="STC">Sell To Close</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Option Type *
                  </label>
                  <select
                    value={optionType}
                    onChange={(e) => setOptionType(e.target.value as 'call' | 'put')}
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  >
                    <option value="call">Call</option>
                    <option value="put">Put</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Strike Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={strikePrice}
                    onChange={(e) => setStrikePrice(e.target.value)}
                    placeholder="4500"
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Expiration Date *
                  </label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Contracts *
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (initialValues?.maxQuantity) {
                        const numVal = parseFloat(val) || 0;
                        if (numVal > initialValues.maxQuantity) {
                          setQuantity(initialValues.maxQuantity.toString());
                          return;
                        }
                      }
                      setQuantity(val);
                    }}
                    placeholder="1"
                    max={initialValues?.maxQuantity}
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                  {initialValues?.maxQuantity && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                      Maximum: {initialValues.maxQuantity} contracts
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Price per Contract *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="5.50"
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Fees
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </>
          )}

          {assetType === 'crypto' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Cryptocurrency *
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="BTC, ETH, SOL..."
                  required
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Type *
                  </label>
                  <select
                    value={transactionCode}
                    onChange={(e) => setTransactionCode(e.target.value as 'Buy' | 'Sell')}
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  >
                    <option value="Buy">Buy</option>
                    <option value="Sell">Sell</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0.001"
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Price per Unit *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="50000.00"
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Fees
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </>
          )}

          {assetType === 'futures' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Symbol *
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="ES"
                  required
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Type *
                  </label>
                  <select
                    value={transactionCode}
                    onChange={(e) => setTransactionCode(e.target.value as 'Buy' | 'Sell')}
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  >
                    <option value="Buy">Buy</option>
                    <option value="Sell">Sell</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Contract Month
                  </label>
                  <input
                    type="text"
                    value={contractMonth}
                    onChange={(e) => setContractMonth(e.target.value.toUpperCase())}
                    placeholder="DEC24"
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="4500.00"
                    required
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Fees
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fees}
                    onChange={(e) => setFees(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </>
          )}

          {assetType === 'cash' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Category *
                  </label>
                  {categoriesLoading ? (
                    <div className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 text-sm">
                      Loading categories...
                    </div>
                  ) : (
                    <select
                      value={cashTransactionCategory}
                      onChange={(e) => setCashTransactionCategory(e.target.value)}
                      required
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    >
                      <option value="">Select Category</option>
                      {cashRelevantCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Transaction Type *
                  </label>
                  {!cashTransactionCategory ? (
                    <div className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 text-sm">
                      Select a category first
                    </div>
                  ) : codesLoading ? (
                    <div className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 text-sm">
                      Loading transaction codes...
                    </div>
                  ) : (
                    <select
                      value={cashTransactionCode}
                      onChange={(e) => setCashTransactionCode(e.target.value)}
                      required
                      disabled={!cashTransactionCategory || transactionCodes.length === 0}
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Transaction Type</option>
                      {transactionCodes.map((code) => {
                        // Check if there are multiple codes with the same description
                        const duplicateDescriptions = transactionCodes.filter(
                          c => c.description === code.description
                        );
                        const displayText = duplicateDescriptions.length > 1
                          ? `${code.description} (${code.trans_code})`
                          : code.description;
                        
                        return (
                          <option key={code.trans_code} value={code.trans_code}>
                            {displayText}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000.00"
                  required
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
            </>
          )}

          {/* Description and Notes */}
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={3}
              className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Transaction'}
            </button>
          </div>
        </form>
      </div>

      {/* Options Chain Selector Modal */}
      {assetType === 'option' && showChainSelector && underlyingSymbol && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Select Option from Chain - {underlyingSymbol}
              </h3>
              <button
                onClick={() => setShowChainSelector(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="text-slate-600 dark:text-slate-400" size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <OptionsChain
                underlyingSymbol={underlyingSymbol}
                onSelectOption={(entry: OptionChainEntry) => {
                  // Auto-fill form fields
                  setOptionType(entry.option_type);
                  setStrikePrice(entry.strike.toString());
                  setExpirationDate(entry.expiration);
                  if (entry.last) {
                    setPrice(entry.last.toString());
                  } else if (entry.bid && entry.ask) {
                    // Use mid price if last is not available
                    setPrice(((entry.bid + entry.ask) / 2).toFixed(2));
                  }
                  setShowChainSelector(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

