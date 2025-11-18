import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

/**
 * Standardized Select component matching app styling
 * 
 * Usage:
 * ```tsx
 * <Select
 *   value={selectedValue}
 *   onChange={(e) => setSelectedValue(e.target.value)}
 *   options={[
 *     { value: 'option1', label: 'Option 1' },
 *     { value: 'option2', label: 'Option 2' },
 *   ]}
 * />
 * ```
 */
export const Select: React.FC<SelectProps> = ({
  options,
  placeholder,
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3',
    lg: 'px-4 py-3.5 text-lg',
  };

  const baseClasses = `
    bg-slate-100 dark:bg-slate-800/50 
    border 
    border-slate-300 dark:border-slate-700/50 
    rounded-xl 
    text-slate-900 dark:text-slate-300 
    focus:outline-none 
    focus:ring-2 
    focus:ring-emerald-500/50 
    focus:border-emerald-500/50 
    transition-all 
    [&>option]:bg-white dark:[&>option]:bg-slate-800 
    [&>option]:text-slate-900 dark:[&>option]:text-slate-300
    disabled:opacity-50 
    disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <select
      className={baseClasses}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
};

