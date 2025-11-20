import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Position, OptionType, PositionUpdate } from '@/domain/types';
import { useUpdatePosition } from '@/application/hooks/usePositions';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import { useToast } from '@/shared/hooks/useToast';

interface PositionEditFormProps {
  position: Position;
  onClose: () => void;
  onSuccess: () => void;
}

export const PositionEditForm: React.FC<PositionEditFormProps> = ({
  position,
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Common fields
  const [quantity, setQuantity] = useState(position.current_quantity.toString());
  const [averagePrice, setAveragePrice] = useState(position.average_opening_price.toString());
  const [notes, setNotes] = useState(position.notes || '');
  const [tags, setTags] = useState(position.tags?.join(', ') || '');
  
  // Option-specific fields
  const [optionType, setOptionType] = useState<OptionType | ''>(position.option_type || '');
  const [strikePrice, setStrikePrice] = useState(position.strike_price?.toString() || '');
  const [expirationDate, setExpirationDate] = useState(position.expiration_date || '');
  
  // Futures-specific fields
  const [contractMonth, setContractMonth] = useState(position.contract_month || '');

  const updatePositionMutation = useUpdatePosition();
  const toast = useToast();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const updates: PositionUpdate = {
        current_quantity: parseFloat(quantity) || 0,
        average_opening_price: parseFloat(averagePrice) || 0,
        notes: notes.trim() || null,
        tags: tags.trim() ? tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0) : [],
      };

      // Recalculate total_cost_basis based on new quantity and average price
      const newQuantity = parseFloat(quantity) || 0;
      const newAveragePrice = parseFloat(averagePrice) || 0;
      // Use position multiplier if available, otherwise default to 100 for options, 1 for others
      const multiplier = position.multiplier || (position.asset_type === 'option' ? 100 : 1);
      const newCostBasis = position.side === 'long' 
        ? -(newQuantity * newAveragePrice * multiplier) // Negative for long (debit)
        : (newQuantity * newAveragePrice * multiplier); // Positive for short (credit)
      
      updates.total_cost_basis = newCostBasis;

      // Asset-specific fields
      if (position.asset_type === 'option') {
        if (optionType) {
          updates.option_type = optionType;
        }
        if (strikePrice) {
          updates.strike_price = parseFloat(strikePrice) || null;
        }
        if (expirationDate) {
          updates.expiration_date = expirationDate;
        }
      }

      if (position.asset_type === 'futures') {
        if (contractMonth) {
          updates.contract_month = contractMonth.toUpperCase();
        }
      }

      await updatePositionMutation.mutateAsync({
        id: position.id,
        updates,
      });

      toast.success('Position updated successfully');
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update position';
      setError(errorMessage);
      toast.error('Failed to update position', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAssetTypeLabel = () => {
    switch (position.asset_type) {
      case 'stock':
        return 'Stock';
      case 'option':
        return 'Option';
      case 'crypto':
        return 'Crypto';
      case 'futures':
        return 'Futures';
      default:
        return 'Position';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="position-edit-form-title"
    >
      <div
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <h2 id="position-edit-form-title" className="text-2xl font-bold text-slate-100">
            Edit {getAssetTypeLabel()} Position
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
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

          {/* Symbol (read-only) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Symbol
            </label>
            <input
              type="text"
              value={position.symbol}
              readOnly
              disabled
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-slate-500">Symbol cannot be changed</p>
          </div>

          {/* Quantity and Average Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                step={position.asset_type === 'crypto' ? '0.00000001' : '0.0001'}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Average Price *
              </label>
              <input
                type="number"
                step="0.01"
                value={averagePrice}
                onChange={(e) => setAveragePrice(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Option-specific fields */}
          {position.asset_type === 'option' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Option Type *
                  </label>
                  <select
                    value={optionType}
                    onChange={(e) => setOptionType(e.target.value as OptionType)}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  >
                    <option value="">Select...</option>
                    <option value="call">Call</option>
                    <option value="put">Put</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Strike Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={strikePrice}
                    onChange={(e) => setStrikePrice(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Expiration Date *
                  </label>
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </>
          )}

          {/* Futures-specific fields */}
          {position.asset_type === 'futures' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contract Month
              </label>
              <input
                type="text"
                value={contractMonth}
                onChange={(e) => setContractMonth(e.target.value.toUpperCase())}
                placeholder="DEC24"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>
          )}

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

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated tags (e.g., tech, growth, dividend)"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
            <p className="mt-1 text-xs text-slate-500">Separate multiple tags with commas</p>
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
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

