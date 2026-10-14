'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { useTransactionYears } from '@/shared/hooks/useTransactionYears';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SegmentedToggle } from '@/components/ui/segmented-toggle';
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
  yearsRefreshTrigger?: number;
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
  yearsRefreshTrigger = 0,
}) => {
  // Ordem cronológica no seletor: 2026 → 2027, Janeiro → Dezembro.
  const yearOptions = [...useTransactionYears(yearsRefreshTrigger)].sort((a, b) => a - b);

  return (
    <div className="space-y-3 p-4 bg-surface-container-low rounded-xl">
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
            onValueChange={(value) => { if (value) onMonthChange(value); }}
          >
            <SelectTrigger className="w-[130px] h-9 text-sm" aria-label="Selecionar mês">
              <SelectValue placeholder="Mês">
                {() => MONTHS.find((m) => m.value === selectedMonth)?.label ?? 'Mês'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-surface-container max-h-60 overflow-y-auto" alignItemWithTrigger={false}>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year */}
        <div data-testid="select-year">
          <Select
            value={selectedYear}
            onValueChange={(value) => { if (value) onYearChange(value); }}
          >
            <SelectTrigger className="w-[100px] h-9 text-sm" aria-label="Selecionar ano">
              <SelectValue placeholder="Ano">
                {() => selectedYear}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-surface-container max-h-60 overflow-y-auto" alignItemWithTrigger={false}>
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
        <div data-testid="type-tabs">
          <SegmentedToggle
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={onTypeFilterChange}
            getTestId={(value) => `type-tab-${value}`}
          />
        </div>

        {/* Quinzenal tabs */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Quinzena:</span>
          <div data-testid="select-quinzenal">
            <SegmentedToggle
              options={QUINZENAL_OPTIONS}
              value={quinzenalFilter}
              onChange={onQuinzenalFilterChange}
              getTestId={(value) => `quinzenal-tab-${value}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
