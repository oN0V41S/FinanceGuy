import * as React from 'react';

import { cn } from '@/lib/utils';

export interface ToggleProps {
  id?: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
  icon?: React.ReactNode;
  colorScheme?: 'default' | 'paid';
}

export function Toggle({
  checked,
  onChange,
  onCheckedChange,
  disabled = false,
  className,
  icon,
  colorScheme = 'default',
  ...props
}: ToggleProps) {
  const handleChange = (next: boolean) => {
    if (disabled) return;
    onChange?.(next);
    onCheckedChange?.(next);
  };

  const bgColor = colorScheme === 'paid'
    ? checked ? 'bg-finance-income' : 'bg-finance-expense'
    : checked ? 'bg-primary' : 'bg-surface-container-low';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      aria-label={props['aria-label']}
      onClick={() => handleChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50',
        bgColor,
        className
      )}
    >
      {icon && (
        <span className="absolute left-1 z-10 flex items-center justify-center">
          {icon}
        </span>
      )}
      <span
        className={cn(
          'pointer-events-none inline-block size-4 rounded-full bg-on-primary shadow-sm transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}
