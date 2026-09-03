/**
 * E2E — Dashboard lazy loading: LazyLoad gates MonthlyChart and CategoryBreakdown.
 *
 * Current architecture (as of feat/dashboard):
 *   - SummaryCards: always rendered (isLoading passed as prop, no LazyLoad gate)
 *   - MonthlyChart: wrapped in <LazyLoad isReady={!chartLoading}>
 *   - CategoryBreakdown: wrapped in <LazyLoad isReady={!isLoading}>
 *   - GoalsCard, AIInsightCard: always rendered (static)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockUseDashboardData = jest.fn();
const mockUseMonthlySummary = jest.fn();

jest.mock('@/features/dashboard/hooks/useDashboardData', () => ({
  useDashboardData: (...args: any[]) => mockUseDashboardData(...args),
}));

jest.mock('@/features/dashboard/hooks/useMonthlySummary', () => ({
  useMonthlySummary: (...args: any[]) => mockUseMonthlySummary(...args),
}));

jest.mock('@/features/dashboard/components/SummaryCard', () => ({
  SummaryCard: ({ label }: { label: string }) => (
    <div data-testid="summary-card">{label}</div>
  ),
}));

jest.mock('@/features/dashboard/components/MonthlyChart', () => ({
  MonthlyChart: () => <div data-testid="monthly-chart">MonthlyChart</div>,
}));

jest.mock('@/features/dashboard/components/CategoryBreakdown', () => ({
  CategoryBreakdown: () => <div data-testid="category-breakdown">CategoryBreakdown</div>,
}));

jest.mock('@/features/dashboard/components/GoalsCard', () => ({
  GoalsCard: () => <div data-testid="goals-card">GoalsCard</div>,
}));

jest.mock('@/features/dashboard/components/AIInsightCard', () => ({
  AIInsightCard: () => <div data-testid="ai-insight-card">AIInsightCard</div>,
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

const baseData = {
  recentTransactions: [
    { id: '1', date: '2026-06-15', value: 150, description: 'Mercado', responsible: 'João', category: 'Alimentação', type: 'expense', paid: true, is_recurring: false, parent_transaction_id: null },
  ],
  summary: { income: 5000, expense: 150, balance: 4850 },
  error: null,
  refresh: jest.fn(),
};

const baseMonthlySummary = {
  data: [{ month: '06', monthLabel: 'Jun', income: 5000, expense: 150 }],
  period: 'last6',
  setPeriod: jest.fn(),
};

describe('Dashboard LazyLoad gates (E2E)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows spinner instead of CategoryBreakdown while useDashboardData is loading', () => {
    mockUseDashboardData.mockReturnValue({ ...baseData, isLoading: true });
    mockUseMonthlySummary.mockReturnValue({ ...baseMonthlySummary, isLoading: false });
    render(<DashboardPage />);

    expect(screen.queryByTestId('category-breakdown')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
  });

  it('shows spinner instead of MonthlyChart while useMonthlySummary is loading', () => {
    mockUseDashboardData.mockReturnValue({ ...baseData, isLoading: false });
    mockUseMonthlySummary.mockReturnValue({ ...baseMonthlySummary, isLoading: true });
    render(<DashboardPage />);

    expect(screen.queryByTestId('monthly-chart')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
  });

  it('shows both spinners when both hooks are loading', () => {
    mockUseDashboardData.mockReturnValue({ ...baseData, isLoading: true });
    mockUseMonthlySummary.mockReturnValue({ ...baseMonthlySummary, isLoading: true });
    render(<DashboardPage />);

    expect(screen.queryByTestId('monthly-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('category-breakdown')).not.toBeInTheDocument();
    expect(screen.getAllByRole('status', { name: 'Carregando' })).toHaveLength(2);
  });

  it('renders MonthlyChart and CategoryBreakdown after both hooks finish loading', () => {
    mockUseDashboardData.mockReturnValue({ ...baseData, isLoading: false });
    mockUseMonthlySummary.mockReturnValue({ ...baseMonthlySummary, isLoading: false });
    render(<DashboardPage />);

    expect(screen.getByTestId('monthly-chart')).toBeInTheDocument();
    expect(screen.getByTestId('category-breakdown')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Carregando' })).not.toBeInTheDocument();
  });

  it('always renders SummaryCards regardless of loading state', () => {
    mockUseDashboardData.mockReturnValue({ ...baseData, isLoading: true });
    mockUseMonthlySummary.mockReturnValue({ ...baseMonthlySummary, isLoading: true });
    render(<DashboardPage />);

    const cards = screen.getAllByTestId('summary-card');
    expect(cards).toHaveLength(3);
  });

  it('always renders GoalsCard and AIInsightCard (static content)', () => {
    mockUseDashboardData.mockReturnValue({ ...baseData, isLoading: true });
    mockUseMonthlySummary.mockReturnValue({ ...baseMonthlySummary, isLoading: true });
    render(<DashboardPage />);

    expect(screen.getByTestId('goals-card')).toBeInTheDocument();
    expect(screen.getByTestId('ai-insight-card')).toBeInTheDocument();
  });
});
