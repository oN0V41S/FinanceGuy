'use client';

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

const mockUseDashboardData = jest.fn();

jest.mock('@/features/dashboard/hooks/useDashboardData', () => ({
  useDashboardData: (...args: any[]) => mockUseDashboardData(...args),
}));

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

jest.mock('@/features/dashboard/components/HeaderLayout', () => ({
  HeaderLayout: ({
    isDrawerOpen,
    onToggleDrawer,
  }: {
    isDrawerOpen?: boolean;
    onToggleDrawer?: () => void;
  }) => (
    <header data-testid="header">
      <button
        aria-label="Abrir menu"
        aria-expanded={isDrawerOpen ?? false}
        onClick={onToggleDrawer}
      >
        Menu
      </button>
    </header>
  ),
}));

jest.mock('@/features/dashboard/components/MobileNavBar', () => ({
  MobileNavBar: () => <nav data-testid="mobile-navbar">MobileNavBar</nav>,
}));

jest.mock('@/features/dashboard/components/SummaryCard', () => ({
  SummaryCard: ({ label }: { label: string }) => <div data-testid="summary-card">{label}</div>,
}));

jest.mock('@/features/dashboard/components/MonthFilter', () => ({
  MonthFilter: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (month: string | null) => void;
  }) => (
    <div data-testid="month-filter">
      <button aria-label="Mês" onClick={() => onChange('06')}>
        Month: {value}
      </button>
    </div>
  ),
}));

jest.mock('@/features/dashboard/components/FortnightFilter', () => ({
  FortnightFilter: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (val: string) => void;
  }) => (
    <div data-testid="fortnight-filter">
      <button aria-label="Quinzena" onClick={() => onChange('first')}>
        Fortnight: {value}
      </button>
    </div>
  ),
}));

import DashboardPage from '../page';

const defaultData = {
  summary: { income: 0, expense: 0, balance: 0 },
  isLoading: false,
  error: null,
};

describe('DashboardPage Integration', () => {
  beforeEach(() => {
    mockUseDashboardData.mockReturnValue(defaultData);
  });

  describe('HeaderLayout and MobileNavBar', () => {
    it('renderiza HeaderLayout', () => {
      render(<DashboardPage />);
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('renderiza MobileNavBar', () => {
      render(<DashboardPage />);
      expect(screen.getByTestId('mobile-navbar')).toBeInTheDocument();
    });
  });

  describe('Drawer behavior', () => {
    it('clicking menu button opens drawer', async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      expect(screen.queryByTestId('drawer-overlay')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));

      expect(screen.getByTestId('drawer-overlay')).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Menu de navegação' })).toHaveClass('translate-x-0');
    });

    it('clicking overlay closes drawer', async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      expect(screen.getByTestId('drawer-overlay')).toBeInTheDocument();

      await user.click(screen.getByTestId('drawer-overlay'));

      expect(screen.queryByTestId('drawer-overlay')).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Menu de navegação' })).toHaveClass('-translate-x-full');
    });

    it('clicking close button closes drawer', async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
      expect(screen.getByTestId('drawer-overlay')).toBeInTheDocument();

      await user.click(within(screen.getByRole('dialog', { name: 'Menu de navegação' })).getByRole('button', { name: 'Fechar menu' }));

      expect(screen.queryByTestId('drawer-overlay')).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Menu de navegação' })).toHaveClass('-translate-x-full');
    });
  });

  describe('Filter interactions', () => {
    it('MonthFilter renders and triggers onChange', async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      expect(screen.getByTestId('month-filter')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mês' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Mês' }));

      expect(mockUseDashboardData).toHaveBeenCalledWith(
        '06',
        expect.any(String),
        'all',
      );
    });

    it('FortnightFilter renders and triggers onChange', async () => {
      const user = userEvent.setup();
      render(<DashboardPage />);

      expect(screen.getByTestId('fortnight-filter')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Quinzena' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Quinzena' }));

      expect(mockUseDashboardData).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'first',
      );
    });
  });

  describe('Error state', () => {
    it('displays error message when useDashboardData returns error', () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultData,
        error: 'Falha ao carregar dados financeiros',
      });

      render(<DashboardPage />);

      expect(screen.getByText('Falha ao carregar dados financeiros')).toBeInTheDocument();
    });
  });

  describe('Link para transações', () => {
    it('renderiza botão "Ver todas as transações" com link para /transactions', () => {
      render(<DashboardPage />);
      const link = screen.getByRole('link', { name: 'Ver todas as transações' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/transactions');
    });
  });

  describe('Page title', () => {
    it('renders "Visão Geral" heading', () => {
      render(<DashboardPage />);
      expect(screen.getByRole('heading', { name: 'Visão Geral' })).toBeInTheDocument();
    });

    it('renders current month/year subtitle', () => {
      const now = new Date();
      const expected = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      render(<DashboardPage />);
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });
});
