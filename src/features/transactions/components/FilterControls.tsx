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
import type { FortnightValue } from '@/features/dashboard/components/FortnightFilter';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Por Mês' },
  { value: 'fortnight', label: 'Por Quinzena' },
] as const;

const PAID_OPTIONS = [
  { value: 'all', label: 'Todas' },
  { value: 'paid', label: 'Pagas' },
  { value: 'unpaid', label: 'Não Pagas' },
] as const;

const FORTNIGHT_OPTIONS = [
  { value: 'all', label: 'Mês inteiro' },
  { value: 'first', label: 'Dia 1 ao 15' },
  { value: 'second', label: 'Dia 16 ao 31' },
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
  filterPeriod: 'month' | 'fortnight';
  onFilterPeriodChange: (value: 'month' | 'fortnight') => void;
  selectedYear: string;
  onYearChange: (value: string) => void;
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  selectedFortnight: FortnightValue;
  onFortnightChange: (value: FortnightValue) => void;
  paidFilter: 'all' | 'paid' | 'unpaid';
  onPaidFilterChange: (value: 'all' | 'paid' | 'unpaid') => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FilterControls: React.FC<FilterControlsProps> = ({
  filterPeriod,
  onFilterPeriodChange,
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
  selectedFortnight,
  onFortnightChange,
  paidFilter,
  onPaidFilterChange,
}) => {
  const yearOptions = getYearOptions();

  return (
    <div className="bg-muted/50 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <div data-testid="select-period">
            <Select
              value={filterPeriod}
              onValueChange={(value) => {
                if (value !== null) onFilterPeriodChange(value as 'month' | 'fortnight');
              }}
            >
              <SelectTrigger
                className={cn(
                  'w-[155px] h-9',
                  'bg-surface-container-low border-outline-variant',
                  'hover:bg-surface-container transition-colors',
                  'text-on-surface text-sm font-medium',
                  'focus:ring-2 focus:ring-primary/30'
                )}
                aria-label="Filtrar por período"
              >
                <SelectValue placeholder="Período">
                  {(v) => PERIOD_OPTIONS.find((o) => o.value === v)?.label || 'Período'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-surface-container ring-1 ring-outline-variant">
                {PERIOD_OPTIONS.map((opt) => (
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
        </div>

        {/* Paid filter */}
        <div data-testid="select-paid">
          <Select
            value={paidFilter}
            onValueChange={(value) => {
              if (value !== null) onPaidFilterChange(value as 'all' | 'paid' | 'unpaid');
            }}
          >
            <SelectTrigger
              className={cn(
                'w-[130px] h-9',
                'bg-surface-container-low border-outline-variant',
                'hover:bg-surface-container transition-colors',
                'text-on-surface text-sm font-medium',
                'focus:ring-2 focus:ring-primary/30'
              )}
              aria-label="Filtrar por pagamento"
            >
              <SelectValue placeholder="Pagamento">
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

        {(filterPeriod === 'month' || filterPeriod === 'fortnight') && (
          <>
            <div data-testid="select-year">
              <Select
                value={selectedYear}
                onValueChange={(value) => {
                  if (value !== null) onYearChange(value);
                }}
              >
                <SelectTrigger
                  className={cn(
                    'w-[110px] h-9',
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

            <div data-testid="select-month">
              <Select
                value={selectedMonth}
                onValueChange={(value) => {
                  if (value !== null) onMonthChange(value);
                }}
              >
                <SelectTrigger
                  className={cn(
                    'w-[155px] h-9',
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
          </>
        )}

        {filterPeriod === 'fortnight' && (
          <div data-testid="select-fortnight">
            <Select
              value={selectedFortnight}
              onValueChange={(value) => {
                if (value !== null) onFortnightChange(value as FortnightValue);
              }}
            >
              <SelectTrigger
                className={cn(
                  'w-[155px] h-9',
                  'bg-surface-container-low border-outline-variant',
                  'hover:bg-surface-container transition-colors',
                  'text-on-surface text-sm font-medium',
                  'focus:ring-2 focus:ring-primary/30'
                )}
                aria-label="Selecionar quinzena"
              >
                <SelectValue placeholder="Quinzena">
                  {(v) => FORTNIGHT_OPTIONS.find((o) => o.value === v)?.label || 'Quinzena'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-surface-container ring-1 ring-outline-variant">
                {FORTNIGHT_OPTIONS.map((opt) => (
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
        )}
      </div>
    </div>
  );
};

export default FilterControls;
