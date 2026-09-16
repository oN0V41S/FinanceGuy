'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedToggleProps<T extends string> {
  options: readonly SegmentedToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  getTestId?: (value: T) => string;
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className,
  getTestId,
}: SegmentedToggleProps<T>) {
  return (
    <div role="tablist" className={cn('flex items-center gap-1 rounded-lg bg-muted p-1', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          data-testid={getTestId?.(opt.value)}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            value === opt.value
              ? 'bg-primary text-on-primary shadow-sm'
              : 'text-muted-foreground hover:text-on-surface',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
