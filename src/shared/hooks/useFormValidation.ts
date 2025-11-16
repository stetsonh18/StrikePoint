import { useState, useCallback, useMemo } from 'react';

export interface ValidationRule<T = any> {
  validate: (value: T, formData?: Record<string, any>) => boolean | string;
  message?: string;
}

export interface FieldValidation<T = any> {
  rules: ValidationRule<T>[];
  required?: boolean;
}

export interface FormValidationConfig {
  [fieldName: string]: FieldValidation;
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

/**
 * Hook for form validation with real-time feedback
 */
export function useFormValidation<T extends Record<string, any>>(
  config: FormValidationConfig,
  initialData?: Partial<T>
) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Partial<T>>(initialData || {});

  // Validate a single field
  const validateField = useCallback(
    (fieldName: string, value: any): string | null => {
      const fieldConfig = config[fieldName];
      if (!fieldConfig) return null;

      // Check required
      if (fieldConfig.required && (value === '' || value === null || value === undefined)) {
        return fieldConfig.rules.find(r => r.message)?.message || `${fieldName} is required`;
      }

      // Run validation rules
      for (const rule of fieldConfig.rules) {
        const result = rule.validate(value, formData);
        if (result !== true) {
          return typeof result === 'string' ? result : rule.message || `${fieldName} is invalid`;
        }
      }

      return null;
    },
    [config, formData]
  );

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.keys(config).forEach((fieldName) => {
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [config, formData, validateField]);

  // Update field value and validate if touched
  const setFieldValue = useCallback(
    (fieldName: string, value: any) => {
      setFormData((prev) => ({ ...prev, [fieldName]: value }));

      // Clear error if field is touched
      if (touched.has(fieldName)) {
        const error = validateField(fieldName, value);
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (error) {
            newErrors[fieldName] = error;
          } else {
            delete newErrors[fieldName];
          }
          return newErrors;
        });
      }
    },
    [touched, validateField]
  );

  // Mark field as touched
  const setFieldTouched = useCallback((fieldName: string) => {
    setTouched((prev) => new Set(prev).add(fieldName));
    const error = validateField(fieldName, formData[fieldName]);
    if (error) {
      setErrors((prev) => ({ ...prev, [fieldName]: error }));
    }
  }, [formData, validateField]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0 && Object.keys(config).every((fieldName) => {
      const fieldConfig = config[fieldName];
      if (fieldConfig.required) {
        const value = formData[fieldName];
        return value !== '' && value !== null && value !== undefined;
      }
      return true;
    });
  }, [errors, config, formData]);

  // Get field error
  const getFieldError = useCallback((fieldName: string): string | undefined => {
    return errors[fieldName];
  }, [errors]);

  // Check if field has error
  const hasFieldError = useCallback((fieldName: string): boolean => {
    return !!errors[fieldName];
  }, [errors]);

  // Reset form
  const resetForm = useCallback((newData?: Partial<T>) => {
    setFormData(newData || {});
    setErrors({});
    setTouched(new Set());
  }, []);

  return {
    formData,
    errors,
    touched,
    isValid,
    setFieldValue,
    setFieldTouched,
    validateField,
    validateForm,
    getFieldError,
    hasFieldError,
    resetForm,
    setFormData,
  };
}

// Common validation rules
export const validationRules = {
  required: (message?: string): ValidationRule => ({
    validate: (value) => {
      if (value === '' || value === null || value === undefined) {
        return false;
      }
      return true;
    },
    message: message || 'This field is required',
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => {
      if (typeof value !== 'string' || value.length < min) {
        return false;
      }
      return true;
    },
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => {
      if (typeof value !== 'string' || value.length > max) {
        return false;
      }
      return true;
    },
    message: message || `Must be no more than ${max} characters`,
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => {
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num) || num < min) {
        return false;
      }
      return true;
    },
    message: message || `Must be at least ${min}`,
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => {
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num) || num > max) {
        return false;
      }
      return true;
    },
    message: message || `Must be no more than ${max}`,
  }),

  positive: (message?: string): ValidationRule<number> => ({
    validate: (value) => {
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num) || num <= 0) {
        return false;
      }
      return true;
    },
    message: message || 'Must be greater than 0',
  }),

  email: (message?: string): ValidationRule<string> => ({
    validate: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message: message || 'Must be a valid email address',
  }),

  url: (message?: string): ValidationRule<string> => ({
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: message || 'Must be a valid URL',
  }),

  date: (message?: string): ValidationRule<string> => ({
    validate: (value) => {
      const date = new Date(value);
      return !isNaN(date.getTime());
    },
    message: message || 'Must be a valid date',
  }),

  custom: (validator: (value: any, formData?: Record<string, any>) => boolean | string, message?: string): ValidationRule => ({
    validate: validator,
    message,
  }),
};

