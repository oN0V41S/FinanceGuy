'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CalendarRange } from 'lucide-react';

export type FortnightValue = 'all' | 'first' | 'second';

const FORTNIGHT_OPTIONS: { value: FortnightValue; label: string }[] = [
  { value: 'all', label: 'Mês inteiro' },
  { value: 'first', label: 'Dia 1 ao 15' },
  { value: 'second', label: 'Dia 16 ao 31' },
];

interface FortnightFilterProps {
  value: FortnightValue;
  onChange: (value: FortnightValue) => void;
  className?: string;
}

export function FortnightFilter({ value, onChange, className }: FortnightFilterProps) {
  const selectedLabel = FORTNIGHT_OPTIONS.find((o) => o.value === value)?.label || 'Mês inteiro';

  return (
    <div className={cn('relative', className)}>
      <Select value={value} onValueChange={(v) => onChange(v as FortnightValue)}>
        <SelectTrigger
          className={cn(
            'w-[155px] h-9',
            'bg-surface-container-low border-outline-variant',
            'hover:bg-surface-container transition-colors',
            'text-on-surface text-sm font-medium',
            'focus:ring-2 focus:ring-primary/30'
          )}
          aria-label="Filtrar por quinzena"
        >
          <CalendarRange className="w-4 h-4 text-on-surface-variant mr-1.5" />
          <span className="flex flex-1 text-left">
            {selectedLabel}
          </span>
        </SelectTrigger>
        <SelectContent className="bg-surface-container ring-1 ring-outline-variant">
          {FORTNIGHT_OPTIONS.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className={cn(
                'text-on-surface focus:bg-surface-container-low focus:text-on-surface',
                'data-[selected]:bg-primary/10 data-[selected]:text-primary'
              )}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
