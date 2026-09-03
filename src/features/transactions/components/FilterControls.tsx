'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { getYearOptions } from '@/shared/utils';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  { value: 'month', label: 'Todas' },
  { value: 'first', label: '1–15' },
  { value: 'second', label: '16–31' },
] as const;

const PAID_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'paid', label: 'Pago' },
  { value: 'unpaid', label: 'Pendente' },
] as const;

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'income', label: 'Entradas' },
  { value: 'expense', label: 'Saídas' },
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

const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Casa',
  'Saúde',
  'Educação',
  'Lazer',
  'Salário',
  'Investimentos',
  'Outros',
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
  typeFilter: 'all' | 'income' | 'expense';
  onTypeFilterChange: (value: 'all' | 'income' | 'expense') => void;
  searchFilter: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
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
  typeFilter,
  onTypeFilterChange,
  searchFilter,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
}) => {
  const yearOptions = getYearOptions();

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
      {/* Row 1: search + month/year + category + status */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            data-testid="search-input"
            type="search"
            placeholder="Buscar transações..."
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Month */}
        <div data-testid="select-month">
          <Select
            value={selectedMonth}
            onValueChange={(value) => { if (value !== null) onMonthChange(value); }}
          >
            <SelectTrigger
              className="w-[130px] h-9 text-sm"
              aria-label="Selecionar mês"
            >
              <SelectValue placeholder="Mês">
                {(v: string) => MONTHS.find((m) => m.value === v)?.label ?? 'Mês'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-surface-container">
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year */}
        <div data-testid="select-year">
          <Select
            value={selectedYear}
            onValueChange={(value) => { if (value !== null) onYearChange(value); }}
          >
            <SelectTrigger
              className="w-[90px] h-9 text-sm"
              aria-label="Selecionar ano"
            >
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent className="bg-surface-container">
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div data-testid="select-category">
          <Select
            value={categoryFilter || 'all'}
            onValueChange={(value) => { if (value !== null) onCategoryFilterChange(value === 'all' ? '' : value); }}
          >
            <SelectTrigger
              className="w-[140px] h-9 text-sm"
              aria-label="Filtrar por categoria"
            >
              <SelectValue placeholder="Categoria">
                {(v: string) => (v === 'all' || !v ? 'Categoria' : v)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-surface-container">
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div data-testid="select-paid">
          <Select
            value={paidFilter}
            onValueChange={(value) => { if (value !== null) onPaidFilterChange(value as 'all' | 'paid' | 'unpaid'); }}
          >
            <SelectTrigger
              className="w-[130px] h-9 text-sm"
              aria-label="Filtrar por pagamento"
            >
              <SelectValue placeholder="Status">
                {(v: string) => PAID_OPTIONS.find((o) => o.value === v)?.label ?? 'Status'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-surface-container">
              {PAID_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: type tabs + quinzenal tabs */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type tabs */}
        <div data-testid="type-tabs" className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              data-testid={`type-tab-${opt.value}`}
              onClick={() => onTypeFilterChange(opt.value as 'all' | 'income' | 'expense')}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                typeFilter === opt.value
                  ? 'bg-background text-on-surface shadow-sm'
                  : 'text-muted-foreground hover:text-on-surface',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Quinzenal tabs */}
        <div data-testid="select-quinzenal" className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {QUINZENAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              data-testid={`quinzenal-tab-${opt.value}`}
              onClick={() => onQuinzenalFilterChange(opt.value)}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                quinzenalFilter === opt.value
                  ? 'bg-background text-on-surface shadow-sm'
                  : 'text-muted-foreground hover:text-on-surface',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
