import React from 'react';
import { render, screen } from '@testing-library/react';
import { SummaryCard } from '../SummaryCard';

jest.mock('lucide-react', () => ({
  TrendingUp: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-trending-up" {...props} />
  ),
  TrendingDown: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-trending-down" {...props} />
  ),
  Wallet: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-wallet" {...props} />
  ),
}));

function getValueP(): HTMLElement {
  return document.querySelector('p')!;
}

describe('SummaryCard', () => {
  describe('loading state', () => {
    it('shows skeleton loaders when isLoading is true', () => {
      const { container } = render(
        <SummaryCard label="Receitas" value={0} type="income" isLoading />
      );
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
      expect(screen.queryByText('Receitas')).not.toBeInTheDocument();
    });
  });

  describe('income type', () => {
    it('renders TrendingUp icon and correct color classes', () => {
      render(<SummaryCard label="Receitas" value={1000} type="income" />);
      expect(screen.getByTestId('icon-trending-up')).toBeInTheDocument();
      expect(screen.getByText('Receitas')).toBeInTheDocument();
      const p = getValueP();
      expect(p.textContent).toContain('1.000,00');
      expect(p.className).toContain('text-finance-income');
    });
  });

  describe('expense type', () => {
    it('renders TrendingDown icon and correct color classes', () => {
      render(<SummaryCard label="Despesas" value={500} type="expense" />);
      expect(screen.getByTestId('icon-trending-down')).toBeInTheDocument();
      expect(screen.getByText('Despesas')).toBeInTheDocument();
      const p = getValueP();
      expect(p.textContent).toContain('500,00');
      expect(p.className).toContain('text-finance-expense');
    });

    it('shows "-" prefix for expense when value > 0', () => {
      render(<SummaryCard label="Despesas" value={500} type="expense" />);
      expect(getValueP().textContent).toMatch(/-.*R\$.*500,00/);
    });

    it('does not show "-" prefix for expense when value is 0', () => {
      render(<SummaryCard label="Despesas" value={0} type="expense" />);
      const p = getValueP();
      expect(p.textContent).toContain('0,00');
      expect(p.textContent).not.toContain('-');
    });
  });

  describe('balance type', () => {
    it('renders Wallet icon and correct color classes', () => {
      render(<SummaryCard label="Saldo" value={5000} type="balance" />);
      expect(screen.getByTestId('icon-wallet')).toBeInTheDocument();
      expect(screen.getByText('Saldo')).toBeInTheDocument();
      const p = getValueP();
      expect(p.textContent).toContain('5.000,00');
      expect(p.className).toContain('text-primary');
    });
  });

  describe('currency formatting', () => {
    it('formats value as BRL currency', () => {
      render(<SummaryCard label="Receitas" value={1234.56} type="income" />);
      expect(getValueP().textContent).toContain('1.234,56');
    });

    it('handles very large numbers', () => {
      render(<SummaryCard label="Receitas" value={1000000} type="income" />);
      expect(getValueP().textContent).toContain('1.000.000,00');
    });
  });

  describe('edge cases', () => {
    it('renders negative income value without sign change', () => {
      render(<SummaryCard label="Receitas" value={-500} type="income" />);
      const p = getValueP();
      expect(p.textContent).toContain('500,00');
      expect(p.textContent).not.toContain('-');
    });

    it('renders the label text correctly', () => {
      render(<SummaryCard label="Meu Label" value={100} type="income" />);
      expect(screen.getByText('Meu Label')).toBeInTheDocument();
    });
  });
});
