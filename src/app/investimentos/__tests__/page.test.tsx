import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InvestimentosPage from '../page';

jest.mock('next/navigation', () => ({
  usePathname: () => '/investimentos',
}));

jest.mock('@/features/dashboard/components/HeaderLayout', () => ({
  HeaderLayout: () => <header data-testid="header">Header</header>,
}));

jest.mock('@/features/dashboard/components/MobileNavBar', () => ({
  MobileNavBar: () => <nav data-testid="mobile-navbar">MobileNavBar</nav>,
}));

jest.mock('../components/InvestmentsSection', () => ({
  InvestmentsSection: () => <div data-testid="investments-section">Investments</div>,
}));

jest.mock('../components/GoalsSection', () => ({
  GoalsSection: () => <div data-testid="goals-section">Goals</div>,
}));

describe('InvestimentosPage', () => {
  it('renders the page title and header/nav shell', () => {
    render(<InvestimentosPage />);
    expect(screen.getByText('Investimentos e Metas')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-navbar')).toBeInTheDocument();
  });

  it('shows the investments tab by default', () => {
    render(<InvestimentosPage />);
    expect(screen.getByTestId('investments-section')).toBeVisible();
  });

  it('switches to the goals tab when clicked', () => {
    render(<InvestimentosPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Metas' }));
    expect(screen.getByTestId('goals-section')).toBeVisible();
  });
});
