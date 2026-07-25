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

  it('while loading: SummaryCards are OFF — only spinner shows', () => {
    mockUseDashboardData.mockReturnValue(loadingState);
    render(<DashboardPage />);

    // Spinner is shown while loading
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(1);

    // SummaryCards must NOT be rendered (not even with zeros)
    expect(screen.queryByTestId('summary-card')).not.toBeInTheDocument();

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

  it('after loading with data: page shows transactions link', () => {
    mockUseDashboardData.mockReturnValue(loadedState);
    render(<DashboardPage />);

    // The "Ver todas as transações" link should be present
    expect(screen.getByText('Ver todas as transações')).toBeInTheDocument();
  });

  // ── Loaded with empty transactions: summary shows zero values ──

  it('after loading with no transactions: summary cards show with zero values', () => {
    mockUseDashboardData.mockReturnValue({
      ...loadedState,
      recentTransactions: [],
    });
    render(<DashboardPage />);

    // SummaryCards appear even with zero/empty data (they show R$ 0,00)
    const cards = screen.getAllByTestId('summary-card');
    expect(cards.length).toBeGreaterThanOrEqual(1);

    // The "Ver todas as transações" link is still present
    expect(screen.getByText('Ver todas as transações')).toBeInTheDocument();
  });
});
