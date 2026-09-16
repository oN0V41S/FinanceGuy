import React from 'react';
import { render, screen } from '@testing-library/react';
import { InvestmentsCard } from '../InvestmentsCard';
import { useInvestments } from '@/features/investments/hooks/useInvestments';

jest.mock('lucide-react', () => ({
  TrendingUp: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-trending-up" {...props} />
  ),
  Plus: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-plus" {...props} />
  ),
}));

jest.mock('@/features/investments/hooks/useInvestments');
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

const mockUseInvestments = useInvestments as jest.MockedFunction<typeof useInvestments>;

const baseHookResult = {
  investments: [],
  isLoading: false,
  error: null,
  refresh: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('InvestmentsCard', () => {
  beforeEach(() => {
    mockUseInvestments.mockReturnValue(baseHookResult);
  });

  it('renders without crash', () => {
    render(<InvestmentsCard />);
    expect(screen.getByText('Investimentos')).toBeInTheDocument();
  });

  it('shows empty state when there are no investments', () => {
    render(<InvestmentsCard />);
    expect(screen.getByText('Nenhum investimento cadastrado')).toBeInTheDocument();
  });

  it('links "Criar investimento" to the investments page', () => {
    render(<InvestmentsCard />);
    const link = screen.getByRole('link', { name: /Criar investimento/i });
    expect(link).toHaveAttribute('href', '/investimentos');
  });

  it('shows a loading skeleton while fetching', () => {
    mockUseInvestments.mockReturnValue({ ...baseHookResult, isLoading: true });
    render(<InvestmentsCard />);
    expect(screen.queryByText('Nenhum investimento cadastrado')).not.toBeInTheDocument();
  });

  it('shows the total invested value when investments exist', () => {
    mockUseInvestments.mockReturnValue({
      ...baseHookResult,
      investments: [
        {
          id: '1',
          name: 'Tesouro Selic',
          type: 'Renda Fixa',
          value: 1500,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Ações XPTO',
          type: 'Renda Variável',
          value: 2500,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    render(<InvestmentsCard />);
    expect(screen.getByText('R$ 4.000,00')).toBeInTheDocument();
    expect(screen.getByText('2 investimentos')).toBeInTheDocument();
  });

  it('links "Ver todos" to the investments page when investments exist', () => {
    mockUseInvestments.mockReturnValue({
      ...baseHookResult,
      investments: [
        {
          id: '1',
          name: 'Tesouro Selic',
          type: 'Renda Fixa',
          value: 1500,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    render(<InvestmentsCard />);
    const link = screen.getByRole('link', { name: /Ver todos/i });
    expect(link).toHaveAttribute('href', '/investimentos');
  });

  it('uses singular label for a single investment', () => {
    mockUseInvestments.mockReturnValue({
      ...baseHookResult,
      investments: [
        {
          id: '1',
          name: 'Tesouro Selic',
          type: 'Renda Fixa',
          value: 1500,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    render(<InvestmentsCard />);
    expect(screen.getByText('1 investimento')).toBeInTheDocument();
  });
});
