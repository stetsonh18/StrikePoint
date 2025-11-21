import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export interface DropdownOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface DropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: DropdownOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    className,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    'flex items-center justify-between w-full text-left transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50',
                    disabled && 'opacity-50 cursor-not-allowed',
                    className
                )}
            >
                <span className={cn('block truncate', !selectedOption && 'text-slate-500')}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    className={cn(
                        'w-4 h-4 text-slate-400 transition-transform duration-200',
                        isOpen && 'transform rotate-180'
                    )}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-100">
                    <ul className="max-h-60 overflow-auto py-1">
                        {options.map((option) => (
                            <li
                                key={option.value}
                                onClick={() => !option.disabled && handleSelect(option.value)}
                                className={cn(
                                    'relative flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors',
                                    option.value === value
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
                                    option.disabled && 'opacity-50 cursor-not-allowed'
                                )}
                            >
                                <span className="block truncate font-medium">{option.label}</span>
                                {option.value === value && (
                                    <Check className="w-4 h-4 text-emerald-500" />
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
