# Dashboard Content Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Implement the dashboard main content area with financial summary cards, recent transactions list, and data consumption from the transactions API.

**Architecture:** The dashboard page (`src/app/dashboard/page.tsx`) has an empty `<main>` area. We need to add: (1) a hook to fetch real transaction data from `/api/transactions`, (2) summary cards showing income/expenses/balance, (3) a recent transactions list, and (4) filter controls for month/fortnight selection.

**Tech Stack:** Next.js 16+, React 19+, TypeScript 5.9+, Tailwind CSS, Lucide React icons, existing shadcn-ui components.

---

## Current State

```
src/app/dashboard/page.tsx (line 25-29):
  <main className="flex-1 p-6">
    <div className="max-w-6xl mx-auto">
      {/* Dashboard content will be rendered here */}
    </div>
  </main>
```

The main content area is EMPTY. All layout components (Sidebar, Header, MobileNav) are done.

## Data Layer

- API: `GET /api/transactions?userId=...&startDate=...&endDate=...`
- Response: `{ data: Transaction[], summary: { income, expense, balance }, total: number }`
- Transaction type: `{ id, type, description, value, date, category, responsible, is_recurring, paid }`
- FinancialSummary: `{ income: number, expense: number, balance: number }`

## Visual Prototype (ASCII Wireframe)

### Desktop Layout (md+)
```
┌─────────────────────────────────────────────────────────────────────┐
│ [≡] FinanceGuy    [🔍 Buscar transações...]  [✨] [🔔] [👤]        │  ← HeaderLayout
├──────────┬──────────────────────────────────────────────────────────┤
│          │                                                          │
│ 💰 FG   │  Visão Geral — Junho 2026                    [Mês ▾]    │
│ ─────── │                                                          │
│ ◀ ▶     │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│          │  │ 💚 Entradas  │ │ 💜 Saídas    │ │ 💙 Saldo     │     │
│ Dashboard│  │  R$ 5.000,00 │ │  R$ 2.145,50 │ │  R$ 2.854,50 │     │
│ Transações│  │  +12% vs mês │ │  -8% vs mês  │ │  +15% vs mês │     │
│          │  └──────────────┘ └──────────────┘ └──────────────┘     │
│          │                                                          │
│          │  ┌──────────────────────────────────────────────────┐   │
│          │  │ 📊 Resumo Mensal                                 │   │
│          │  │ ┌────────────────────────────────────────────┐   │   │
│          │  │ │  Income: ████████████████░░░░  70%         │   │   │
│          │  │ │  Expense: ██████░░░░░░░░░░░░  30%          │   │   │
│          │  │ └────────────────────────────────────────────┘   │   │
│          │  └──────────────────────────────────────────────────┘   │
│          │                                                          │
│          │  ┌──────────────────────────────────────────────────┐   │
│          │  │ 📋 Transações Recentes               [Ver todas] │   │
│          │  │ ──────────────────────────────────────────────── │   │
│          │  │ 15/06  Supermercado Pão de Açúcar    -R$ 150,50 │   │
│          │  │        Alimentação · João                       │   │
│          │  │ ──────────────────────────────────────────────── │   │
│          │  │ 14/06  Salário Junho                 R$ 5.000,00│   │
│          │  │        Salário · João                           │   │
│          │  │ ──────────────────────────────────────────────── │   │
│          │  │ 12/06  Combustível Posto Ipiranga     -R$ 80,00 │   │
│          │  │        Transporte · Maria                       │   │
│          │  │ ──────────────────────────────────────────────── │   │
│          │  │ 10/06  Internet Vivo Fibra           -R$ 120,00 │   │
│          │  │        Casa · João                              │   │
│          │  │ ──────────────────────────────────────────────── │   │
│          │  │ 08/06  Jantar Outback                -R$ 250,00 │   │
│          │  │        Lazer · João                             │   │
│          │  └──────────────────────────────────────────────────┘   │
│          │                                                          │
├──────────┴──────────────────────────────────────────────────────────┤
│  [🏠 Dashboard]  [💱 Transações]                                    │  ← MobileNavBar (mobile only)
└─────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (< md)
```
┌────────────────────────────┐
│ [≡] 💰 FinanceGuy  [✨][🔔][👤] │  ← HeaderLayout
├────────────────────────────┤
│                            │
│  Visão Geral — Junho 2026  │
│                            │
│  ┌────────────────────┐   │
│  │ 💚 Entradas        │   │
│  │  R$ 5.000,00       │   │
│  └────────────────────┘   │
│  ┌────────────────────┐   │
│  │ 💜 Saídas          │   │
│  │  R$ 2.145,50       │   │
│  └────────────────────┘   │
│  ┌────────────────────┐   │
│  │ 💙 Saldo           │   │
│  │  R$ 2.854,50       │   │
│  └────────────────────┘   │
│                            │
│  ┌────────────────────┐   │
│  │ 📊 Resumo Mensal   │   │
│  │  [Bar chart]       │   │
│  └────────────────────┘   │
│                            │
│  ┌────────────────────┐   │
│  │ 📋 Recentes        │   │
│  │  Transaction 1     │   │
│  │  Transaction 2     │   │
│  │  Transaction 3     │   │
│  └────────────────────┘   │
│                            │
├────────────────────────────┤
│ [🏠 Dashboard] [💱 Transações] │  ← MobileNavBar
└────────────────────────────┘
```

---

## Step-by-Step Plan

### Task 1: Create `useDashboardData` hook

**Objective:** Create a custom hook that fetches transaction data from the API and computes dashboard metrics.

**Files:**
- Create: `src/features/dashboard/hooks/useDashboardData.ts`
- Test: `src/features/dashboard/__tests__/useDashboardData.test.tsx`

**Step 1: Write failing test**

```typescript
// src/features/dashboard/__tests__/useDashboardData.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from '../hooks/useDashboardData';

// Mock fetch
global.fetch = jest.fn();

describe('useDashboardData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading state initially', () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], summary: { income: 0, expense: 0, balance: 0 }, total: 0 }),
    });

    const { result } = renderHook(() => useDashboardData());
    expect(result.current.isLoading).toBe(true);
  });

  it('should fetch and return transaction data', async () => {
    const mockData = {
      data: [
        { id: '1', type: 'income', description: 'Salário', value: 5000, date: '2026-06-14', category: 'Salário', responsible: 'João', paid: true },
      ],
      summary: { income: 5000, expense: 0, balance: 5000 },
      total: 1,
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.summary.income).toBe(5000);
    expect(result.current.recentTransactions).toHaveLength(1);
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx jest src/features/dashboard/__tests__/useDashboardData.test.tsx --no-coverage`
Expected: FAIL — "Cannot find module '../hooks/useDashboardData'"

**Step 3: Write minimal implementation**

```typescript
// src/features/dashboard/hooks/useDashboardData.ts
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Transaction, FinancialSummary } from '@/features/transactions/validations';

interface DashboardData {
  recentTransactions: Transaction[];
  summary: FinancialSummary;
  isLoading: boolean;
  error: string | null;
}

export function useDashboardData(month?: string, year?: string): DashboardData {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({ income: 0, expense: 0, balance: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (month && year) {
          const startDate = `${year}-${month.padStart(2, '0')}-01`;
          const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
          const endDate = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          params.set('startDate', startDate);
          params.set('endDate', endDate);
        }

        const response = await fetch(`/api/transactions?${params.toString()}`);
        if (!response.ok) throw new Error('Erro ao carregar dados');

        const result = await response.json();
        setTransactions(result.data || []);
        setSummary(result.summary || { income: 0, expense: 0, balance: 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [month, year]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  return { recentTransactions, summary, isLoading, error };
}
```

**Step 4: Run test to verify pass**

Run: `npx jest src/features/dashboard/__tests__/useDashboardData.test.tsx --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/dashboard/hooks/useDashboardData.ts src/features/dashboard/__tests__/useDashboardData.test.tsx
git commit -m "feat(dashboard): add useDashboardData hook for API consumption"
```

---

### Task 2: Create `SummaryCard` component

**Objective:** Create a reusable card component for displaying financial metrics (income, expenses, balance).

**Files:**
- Create: `src/features/dashboard/components/SummaryCard.tsx`
- Test: `src/features/dashboard/components/__tests__/SummaryCard.test.tsx`

**Step 1: Write failing test**

```typescript
// src/features/dashboard/components/__tests__/SummaryCard.test.tsx
import { render, screen } from '@testing-library/react';
import { SummaryCard } from '../SummaryCard';

describe('SummaryCard', () => {
  it('should render label and value', () => {
    render(<SummaryCard label="Entradas" value={5000} type="income" />);
    expect(screen.getByText('Entradas')).toBeInTheDocument();
    expect(screen.getByText('R$ 5.000,00')).toBeInTheDocument();
  });

  it('should format negative values correctly', () => {
    render(<SummaryCard label="Saídas" value={-1500} type="expense" />);
    expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument();
  });

  it('should apply correct color for income type', () => {
    render(<SummaryCard label="Entradas" value={5000} type="income" />);
    const value = screen.getByText('R$ 5.000,00');
    expect(value.className).toContain('text-finance-income');
  });

  it('should apply correct color for expense type', () => {
    render(<SummaryCard label="Saídas" value={1500} type="expense" />);
    const value = screen.getByText('R$ 1.500,00');
    expect(value.className).toContain('text-finance-expense');
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx jest src/features/dashboard/components/__tests__/SummaryCard.test.tsx --no-coverage`
Expected: FAIL — "Cannot find module '../SummaryCard'"

**Step 3: Write minimal implementation**

```typescript
// src/features/dashboard/components/SummaryCard.tsx
'use client';

import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  label: string;
  value: number;
  type: 'income' | 'expense' | 'balance';
}

const typeConfig = {
  income: {
    icon: TrendingUp,
    color: 'text-finance-income',
    bgColor: 'bg-finance-income/10',
    iconColor: 'text-finance-income',
  },
  expense: {
    icon: TrendingDown,
    color: 'text-finance-expense',
    bgColor: 'bg-finance-expense/10',
    iconColor: 'text-finance-expense',
  },
  balance: {
    icon: Wallet,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(value));
}

export function SummaryCard({ label, value, type }: SummaryCardProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="bg-surface-container rounded-xl p-4 md:p-6 border border-outline-variant/30">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('p-2 rounded-lg', config.bgColor)}>
          <Icon className={cn('w-5 h-5', config.iconColor)} />
        </div>
        <span className="text-sm text-on-surface-variant font-medium">{label}</span>
      </div>
      <p className={cn('text-2xl md:text-3xl font-semibold font-mono', config.color)}>
        {type === 'expense' && value > 0 ? '- ' : ''}
        {formatCurrency(value)}
      </p>
    </div>
  );
}
```

**Step 4: Run test to verify pass**

Run: `npx jest src/features/dashboard/components/__tests__/SummaryCard.test.tsx --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/dashboard/components/SummaryCard.tsx src/features/dashboard/components/__tests__/SummaryCard.test.tsx
git commit -m "feat(dashboard): add SummaryCard component for financial metrics"
```

---

### Task 3: Create `RecentTransactions` component

**Objective:** Create a list component showing the 5 most recent transactions.

**Files:**
- Create: `src/features/dashboard/components/RecentTransactions.tsx`
- Test: `src/features/dashboard/components/__tests__/RecentTransactions.test.tsx`

**Step 1: Write failing test**

```typescript
// src/features/dashboard/components/__tests__/RecentTransactions.test.tsx
import { render, screen } from '@testing-library/react';
import { RecentTransactions } from '../RecentTransactions';
import type { Transaction } from '@/features/transactions/validations';

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'expense',
    description: 'Supermercado',
    value: -150.50,
    date: '2026-06-15',
    category: 'Alimentação',
    responsible: 'João',
    paid: true,
  },
  {
    id: '2',
    type: 'income',
    description: 'Salário',
    value: 5000,
    date: '2026-06-14',
    category: 'Salário',
    responsible: 'João',
    paid: true,
  },
];

describe('RecentTransactions', () => {
  it('should render transaction descriptions', () => {
    render(<RecentTransactions transactions={mockTransactions} />);
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('Salário')).toBeInTheDocument();
  });

  it('should render formatted dates', () => {
    render(<RecentTransactions transactions={mockTransactions} />);
    expect(screen.getByText('15/06')).toBeInTheDocument();
    expect(screen.getByText('14/06')).toBeInTheDocument();
  });

  it('should render empty state when no transactions', () => {
    render(<RecentTransactions transactions={[]} />);
    expect(screen.getByText('Nenhuma transação recente')).toBeInTheDocument();
  });

  it('should render "Ver todas" link', () => {
    render(<RecentTransactions transactions={mockTransactions} />);
    expect(screen.getByText('Ver todas')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx jest src/features/dashboard/components/__tests__/RecentTransactions.test.tsx --no-coverage`
Expected: FAIL — "Cannot find module '../RecentTransactions'"

**Step 3: Write minimal implementation**

```typescript
// src/features/dashboard/components/RecentTransactions.tsx
'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/features/transactions/validations';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(value));
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/30">
        <h3 className="text-lg font-semibold text-on-surface mb-4">Transações Recentes</h3>
        <p className="text-on-surface-variant text-sm">Nenhuma transação recente</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-on-surface">Transações Recentes</h3>
        <Link
          href="/transactions"
          className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          Ver todas
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between py-3 border-b border-outline-variant/20 last:border-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm text-on-surface-variant font-mono w-12">
                {formatDate(transaction.date)}
              </span>
              <div>
                <p className="text-sm font-medium text-on-surface">{transaction.description}</p>
                <p className="text-xs text-on-surface-variant">
                  {transaction.category} · {transaction.responsible}
                </p>
              </div>
            </div>
            <span
              className={cn(
                'text-sm font-semibold font-mono',
                transaction.type === 'income' ? 'text-finance-income' : 'text-finance-expense'
              )}
            >
              {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Run test to verify pass**

Run: `npx jest src/features/dashboard/components/__tests__/RecentTransactions.test.tsx --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/dashboard/components/RecentTransactions.tsx src/features/dashboard/components/__tests__/RecentTransactions.test.tsx
git commit -m "feat(dashboard): add RecentTransactions list component"
```

---

### Task 4: Create `MonthFilter` component

**Objective:** Create a dropdown filter for selecting the current month/year.

**Files:**
- Create: `src/features/dashboard/components/MonthFilter.tsx`
- Test: `src/features/dashboard/components/__tests__/MonthFilter.test.tsx`

**Step 1: Write failing test**

```typescript
// src/features/dashboard/components/__tests__/MonthFilter.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MonthFilter } from '../MonthFilter';

describe('MonthFilter', () => {
  it('should render current month label', () => {
    render(<MonthFilter value="06" onChange={jest.fn()} />);
    expect(screen.getByText(/Junho/)).toBeInTheDocument();
  });

  it('should call onChange when month is selected', () => {
    const onChange = jest.fn();
    render(<MonthFilter value="06" onChange={onChange} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '07' } });
    
    expect(onChange).toHaveBeenCalledWith('07');
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx jest src/features/dashboard/components/__tests__/MonthFilter.test.tsx --no-coverage`
Expected: FAIL — "Cannot find module '../MonthFilter'"

**Step 3: Write minimal implementation**

```typescript
// src/features/dashboard/components/MonthFilter.tsx
'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthFilterProps {
  value: string;
  onChange: (month: string) => void;
  className?: string;
}

const months = [
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

export function MonthFilter({ value, onChange, className }: MonthFilterProps) {
  const currentMonth = months.find(m => m.value === value);

  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'appearance-none bg-surface-container-low border border-outline-variant/30',
          'rounded-lg px-4 py-2 pr-10 text-sm font-medium text-on-surface',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          'cursor-pointer transition-colors hover:bg-surface-container-high'
        )}
      >
        {months.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
    </div>
  );
}
```

**Step 4: Run test to verify pass**

Run: `npx jest src/features/dashboard/components/__tests__/MonthFilter.test.tsx --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/dashboard/components/MonthFilter.tsx src/features/dashboard/components/__tests__/MonthFilter.test.tsx
git commit -m "feat(dashboard): add MonthFilter dropdown component"
```

---

### Task 5: Integrate all components into DashboardPage

**Objective:** Wire up all components in the dashboard page with data fetching and state management.

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Update the page component**

```typescript
// src/app/dashboard/page.tsx
'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { Sidebar } from '@/features/dashboard/components/Sidebar';
import { HeaderLayout } from '@/features/dashboard/components/HeaderLayout';
import { MobileNavBar } from '@/features/dashboard/components/MobileNavBar';
import { MobileDrawer } from '@/features/dashboard/components/MobileDrawer';
import { SummaryCard } from '@/features/dashboard/components/SummaryCard';
import { RecentTransactions } from '@/features/dashboard/components/RecentTransactions';
import { MonthFilter } from '@/features/dashboard/components/MonthFilter';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';

export default function DashboardPage() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear] = useState(String(now.getFullYear()));

  const { recentTransactions, summary, isLoading, error } = useDashboardData(selectedMonth, selectedYear);

  return (
    <DashboardLayout>
      {/* Sidebar - Navigation - Hidden on mobile, visible on desktop */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col min-h-screen bg-background pb-16 md:pb-0">
        {/* Header with Search, AI, Notifications, Profile + Mobile Menu Button */}
        <HeaderLayout onOpenMobileDrawer={() => setMobileDrawerOpen(true)} />

        {/* Dashboard Content */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Page Title + Month Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-on-surface font-display">
                  Visão Geral
                </h1>
                <p className="text-sm text-on-surface-variant mt-1">
                  {new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <MonthFilter value={selectedMonth} onChange={setSelectedMonth} />
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-surface-container rounded-xl p-6 border border-outline-variant/30 animate-pulse">
                    <div className="h-4 bg-surface-container-low rounded w-24 mb-3" />
                    <div className="h-8 bg-surface-container-low rounded w-32" />
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6">
                <p className="text-error text-sm">{error}</p>
              </div>
            )}

            {/* Summary Cards */}
            {!isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SummaryCard
                  label="Entradas"
                  value={summary.income}
                  type="income"
                />
                <SummaryCard
                  label="Saídas"
                  value={summary.expense}
                  type="expense"
                />
                <SummaryCard
                  label="Saldo"
                  value={summary.balance}
                  type="balance"
                />
              </div>
            )}

            {/* Recent Transactions */}
            {!isLoading && (
              <RecentTransactions transactions={recentTransactions} />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Navigation Bar - Only visible on mobile */}
      <MobileNavBar />

      {/* Mobile Drawer - Navigation overlay for mobile (more options) */}
      <MobileDrawer 
        open={mobileDrawerOpen} 
        onClose={() => setMobileDrawerOpen(false)} 
      />
    </DashboardLayout>
  );
}
```

**Step 2: Run lint**

Run: `pnpm run lint`
Expected: No errors

**Step 3: Run build**

Run: `pnpm run build`
Expected: Build succeeds

**Step 4: Run all dashboard tests**

Run: `npx jest src/features/dashboard --no-coverage`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(dashboard): integrate summary cards, recent transactions, and month filter"
```

---

### Task 6: Add empty state illustration

**Objective:** Add a visual empty state when no transactions exist for the selected period.

**Files:**
- Create: `src/features/dashboard/components/EmptyState.tsx`
- Modify: `src/app/dashboard/page.tsx`

**Step 1: Write failing test**

```typescript
// src/features/dashboard/components/__tests__/EmptyState.test.tsx
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('should render empty state message', () => {
    render(<EmptyState />);
    expect(screen.getByText('Nenhuma transação encontrada')).toBeInTheDocument();
    expect(screen.getByText('Adicione sua primeira transação para começar a acompanhar suas finanças.')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx jest src/features/dashboard/components/__tests__/EmptyState.test.tsx --no-coverage`
Expected: FAIL — "Cannot find module '../EmptyState'"

**Step 3: Write minimal implementation**

```typescript
// src/features/dashboard/components/EmptyState.tsx
'use client';

import { Wallet } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="bg-surface-container rounded-xl p-8 border border-outline-variant/30 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-4">
        <Wallet className="w-8 h-8 text-on-surface-variant" />
      </div>
      <h3 className="text-lg font-semibold text-on-surface mb-2">
        Nenhuma transação encontrada
      </h3>
      <p className="text-sm text-on-surface-variant max-w-sm">
        Adicione sua primeira transação para começar a acompanhar suas finanças.
      </p>
    </div>
  );
}
```

**Step 4: Run test to verify pass**

Run: `npx jest src/features/dashboard/components/__tests__/EmptyState.test.tsx --no-coverage`
Expected: PASS

**Step 5: Update DashboardPage to use EmptyState**

In `src/app/dashboard/page.tsx`, add import and conditional rendering:

```typescript
import { EmptyState } from '@/features/dashboard/components/EmptyState';

// Inside the main content, after RecentTransactions:
{!isLoading && recentTransactions.length === 0 && (
  <EmptyState />
)}
```

**Step 6: Run all tests**

Run: `npx jest src/features/dashboard --no-coverage`
Expected: All tests pass

**Step 7: Commit**

```bash
git add src/features/dashboard/components/EmptyState.tsx src/features/dashboard/components/__tests__/EmptyState.test.tsx src/app/dashboard/page.tsx
git commit -m "feat(dashboard): add empty state component for no transactions"
```

---

## Files to Change Summary

| Action | File |
|--------|------|
| Create | `src/features/dashboard/hooks/useDashboardData.ts` |
| Create | `src/features/dashboard/components/SummaryCard.tsx` |
| Create | `src/features/dashboard/components/RecentTransactions.tsx` |
| Create | `src/features/dashboard/components/MonthFilter.tsx` |
| Create | `src/features/dashboard/components/EmptyState.tsx` |
| Modify | `src/app/dashboard/page.tsx` |
| Create | `src/features/dashboard/__tests__/useDashboardData.test.tsx` |
| Create | `src/features/dashboard/components/__tests__/SummaryCard.test.tsx` |
| Create | `src/features/dashboard/components/__tests__/RecentTransactions.test.tsx` |
| Create | `src/features/dashboard/components/__tests__/MonthFilter.test.tsx` |
| Create | `src/features/dashboard/components/__tests__/EmptyState.test.tsx` |

## Verification

After all tasks:
1. `pnpm run lint` — no errors
2. `pnpm run build` — builds successfully
3. `npx jest src/features/dashboard --no-coverage` — all tests pass
4. Manual: navigate to `/dashboard` and verify cards + transactions render

## Risks & Tradeoffs

- **API endpoint requires auth**: The `/api/transactions` endpoint expects `x-user-id` header (injected by proxy). Without auth, the dashboard will show empty data. This is expected — auth is already implemented.
- **Fortnight filter**: Marked as OPTIONAL in Notion comment. Can be added later as a separate task.
- **Chart component**: Not included in this plan. Can be added as a follow-up using recharts or similar library.
