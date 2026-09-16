import React from 'react';
import { render, screen } from '@testing-library/react';
import { InvestmentsGoalsCard } from '../InvestmentsGoalsCard';
import { useInvestments } from '@/features/investments/hooks/useInvestments';
import { useGoals } from '@/features/goals/hooks/useGoals';

jest.mock('lucide-react', () => ({
  TrendingUp: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-trending-up" {...props} />
  ),
  Target: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-target" {...props} />
  ),
  Plus: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-plus" {...props} />
  ),
}));

jest.mock('@/features/investments/hooks/useInvestments');
jest.mock('@/features/goals/hooks/useGoals');
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
const mockUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;

const baseInvestmentsResult = {
  investments: [],
  isLoading: false,
  error: null,
  refresh: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

const baseGoalsResult = {
  goals: [],
  isLoading: false,
  error: null,
  refresh: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('InvestmentsGoalsCard', () => {
  beforeEach(() => {
    mockUseInvestments.mockReturnValue(baseInvestmentsResult);
    mockUseGoals.mockReturnValue(baseGoalsResult);
  });

  it('renders both split sections', () => {
    render(<InvestmentsGoalsCard />);
    expect(screen.getByText('Investimentos')).toBeInTheDocument();
    expect(screen.getByText('Metas Financeiras')).toBeInTheDocument();
  });

  it('shows empty states for both sections', () => {
    render(<InvestmentsGoalsCard />);
    expect(screen.getByText('Nenhum investimento cadastrado')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma meta cadastrada')).toBeInTheDocument();
  });

  it('shows real investment totals in its section', () => {
    mockUseInvestments.mockReturnValue({
      ...baseInvestmentsResult,
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
    render(<InvestmentsGoalsCard />);
    expect(screen.getByText('R$ 1.500,00')).toBeInTheDocument();
    expect(screen.getByText('1 investimento')).toBeInTheDocument();
  });

  it('shows real goal progress in its section', () => {
    mockUseGoals.mockReturnValue({
      ...baseGoalsResult,
      goals: [
        {
          id: '1',
          name: 'Viagem para o Japão',
          targetValue: 10000,
          currentValue: 3500,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    render(<InvestmentsGoalsCard />);
    expect(screen.getByText('Viagem para o Japão')).toBeInTheDocument();
    expect(screen.getByText('35% concluído')).toBeInTheDocument();
  });

  it('shows loading skeletons independently per section', () => {
    mockUseInvestments.mockReturnValue({ ...baseInvestmentsResult, isLoading: true });
    render(<InvestmentsGoalsCard />);
    expect(screen.queryByText('Nenhum investimento cadastrado')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhuma meta cadastrada')).toBeInTheDocument();
  });
});
