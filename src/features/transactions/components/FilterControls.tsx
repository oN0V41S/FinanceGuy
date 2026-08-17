'use client';

import React from 'react';
import { Filter } from 'lucide-react';
import { getYearOptions } from '@/shared/utils';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUINZENAL_OPTIONS = [
  { value: 'month', label: 'Por Mês' },
  { value: 'first', label: '1ª Quinzena' },
  { value: 'second', label: '2ª Quinzena' },
] as const;

const PAID_OPTIONS = [
  { value: 'all', label: 'Pagas/Não Pagas' },
  { value: 'paid', label: 'Pagas' },
  { value: 'unpaid', label: 'Não Pagas' },
] as const;

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FilterControlsProps {
  quinzenalFilter: 'month' | 'first' | 'second';
  onQuinzenalFilterChange: (value: 'month' | 'first' | 'second') => void;
  selectedYear: string;
  onYearChange: (value: string) => void;
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  paidFilter: 'all' | 'paid' | 'unpaid';
  onPaidFilterChange: (value: 'all' | 'paid' | 'unpaid') => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FilterControls: React.FC<FilterControlsProps> = ({
  quinzenalFilter,
  onQuinzenalFilterChange,
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
  paidFilter,
  onPaidFilterChange,
}) => {
  const yearOptions = getYearOptions();

  return (
    <div className="bg-muted/50 p-4">
      <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-center md:gap-4">
        {/* Filter icon — hidden on mobile */}
        <div className="hidden md:flex md:items-center md:gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Quinzenal filter (col 1 on mobile) */}
        <div data-testid="select-quinzenal" className="w-full md:w-auto">
          <Select
            value={quinzenalFilter}
            onValueChange={(value) => {
              if (value !== null) onQuinzenalFilterChange(value as 'month' | 'first' | 'second');
            }}
          >
            <SelectTrigger
              className={cn(
                'w-full md:w-[155px] h-9',
                'bg-surface-container-low border-outline-variant',
                'hover:bg-surface-container transition-colors',
                'text-on-surface text-sm font-medium',
                'focus:ring-2 focus:ring-primary/30'
              )}
              aria-label="Filtrar por período"
            >
              <SelectValue placeholder="Filtrar por período">
                {(v) => QUINZENAL_OPTIONS.find((o) => o.value === v)?.label || 'Filtrar por período'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-surface-container ring-1 ring-outline-variant">
              {QUINZENAL_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-on-surface focus:bg-surface-container-low focus:text-on-surface data-[selected]:bg-primary/10 data-[selected]:text-primary"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Paid filter (col 2 on mobile) */}
        <div data-testid="select-paid" className="w-full md:w-auto">
          <Select
            value={paidFilter}
            onValueChange={(value) => {
              if (value !== null) onPaidFilterChange(value as 'all' | 'paid' | 'unpaid');
            }}
          >
            <SelectTrigger
              className={cn(
                'w-full md:w-[160px] h-9',
                'bg-surface-container-low border-outline-variant',
                'hover:bg-surface-container transition-colors',
                'text-on-surface text-sm font-medium',
                'focus:ring-2 focus:ring-primary/30'
              )}
              aria-label="Filtrar por pagamento"
            >
              <SelectValue placeholder="Filtrar por status">
                {(v) => PAID_OPTIONS.find((o) => o.value === v)?.label || 'Pagamento'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-surface-container ring-1 ring-outline-variant">
              {PAID_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-on-surface focus:bg-surface-container-low focus:text-on-surface data-[selected]:bg-primary/10 data-[selected]:text-primary"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year filter (col 1 on mobile) */}
        <div data-testid="select-year" className="w-full md:w-auto">
          <Select
            value={selectedYear}
            onValueChange={(value) => {
              if (value !== null) onYearChange(value);
            }}
          >
            <SelectTrigger
              className={cn(
                'w-full md:w-[110px] h-9',
                'bg-surface-container-low border-outline-variant',
                'hover:bg-surface-container transition-colors',
                'text-on-surface text-sm font-medium',
                'focus:ring-2 focus:ring-primary/30'
              )}
              aria-label="Selecionar ano"
            >
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent className="bg-surface-container ring-1 ring-outline-variant">
              {yearOptions.map((year) => (
                <SelectItem
                  key={year}
                  value={String(year)}
                  className="text-on-surface focus:bg-surface-container-low focus:text-on-surface data-[selected]:bg-primary/10 data-[selected]:text-primary"
                >
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Month filter (col 2 on mobile) */}
        <div data-testid="select-month" className="w-full md:w-auto">
          <Select
            value={selectedMonth}
            onValueChange={(value) => {
              if (value !== null) onMonthChange(value);
            }}
          >
            <SelectTrigger
              className={cn(
                'w-full md:w-[155px] h-9',
                'bg-surface-container-low border-outline-variant',
                'hover:bg-surface-container transition-colors',
                'text-on-surface text-sm font-medium',
                'focus:ring-2 focus:ring-primary/30'
              )}
              aria-label="Selecionar mês"
            >
              <SelectValue placeholder="Mês">
                {(v) => MONTHS.find((m) => m.value === v)?.label || 'Mês'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-surface-container ring-1 ring-outline-variant">
              {MONTHS.map((month) => (
                <SelectItem
                  key={month.value}
                  value={month.value}
                  className="text-on-surface focus:bg-surface-container-low focus:text-on-surface data-[selected]:bg-primary/10 data-[selected]:text-primary"
                >
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
