import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TransactionService } from '@/infrastructure/services/transactionService';
import type { StockPosition, TransactionInsert } from '@/domain/types';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';

interface SellPositionFormProps {
  position: StockPosition;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const SellPositionForm: React.FC<SellPositionFormProps> = ({
  position,
  userId,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  // Use local date, not UTC
  const [transactionDate, setTransactionDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [quantity, setQuantity] = useState(position.quantity.toString());
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('0.00');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Validate quantity doesn't exceed available
  const maxQuantity = position.quantity;
  const quantityNum = parseFloat(quantity) || 0;

  useEffect(() => {
    if (quantityNum > maxQuantity) {
      setQuantity(maxQuantity.toString());
    }
  }, [quantityNum, maxQuantity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validation
    if (quantityNum <= 0) {
      setError('Quantity must be greater than 0');
      setIsSubmitting(false);
      return;
    }

    if (quantityNum > maxQuantity) {
      setError(`Cannot sell more than ${maxQuantity} shares`);
      setIsSubmitting(false);
      return;
    }

    const priceNum = parseFloat(price);
    if (!priceNum || priceNum <= 0) {
      setError('Price must be greater than 0');
      setIsSubmitting(false);
      return;
    }

    try {
      const useDate = transactionDate;
      const useProcessDate = transactionDate;
      const useSettleDate = transactionDate;

      const transactionData = {
        user_id: userId,
        activity_date: useDate,
        process_date: useProcessDate,
        settle_date: useSettleDate,
        description: description || `Sold ${quantityNum} shares of ${position.symbol}`,
        notes: notes || null,
        tags: [] as string[],
        fees: parseFloat(fees) || 0,
        asset_type: 'stock' as const,
        transaction_code: 'Sell',
        underlying_symbol: position.symbol,
        instrument: position.symbol,
        quantity: quantityNum,
        price: priceNum,
        amount: priceNum * quantityNum, // Positive for sell (credit)
        is_opening: null,
        is_long: false, // Sell is not long
        option_type: null,
        strike_price: null,
        expiration_date: null,
        position_id: position.id,
        strategy_id: null,
      } satisfies Omit<TransactionInsert, 'import_id'>;

      await TransactionService.createManualTransaction(transactionData);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sell transaction');
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
      aria-labelledby="sell-position-title"
      aria-describedby="sell-position-description"
    >
      <div
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 id="sell-position-title" className="text-2xl font-bold text-slate-100">Sell Position</h2>
            <p id="sell-position-description" className="text-sm text-slate-400 mt-1">
              {position.symbol} • {position.quantity} shares available
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            <X className="text-slate-400" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Position Info */}
          <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-400">Symbol</div>
                <div className="text-slate-100 font-semibold">{position.symbol}</div>
              </div>
              <div>
                <div className="text-slate-400">Available</div>
                <div className="text-slate-100 font-semibold">{position.quantity} shares</div>
              </div>
              <div>
                <div className="text-slate-400">Avg Cost</div>
                <div className="text-slate-100 font-semibold">
                  ${position.averagePrice?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Cost Basis</div>
                <div className="text-slate-100 font-semibold">
                  ${position.costBasis?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Sale Date *
            </label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Quantity to Sell * (Max: {maxQuantity})
            </label>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              max={maxQuantity}
              value={quantity}
              onChange={(e) => {
                const val = e.target.value;
                const num = parseFloat(val);
                if (val === '' || (num > 0 && num <= maxQuantity)) {
                  setQuantity(val);
                }
              }}
              required
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
            {quantityNum > 0 && (
              <div className="mt-2 text-xs text-slate-400">
                Selling {quantityNum} shares ({((quantityNum / maxQuantity) * 100).toFixed(1)}% of position)
              </div>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Sale Price per Share *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="150.00"
              required
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
            {price && quantityNum > 0 && (
              <div className="mt-2 text-xs text-slate-400">
                Gross proceeds: ${(parseFloat(price) * quantityNum).toFixed(2)}
              </div>
            )}
          </div>

          {/* Fees */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Fees
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
            {price && quantityNum > 0 && fees && (
              <div className="mt-2 text-xs text-slate-400">
                Net proceeds: ${(parseFloat(price) * quantityNum - parseFloat(fees)).toFixed(2)}
              </div>
            )}
          </div>

          {/* Description */}
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

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={3}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || quantityNum <= 0 || !price || parseFloat(price) <= 0}
              className="flex-1 px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Selling...' : 'Sell Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

