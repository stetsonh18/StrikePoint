import { useState } from 'react';
import { Modal } from './Modal';

interface CustomDateRange {
  startDate: string; // ISO format: "YYYY-MM-DD"
  endDate: string;   // ISO format: "YYYY-MM-DD"
}

interface CustomDateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (range: CustomDateRange) => void;
  initialRange?: CustomDateRange;
}

export const CustomDateRangeModal = ({
  isOpen,
  onClose,
  onApply,
  initialRange,
}: CustomDateRangeModalProps) => {
  const [startDate, setStartDate] = useState(initialRange?.startDate || '');
  const [endDate, setEndDate] = useState(initialRange?.endDate || '');
  const [errors, setErrors] = useState({ startDate: '', endDate: '' });

  const validate = (): boolean => {
    const newErrors = { startDate: '', endDate: '' };
    let isValid = true;

    // 1. Both dates required
    if (!startDate) {
      newErrors.startDate = 'Start date is required';
      isValid = false;
    }
    if (!endDate) {
      newErrors.endDate = 'End date is required';
      isValid = false;
    }

    // 2. Start date must be before end date
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = 'End date must be after start date';
      isValid = false;
    }

    // 3. Prevent future dates
    const today = new Date().toISOString().split('T')[0];
    if (startDate > today) {
      newErrors.startDate = 'Start date cannot be in the future';
      isValid = false;
    }
    if (endDate > today) {
      newErrors.endDate = 'End date cannot be in the future';
      isValid = false;
    }

    // 4. Reasonable maximum range (10 years)
    if (startDate && endDate) {
      const daysDiff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 3650) {
        newErrors.endDate = 'Date range cannot exceed 10 years';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleApply = () => {
    if (validate()) {
      onApply({ startDate, endDate });
    }
  };

  const handleCancel = () => {
    // Reset to initial values
    setStartDate(initialRange?.startDate || '');
    setEndDate(initialRange?.endDate || '');
    setErrors({ startDate: '', endDate: '' });
    onClose();
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Custom Date Range"
      description="Select a custom date range for analytics"
      size="sm"
    >
      <div className="space-y-4">
        {/* Start Date */}
        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={today}
            className={`w-full px-4 py-2 rounded-lg border ${
              errors.startDate
                ? 'border-red-500 dark:border-red-500'
                : 'border-slate-300 dark:border-slate-600'
            } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400`}
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startDate}</p>
          )}
        </div>

        {/* End Date */}
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            End Date
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            max={today}
            className={`w-full px-4 py-2 rounded-lg border ${
              errors.endDate
                ? 'border-red-500 dark:border-red-500'
                : 'border-slate-300 dark:border-slate-600'
            } bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400`}
          />
          {errors.endDate && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endDate}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors font-medium"
          >
            Apply
          </button>
        </div>
      </div>
    </Modal>
  );
};
