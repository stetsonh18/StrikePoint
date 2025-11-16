import { useState, useCallback } from 'react';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions>({
    title: '',
    message: '',
  });
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);

  const confirm = useCallback(
    (opts: ConfirmationOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setOptions(opts);
        setOnConfirmCallback(() => () => {
          setIsOpen(false);
          resolve(true);
        });
        setIsOpen(true);
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    if (onConfirmCallback) {
      onConfirmCallback();
      setOnConfirmCallback(null);
    }
  }, [onConfirmCallback]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setOnConfirmCallback(null);
  }, []);

  return {
    isOpen,
    options,
    confirm,
    handleConfirm,
    handleCancel,
  };
}

