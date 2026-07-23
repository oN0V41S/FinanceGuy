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
      {label}: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
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

jest.mock('@/features/dashboard/components/FortnightFilter', () => ({
  FortnightFilter: () => <div data-testid="fortnight-filter">FortnightFilter</div>,
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

    // Two spinners are shown (one for cards, one for transactions)
    expect(screen.getAllByRole('status')).toHaveLength(2);

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

  // ── Loaded with empty transactions: EmptyState shows, RecentTransactions stays OFF ──

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
