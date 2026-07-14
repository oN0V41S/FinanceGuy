# Lazy Loading — Dashboard Components Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Implement lazy loading for dashboard components so SummaryCards and RecentTransactions do not render their containers until data is ready — showing only a loading spinner while fetching — and add an e2e integration test validating that content is absent during loading.

**Architecture:** A generic `LazyLoad` wrapper component at `src/shared/components/` encapsulates the "spinner while loading, content when ready" pattern. The dashboard page wraps the summary grid and transactions section with it, replacing the per-component skeleton approach with a single loading spinner per section. The existing skeleton logic inside SummaryCard and RecentTransactions is preserved as a fallback for internal loading transitions (e.g. month filter changes), while LazyLoad handles the initial render gate.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9+, Lucide React (LoaderCircle), Jest 30+ with Testing Library (jsdom)

---

## Wireframe

### Before (current — skeletons on every card on first render)
```
┌──────────────────────────────────────────┐
│  Visão Geral                  [month ▼]  │
│                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ ░░░░░░░░ │ │ ░░░░░░░░ │ │ ░░░░░░░░ │ │  ← 3 skeleton cards
│  │ ░░░░░░░░ │ │ ░░░░░░░░ │ │ ░░░░░░░░ │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│  ┌────────────────────────────────────┐  │
│  │ Transações Recentes                │  │
│  │ ░░░ ░░░░░░░░░░░░░░  ░░░░          │  │  ← 5 skeleton rows
│  │ ░░░ ░░░░░░░░░░░░░░  ░░░░          │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### After — loading spinner while fetching
```
┌──────────────────────────────────────────┐
│  Visão Geral                  [month ▼]  │
│                                          │
│        ◌  Carregando dados...             │  ← single spinner, no cards
│                                          │
│  ──── when fetch completes ────►          │
│                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ R$ 5.000 │ │ R$ 2.300 │ │ R$ 2.700 │ │  ← real data
│  └──────────┘ └──────────┘ └──────────┘ │
│  ┌────────────────────────────────────┐  │
│  │ Transações Recentes                │  │
│  │ 15/06  Supermercado    -R$ 150    │  │
│  │ 12/06  Salário        +R$ 5.000   │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## Tasks

### Task 1: Create LoadingSpinner component

**Objective:** A reusable animated loading spinner that can accept an optional message.

**Files:**
- Create: `src/shared/components/LoadingSpinner.tsx`
- Test: `src/shared/components/__tests__/LoadingSpinner.test.tsx`

**Step 1.1: Write failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders a spinner element', () => {
    render(<LoadingSpinner />);
    // Should render an element with role="status" for accessibility
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with default accessible label', () => {
    render(<LoadingSpinner />);
    expect(screen.getByLabelText('Carregando')).toBeInTheDocument();
  });

  it('renders an optional message', () => {
    render(<LoadingSpinner message="Carregando dados..." />);
    expect(screen.getByText('Carregando dados...')).toBeInTheDocument();
  });

  it('renders without message by default', () => {
    render(<LoadingSpinner />);
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });
});
```

Run: `npx jest src/shared/components/__tests__/LoadingSpinner.test.tsx -v`
Expected: FAIL — "Cannot find module"

**Step 1.2: Write minimal implementation**

```tsx
'use client';

import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({ message, className }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}
    >
      <LoaderCircle className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      {message && (
        <p className="text-sm text-on-surface-variant">{message}</p>
      )}
    </div>
  );
}
```

**Step 1.3: Run test to verify pass**

Run: `npx jest src/shared/components/__tests__/LoadingSpinner.test.tsx -v`
Expected: PASS (3 passed)

**Step 1.4: Commit**

```bash
git add src/shared/components/LoadingSpinner.tsx src/shared/components/__tests__/LoadingSpinner.test.tsx
git commit -m "feat: add LoadingSpinner component"
```

---

### Task 2: Create LazyLoad wrapper component

**Objective:** A generic component that only renders children when `isReady` is true, showing a spinner (via LoadingSpinner) otherwise.

**Files:**
- Create: `src/shared/components/LazyLoad.tsx`
- Test: `src/shared/components/__tests__/LazyLoad.test.tsx`

**Step 2.1: Write failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { LazyLoad } from '../LazyLoad';

describe('LazyLoad', () => {
  it('shows spinner when isReady is false', () => {
    render(
      <LazyLoad isReady={false}>
        <div data-testid="content">Loaded Content</div>
      </LazyLoad>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('renders children when isReady is true', () => {
    render(
      <LazyLoad isReady={true}>
        <div data-testid="content">Loaded Content</div>
      </LazyLoad>
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Loaded Content')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(
      <LazyLoad isReady={false} message="Carregando transações...">
        <div data-testid="content">Content</div>
      </LazyLoad>
    );
    expect(screen.getByText('Carregando transações...')).toBeInTheDocument();
  });

  it('transitions from loading to content on prop change', () => {
    const { rerender } = render(
      <LazyLoad isReady={false}>
        <div data-testid="content">Content</div>
      </LazyLoad>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(
      <LazyLoad isReady={true}>
        <div data-testid="content">Content</div>
      </LazyLoad>
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
```

Run: `npx jest src/shared/components/__tests__/LazyLoad.test.tsx -v`
Expected: FAIL

**Step 2.2: Write minimal implementation**

```tsx
'use client';

import type { ReactNode } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LazyLoadProps {
  isReady: boolean;
  children: ReactNode;
  message?: string;
  className?: string;
}

export function LazyLoad({ isReady, children, message, className }: LazyLoadProps) {
  if (!isReady) {
    return <LoadingSpinner message={message} className={className} />;
  }

  return <>{children}</>;
}
```

**Step 2.3: Run test to verify pass**

Run: `npx jest src/shared/components/__tests__/LazyLoad.test.tsx -v`
Expected: PASS (4 passed)

**Step 2.4: Commit**

```bash
git add src/shared/components/LazyLoad.tsx src/shared/components/__tests__/LazyLoad.test.tsx
git commit -m "feat: add LazyLoad wrapper component"
```

---

### Task 3: Update Dashboard page with lazy loading

**Objective:** Wrap the SummaryCards grid and RecentTransactions section with LazyLoad so content containers don't render until data is ready.

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Current behavior (page.tsx lines 131-183):**
- SummaryCards are always rendered (show skeletons via isLoading prop)
- RecentTransactions is always rendered (shows skeletons via isLoading prop)
- EmptyState is shown when !isLoading && no transactions

**Desired behavior:**
- While `isLoading` is true: render only the page header + filters, and two LazyLoad placeholders (one for cards, one for transactions)
- When `isLoading` becomes false: render the real SummaryCards and RecentTransactions/EmptyState
- The existing skeleton logic inside SummaryCard and RecentTransactions stays as a fallback for subsequent filter changes (when isLoading flips back to true for re-fetch)

**Step 3.1: Read current page.tsx**

File already read above. The key change is:

- Import `LazyLoad` from `@/shared/components/LazyLoad`
- Replace the direct SummaryCard grid wrapping with LazyLoad
- Replace the RecentTransactions/EmptyState conditional with LazyLoad

**Step 3.2: Apply changes to page.tsx**

Add import:
```tsx
import { LazyLoad } from '@/shared/components/LazyLoad';
```

Replace lines 170-182 (summary cards + transactions section):

```tsx
            {/* Summary Cards — lazy loaded */}
            <LazyLoad isReady={!isLoading} message="Carregando resumo financeiro...">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SummaryCard label="Entradas" value={summary.income} type="income" isLoading={isLoading} />
                <SummaryCard label="Saídas" value={summary.expense} type="expense" isLoading={isLoading} />
                <SummaryCard label="Saldo" value={summary.balance} type="balance" isLoading={isLoading} />
              </div>
            </LazyLoad>

            {/* Recent Transactions — lazy loaded */}
            <LazyLoad isReady={!isLoading} message="Carregando transações recentes...">
              {recentTransactions.length === 0 ? (
                <EmptyState />
              ) : (
                <RecentTransactions transactions={recentTransactions} isLoading={isLoading} />
              )}
            </LazyLoad>
```

The `isLoading` prop is still passed to SummaryCard and RecentTransactions for the subsequent filter-change scenario (when user changes month and isLoading briefly flips back to true).

**Step 3.3: Verify with existing tests**

Run: `npx jest src/app/dashboard/__tests__/page.test.tsx -v`
Expected: PASS — existing integration tests mock useDashboardData with isLoading=false, so components render normally.

**Step 3.4: Verify build**

Run: `pnpm run build`
Expected: Build succeeds without errors.

**Step 3.5: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: lazy load dashboard summary cards and transactions"
```

---

### Task 4: Add e2e integration test for lazy loading validation

**Objective:** Write an integration test (jsdom-based, following the project's "e2e" pattern from MonthFilter.e2e.test.tsx) that proves SummaryCards and RecentTransactions are **never rendered empty** — they are either OFF (loading spinner visible) or showing real data. No zero-value summary cards, no "no transactions" message inside the component containers.

**Files:**
- Create: `src/app/dashboard/__tests__/lazy-loading.e2e.test.tsx`

**Step 4.1: Write the e2e test**

```tsx
/**
 * E2E — Dashboard lazy loading: components must never render empty.
 *
 * Validation rule:
 *   - While loading → SummaryCards and RecentTransactions are OFF (not in DOM).
 *     Only the loading spinner is visible.
 *   - After loading → components render ONLY if they have real data to show.
 *     SummaryCards show non-zero values. RecentTransactions shows transactions.
 *   - Empty/zero state → components stay OFF. The EmptyState component can
 *     appear, but SummaryCards/RecentTransactions must NOT mount with zeros.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock useDashboardData with controllable loading state
const mockUseDashboardData = jest.fn();

jest.mock('@/features/dashboard/hooks/useDashboardData', () => ({
  useDashboardData: (...args: any[]) => mockUseDashboardData(...args),
}));

// Mock child components — only LoadingSpinner (via LazyLoad) is real
jest.mock('@/features/dashboard/components/SummaryCard', () => ({
  SummaryCard: ({ label, value }: { label: string; value: number }) => (
    <div data-testid="summary-card">
      {label}: R$ {value.toLocaleString('pt-BR')}
    </div>
  ),
}));

jest.mock('@/features/dashboard/components/RecentTransactions', () => ({
  RecentTransactions: ({ transactions }: { transactions: any[] }) => (
    <div data-testid="recent-transactions">
      {transactions.length > 0 ? (
        transactions.map((t: any) => <span key={t.id}>{t.description}</span>)
      ) : (
        <span data-testid="empty-table">Nenhuma transação</span>
      )}
    </div>
  ),
}));

jest.mock('@/features/dashboard/components/EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state">Nenhuma transação encontrada</div>,
}));

jest.mock('@/features/dashboard/components/MonthFilter', () => ({
  MonthFilter: () => <div data-testid="month-filter">MonthFilter</div>,
}));

jest.mock('@/features/dashboard/components/HeaderLayout', () => ({
  HeaderLayout: () => <header data-testid="header">Header</header>,
}));

jest.mock('@/features/dashboard/components/MobileNavBar', () => ({
  MobileNavBar: () => <nav data-testid="mobile-navbar">NavBar</nav>,
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

import DashboardPage from '../page';

describe('Dashboard Lazy Loading — Components Never Render Empty (E2E)', () => {
  const loadingState = {
    recentTransactions: [],
    summary: { income: 0, expense: 0, balance: 0 },
    isLoading: true,
    error: null,
    refresh: jest.fn(),
  };

  const loadedState = {
    recentTransactions: [
      {
        id: '1', date: '2026-06-15', value: 150.50,
        description: 'Supermercado', responsible: 'João',
        category: 'Alimentação', type: 'expense',
      },
      {
        id: '2', date: '2026-06-10', value: 5000,
        description: 'Salário', responsible: 'João',
        category: 'Outros', type: 'income',
      },
    ],
    summary: { income: 5000, expense: 150.50, balance: 4849.50 },
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Loading state: components MUST be OFF ──

  it('while loading: SummaryCards and RecentTransactions are OFF — only spinner shows', () => {
    mockUseDashboardData.mockReturnValue(loadingState);
    render(<DashboardPage />);

    // Only the loading spinner must be present
    expect(screen.getByRole('status')).toBeInTheDocument();

    // SummaryCards must NOT be rendered (not even with zeros)
    expect(screen.queryByTestId('summary-card')).not.toBeInTheDocument();

    // RecentTransactions must NOT be rendered (not even empty table)
    expect(screen.queryByTestId('recent-transactions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-table')).not.toBeInTheDocument();

    // EmptyState must NOT be rendered
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();

    // Header and month filter are always visible (no data dependency)
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('month-filter')).toBeInTheDocument();
  });

  // ── Loaded with data: components render with real content ──

  it('after loading with data: SummaryCards show actual (non-zero) values', () => {
    mockUseDashboardData.mockReturnValue(loadedState);
    render(<DashboardPage />);

    const cards = screen.getAllByTestId('summary-card');
    expect(cards).toHaveLength(3);

    // Each card displays the label AND a non-zero formatted value
    expect(cards[0]).toHaveTextContent('Entradas');
    expect(cards[0]).toHaveTextContent(/R\$\s*5\.000/);
    expect(cards[1]).toHaveTextContent(/R\$\s*150[.,]50/);
    expect(cards[2]).toHaveTextContent(/R\$\s*4\.849[.,]5/);

    // Loading spinner must be gone
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('after loading with data: RecentTransactions shows actual transaction rows', () => {
    mockUseDashboardData.mockReturnValue(loadedState);
    render(<DashboardPage />);

    expect(screen.getByTestId('recent-transactions')).toBeInTheDocument();
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('Salário')).toBeInTheDocument();

    // No empty placeholder inside the component
    expect(screen.queryByTestId('empty-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  // ── Loaded with empty data: SummaryCards still OFF (no zero cards) ──

  it('after loading with zero values: SummaryCards stay OFF (no R$ 0,00 cards)', () => {
    mockUseDashboardData.mockReturnValue({
      ...loadedState,
      summary: { income: 0, expense: 0, balance: 0 },
    });
    render(<DashboardPage />);

    // SummaryCards must NOT render with zero values
    expect(screen.queryByTestId('summary-card')).not.toBeInTheDocument();
  });

  it('after loading with no transactions: RecentTransactions stays OFF, EmptyState can show', () => {
    mockUseDashboardData.mockReturnValue({
      ...loadedState,
      recentTransactions: [],
    });
    render(<DashboardPage />);

    // RecentTransactions must NOT render — not even an empty list/table
    expect(screen.queryByTestId('recent-transactions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('empty-table')).not.toBeInTheDocument();

    // EmptyState is the ONLY acceptable "empty" visual (it's a different component)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});
```

**Step 4.2: Run test to verify pass**

Run: `npx jest src/app/dashboard/__tests__/lazy-loading.e2e.test.tsx -v`
Expected: PASS (6 passed)

**Step 4.3: Run full test suite to verify nothing is broken**

Run: `npx jest --testPathIgnorePatterns='' --testPathPattern='src/app/dashboard' -v`
Expected: All dashboard tests pass (including page.test.tsx + lazy-loading.e2e + MonthFilter.e2e).

**Step 4.4: Commit**

```bash
git add src/app/dashboard/__tests__/lazy-loading.e2e.test.tsx
git commit -m "test: add e2e test for dashboard lazy loading"
```

---

### Task 5: Verify everything together

**Objective:** Run the full test suite and build to confirm no regressions.

**Step 5.1: Run all tests**

Run: `npm run test`
Expected: All non-ignored tests pass.

**Step 5.2: Run lint**

Run: `npm run lint`
Expected: No lint errors.

**Step 5.3: Run build**

Run: `pnpm run build`
Expected: Build succeeds.

**Step 5.4: Final commit (if lint/build fixes needed)**

```bash
git add -A
git commit -m "chore: fix lint and build after lazy loading implementation"
```

---

## Files Changed Summary

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/shared/components/LoadingSpinner.tsx` | Animated spinner with optional message |
| Create | `src/shared/components/__tests__/LoadingSpinner.test.tsx` | Unit tests for LoadingSpinner |
| Create | `src/shared/components/LazyLoad.tsx` | Generic lazy loading wrapper |
| Create | `src/shared/components/__tests__/LazyLoad.test.tsx` | Unit tests for LazyLoad |
| Modify | `src/app/dashboard/page.tsx` | Wrap cards and transactions with LazyLoad |
| Create | `src/app/dashboard/__tests__/lazy-loading.e2e.test.tsx` | E2E test for lazy loading behavior |

## Risks and Tradeoffs

- **No breaking changes**: The existing skeleton logic inside SummaryCard and RecentTransactions is preserved. It kicks in when `isLoading` flips back to `true` during month/year filter changes (a very brief transition). This means users see a spinner first, then content — never a spinner → skeleton → content sequence.
- **Test isolation risk**: The e2e test mocks `useDashboardData` and all child components, so it doesn't test the real fetch. This matches the project's existing "e2e" pattern (see MonthFilter.e2e.test.tsx).
- **No dependency changes**: Only uses Lucide's `LoaderCircle` which is already available.

## Verification Checklist

- [ ] `LoadingSpinner` renders spinner icon with `role="status"`
- [ ] `LazyLoad` shows spinner when `isReady=false`, hides it when `isReady=true`
- [ ] During loading: only spinner visible — SummaryCards, RecentTransactions, and EmptyState are all OFF (not in DOM)
- [ ] After loading with data: cards show non-zero values, transactions show real rows
- [ ] After loading with zero values (income/expense/balance = 0): SummaryCards stay OFF (no R$ 0,00)
- [ ] After loading with no transactions: RecentTransactions stays OFF, only EmptyState may show
- [ ] All existing tests pass
- [ ] Lint passes
- [ ] Build succeeds
