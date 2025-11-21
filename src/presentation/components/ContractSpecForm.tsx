import React, { useState, useEffect } from 'react';
import { X, Save, TrendingUp } from 'lucide-react';
import { useCreateFuturesContractSpec, useUpdateFuturesContractSpec } from '@/application/hooks/useFuturesContractSpecs';
import type { FuturesContractSpec, FuturesContractSpecInsert, FuturesContractSpecUpdate } from '@/domain/types';
import { ALL_MONTHS, QUARTERLY_MONTHS, FUTURES_MONTH_CODES } from '@/domain/types/futures.types';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import { logger } from '@/shared/utils/logger';

interface ContractSpecFormProps {
  contract?: FuturesContractSpec | null;
  userId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ContractSpecForm: React.FC<ContractSpecFormProps> = ({ contract, userId, onClose, onSuccess }) => {
  const isEditing = !!contract;
  const createMutation = useCreateFuturesContractSpec();
  const updateMutation = useUpdateFuturesContractSpec();

  type FormField = keyof FuturesContractSpecInsert;
  type ErrorKey = FormField | 'contract_months';

  const [formData, setFormData] = useState<FuturesContractSpecInsert>({
    symbol: '',
    name: '',
    exchange: '',
    multiplier: 1,
    tick_size: 0.01,
    tick_value: 1,
    initial_margin: null,
    maintenance_margin: null,
    contract_months: ['H', 'M', 'U', 'Z'], // Default to quarterly
    fees_per_contract: 0,
    is_active: true,
    description: '',
  });

  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set(['H', 'M', 'U', 'Z']));
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({});

  useEffect(() => {
    if (contract) {
      setFormData({
        symbol: contract.symbol,
        name: contract.name,
        exchange: contract.exchange,
        multiplier: contract.multiplier,
        tick_size: contract.tick_size,
        tick_value: contract.tick_value,
        initial_margin: contract.initial_margin,
        maintenance_margin: contract.maintenance_margin,
        contract_months: contract.contract_months,
        fees_per_contract: contract.fees_per_contract,
        is_active: contract.is_active,
        description: contract.description,
      });
      setSelectedMonths(new Set(contract.contract_months));
    }
  }, [contract]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<ErrorKey, string>> = {};

    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Symbol is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.multiplier <= 0) {
      newErrors.multiplier = 'Multiplier must be greater than 0';
    }

    if (formData.tick_size <= 0) {
      newErrors.tick_size = 'Tick size must be greater than 0';
    }

    if (formData.tick_value <= 0) {
      newErrors.tick_value = 'Tick value must be greater than 0';
    }

    if (selectedMonths.size === 0) {
      newErrors.contract_months = 'At least one contract month must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const dataToSubmit: FuturesContractSpecInsert = {
      ...formData,
      symbol: formData.symbol.toUpperCase(),
      contract_months: Array.from(selectedMonths),
      user_id: userId || null, // Include user_id for user-specific specs
    };

    try {
      if (isEditing && contract) {
        // If editing a system default (user_id is null), create a user-specific override instead
        if (!contract.user_id && userId) {
          // Create a new user-specific contract based on the system default
          await createMutation.mutateAsync(dataToSubmit);
        } else {
          // Update existing user-specific contract
          const updatePayload: FuturesContractSpecUpdate = {
            ...dataToSubmit,
          };
          await updateMutation.mutateAsync({
            id: contract.id,
            updates: updatePayload,
          });
        }
      } else {
        await createMutation.mutateAsync(dataToSubmit);
      }
      onSuccess();
    } catch (error) {
      logger.error('Error saving contract spec', error);
    }
  };

  const handleInputChange = <K extends keyof FuturesContractSpecInsert>(
    field: K,
    value: FuturesContractSpecInsert[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    setErrors((prev) => {
      const errorKey = field as ErrorKey;
      if (!prev[errorKey]) {
        return prev;
      }
      const updatedErrors = { ...prev };
      delete updatedErrors[errorKey];
      return updatedErrors;
    });
  };

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
    // Clear month error
    if (errors.contract_months) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.contract_months;
        return newErrors;
      });
    }
  };

  const selectQuarterlyMonths = () => {
    setSelectedMonths(new Set(QUARTERLY_MONTHS));
  };

  const selectAllMonths = () => {
    setSelectedMonths(new Set(ALL_MONTHS));
  };

  const clearAllMonths = () => {
    setSelectedMonths(new Set());
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contract-spec-title"
      aria-describedby="contract-spec-description"
    >
      <div
        ref={modalRef as React.RefObject<HTMLDivElement>}
        className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 id="contract-spec-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {isEditing ? 'Edit Contract Specification' : 'Add Contract Specification'}
              </h2>
              <p id="contract-spec-description" className="text-sm text-slate-600 dark:text-slate-400">
                {isEditing && contract && !contract.user_id && userId
                  ? 'Editing a system default will create a custom override with your margin requirements'
                  : 'Define futures contract parameters and margin requirements'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info banner for system default editing */}
          {isEditing && contract && !contract.user_id && userId && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Note:</strong> You're editing a system default contract. Saving will create a custom override with your margin requirements. The system default will remain unchanged for other users.
              </p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Basic Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Symbol *
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => handleInputChange('symbol', e.target.value)}
                  placeholder="ES, NQ, CL, GC..."
                  className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border ${
                    errors.symbol ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                  } rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50`}
                />
                {errors.symbol && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.symbol}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Exchange
                </label>
                <input
                  type="text"
                  value={formData.exchange || ''}
                  onChange={(e) => handleInputChange('exchange', e.target.value || null)}
                  placeholder="CME, CBOT, NYMEX..."
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="E-mini S&P 500, Crude Oil, Gold..."
                className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border ${
                  errors.name ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                } rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value || null)}
                placeholder="Additional notes about the contract..."
                rows={2}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Contract Specifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Contract Specifications
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Multiplier *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.multiplier}
                  onChange={(e) => handleInputChange('multiplier', parseFloat(e.target.value) || 0)}
                  placeholder="50"
                  className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border ${
                    errors.multiplier ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                  } rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50`}
                />
                {errors.multiplier && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.multiplier}</p>}
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Contract size multiplier</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Fees per Contract
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fees_per_contract}
                  onChange={(e) => handleInputChange('fees_per_contract', parseFloat(e.target.value) || 0)}
                  placeholder="2.50"
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Typical commission per contract</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tick Size *
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  value={formData.tick_size}
                  onChange={(e) => handleInputChange('tick_size', parseFloat(e.target.value) || 0)}
                  placeholder="0.25"
                  className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border ${
                    errors.tick_size ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                  } rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50`}
                />
                {errors.tick_size && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tick_size}</p>}
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Minimum price movement</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Tick Value *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tick_value}
                  onChange={(e) => handleInputChange('tick_value', parseFloat(e.target.value) || 0)}
                  placeholder="12.50"
                  className={`w-full px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border ${
                    errors.tick_value ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'
                  } rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50`}
                />
                {errors.tick_value && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tick_value}</p>}
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">Dollar value per tick</p>
              </div>
            </div>
          </div>

          {/* Margin Requirements */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Margin Requirements
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Initial Margin
                </label>
                <input
                  type="number"
                  step="1"
                  value={formData.initial_margin || ''}
                  onChange={(e) => handleInputChange('initial_margin', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="13200"
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">USD required to open position</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Maintenance Margin
                </label>
                <input
                  type="number"
                  step="1"
                  value={formData.maintenance_margin || ''}
                  onChange={(e) => handleInputChange('maintenance_margin', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="12000"
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-300 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">USD to maintain position</p>
              </div>
            </div>
          </div>

          {/* Contract Months */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Contract Months
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectQuarterlyMonths}
                  className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Quarterly
                </button>
                <button
                  type="button"
                  onClick={selectAllMonths}
                  className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={clearAllMonths}
                  className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {ALL_MONTHS.map((month) => (
                <button
                  key={month}
                  type="button"
                  onClick={() => toggleMonth(month)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedMonths.has(month)
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-bold">{month}</div>
                    <div className="text-xs mt-0.5">{FUTURES_MONTH_CODES[month].slice(0, 3)}</div>
                  </div>
                </button>
              ))}
            </div>
            {errors.contract_months && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.contract_months}</p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Select valid expiration months for this contract
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="w-4 h-4 text-emerald-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded focus:ring-2 focus:ring-emerald-500/50"
            />
            <label htmlFor="is_active" className="text-sm text-slate-700 dark:text-slate-300">
              Contract is active and tradeable
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {isPending ? 'Saving...' : isEditing ? 'Update Contract' : 'Create Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
