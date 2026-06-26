'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// SelectValue is used for year selector only; month uses custom label display
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';

const MONTHS = [
  { value: '01', label: 'Janeiro', short: 'Jan' },
  { value: '02', label: 'Fevereiro', short: 'Fev' },
  { value: '03', label: 'Março', short: 'Mar' },
  { value: '04', label: 'Abril', short: 'Abr' },
  { value: '05', label: 'Maio', short: 'Mai' },
  { value: '06', label: 'Junho', short: 'Jun' },
  { value: '07', label: 'Julho', short: 'Jul' },
  { value: '08', label: 'Agosto', short: 'Ago' },
  { value: '09', label: 'Setembro', short: 'Set' },
  { value: '10', label: 'Outubro', short: 'Out' },
  { value: '11', label: 'Novembro', short: 'Nov' },
  { value: '12', label: 'Dezembro', short: 'Dez' },
];

function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  return [currentYear - 1, currentYear, currentYear + 1];
}

interface MonthFilterProps {
  value: string;
  onChange: (month: string | null) => void;
  year?: string;
  onYearChange?: (year: string) => void;
  className?: string;
}

export function MonthFilter({
  value,
  onChange,
  year,
  onYearChange,
  className,
}: MonthFilterProps) {
  const selectedMonth = MONTHS.find((m) => m.value === value);
  const years = getAvailableYears();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Month Selector */}
      <div className="relative">
        <Select value={value} onValueChange={(v) => onChange(v)}>
          <SelectTrigger
            className={cn(
              'w-[140px] h-9',
              'bg-surface-container-low border-outline-variant',
              'hover:bg-surface-container transition-colors',
              'text-on-surface text-sm font-medium',
              'focus:ring-2 focus:ring-primary/30'
            )}
            aria-label="Filtrar por mês"
          >
            <CalendarDays className="w-4 h-4 text-on-surface-variant mr-1.5" />
            <span className="flex flex-1 text-left" data-slot="select-value">
              {selectedMonth?.label || 'Mês'}
            </span>
          </SelectTrigger>
          <SelectContent className="bg-surface-container ring-1 ring-outline-variant">
            {MONTHS.map((month) => (
              <SelectItem
                key={month.value}
                value={month.value}
                className={cn(
                  'text-on-surface focus:bg-surface-container-low focus:text-on-surface',
                  'data-[selected]:bg-primary/10 data-[selected]:text-primary'
                )}
              >
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year Selector */}
      {year && onYearChange && (
        <div className="relative">
          <Select value={year} onValueChange={onYearChange}>
            <SelectTrigger
              className={cn(
                'w-[80px] h-9',
                'bg-surface-container-low border-outline-variant',
                'hover:bg-surface-container transition-colors',
                'text-on-surface text-sm font-medium',
                'focus:ring-2 focus:ring-primary/30'
              )}
              aria-label="Filtrar por ano"
            >
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent className="bg-surface-container ring-1 ring-outline-variant">
              {years.map((y) => (
                <SelectItem
                  key={y}
                  value={String(y)}
                  className={cn(
                    'text-on-surface focus:bg-surface-container-low focus:text-on-surface',
                    'data-[selected]:bg-primary/10 data-[selected]:text-primary'
                  )}
                >
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
