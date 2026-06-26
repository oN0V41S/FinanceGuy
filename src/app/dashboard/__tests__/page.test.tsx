'use client';

import { render, screen } from '@testing-library/react';

// Mock components
jest.mock('@/features/dashboard/components/HeaderLayout', () => ({
  HeaderLayout: () => <header data-testid="header">Header</header>,
}));

jest.mock('@/features/dashboard/components/MobileNavBar', () => ({
  MobileNavBar: () => <nav data-testid="mobile-navbar">MobileNavBar</nav>,
}));

jest.mock('@/features/dashboard/components/SummaryCard', () => ({
  SummaryCard: ({ label }: { label: string }) => <div data-testid="summary-card">{label}</div>,
}));

jest.mock('@/features/dashboard/components/RecentTransactions', () => ({
  RecentTransactions: () => <div data-testid="recent-transactions">Transactions</div>,
}));

jest.mock('@/features/dashboard/components/MonthFilter', () => ({
  MonthFilter: () => <div data-testid="month-filter">MonthFilter</div>,
}));

jest.mock('@/features/dashboard/components/EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state">EmptyState</div>,
}));

jest.mock('@/features/dashboard/hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    recentTransactions: [],
    summary: { income: 0, expense: 0, balance: 0 },
    isLoading: false,
    error: null,
  }),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

import { HeaderLayout } from '@/features/dashboard/components/HeaderLayout';
import { MobileNavBar } from '@/features/dashboard/components/MobileNavBar';

describe('DashboardPage Integration', () => {
  it('renderiza HeaderLayout', () => {
    render(<HeaderLayout />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renderiza MobileNavBar', () => {
    render(<MobileNavBar />);
    expect(screen.getByTestId('mobile-navbar')).toBeInTheDocument();
  });
});
