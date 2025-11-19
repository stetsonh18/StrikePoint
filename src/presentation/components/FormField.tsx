import React from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  children,
  className = '',
  hint,
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-semibold text-slate-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <span>⚠</span>
          {error}
        </p>
      )}
    </div>
  );
};

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  required,
  hint,
  className = '',
  ...props
}) => {
  return (
    <FormField label={label} error={error} required={required} hint={hint}>
      <input
        className={`
          w-full px-4 py-3 md:py-2.5 bg-slate-800/50 border rounded-xl text-slate-300 
          placeholder-slate-500 focus:outline-none focus:ring-2 transition-all
          text-base md:text-sm
          ${error 
            ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50' 
            : 'border-slate-700/50 focus:ring-emerald-500/50 focus:border-emerald-500/50'
          }
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      />
    </FormField>
  );
};

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  label,
  error,
  required,
  hint,
  className = '',
  ...props
}) => {
  return (
    <FormField label={label} error={error} required={required} hint={hint}>
      <textarea
        className={`
          w-full px-4 py-3 md:py-2.5 bg-slate-800/50 border rounded-xl text-slate-300 
          placeholder-slate-500 focus:outline-none focus:ring-2 transition-all resize-none
          text-base md:text-sm
          ${error 
            ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50' 
            : 'border-slate-700/50 focus:ring-emerald-500/50 focus:border-emerald-500/50'
          }
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      />
    </FormField>
  );
};

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  error,
  required,
  hint,
  options,
  className = '',
  ...props
}) => {
  return (
    <FormField label={label} error={error} required={required} hint={hint}>
      <select
        className={`
          w-full px-4 py-3 md:py-2.5 bg-slate-800/50 border rounded-xl text-slate-300 
          focus:outline-none focus:ring-2 transition-all
          text-base md:text-sm
          [&>option]:bg-slate-800 [&>option]:text-slate-300
          ${error 
            ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50' 
            : 'border-slate-700/50 focus:ring-emerald-500/50 focus:border-emerald-500/50'
          }
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
};

