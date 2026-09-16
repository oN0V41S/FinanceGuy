import React from 'react';
import { render, screen } from '@testing-library/react';
import { GoalsCard } from '../GoalsCard';
import { useGoals } from '@/features/goals/hooks/useGoals';

jest.mock('lucide-react', () => ({
  Target: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-target" {...props} />
  ),
  Plus: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-plus" {...props} />
  ),
}));

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

const mockUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;

const baseHookResult = {
  goals: [],
  isLoading: false,
  error: null,
  refresh: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('GoalsCard', () => {
  beforeEach(() => {
    mockUseGoals.mockReturnValue(baseHookResult);
  });

  it('renders without crash', () => {
    render(<GoalsCard />);
    expect(screen.getByText('Metas Financeiras')).toBeInTheDocument();
  });

  it('shows empty state when there are no goals', () => {
    render(<GoalsCard />);
    expect(screen.getByText('Nenhuma meta cadastrada')).toBeInTheDocument();
    expect(
      screen.getByText(/Defina metas financeiras para acompanhar seu progresso/i),
    ).toBeInTheDocument();
  });

  it('links "Criar meta" to the investments page', () => {
    render(<GoalsCard />);
    const link = screen.getByRole('link', { name: /Criar meta/i });
    expect(link).toHaveAttribute('href', '/investimentos');
  });

  it('shows a loading skeleton while fetching', () => {
    mockUseGoals.mockReturnValue({ ...baseHookResult, isLoading: true });
    render(<GoalsCard />);
    expect(screen.queryByText('Nenhuma meta cadastrada')).not.toBeInTheDocument();
  });

  it('renders real goals with progress when present', () => {
    mockUseGoals.mockReturnValue({
      ...baseHookResult,
      goals: [
        {
          id: '1',
          name: 'Viagem para o Japão',
          targetValue: 10000,
          currentValue: 3500,
          deadlineLabel: 'Dezembro 2026',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    render(<GoalsCard />);
    expect(screen.getByText('Viagem para o Japão')).toBeInTheDocument();
    expect(screen.getByText('35% concluído')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma meta cadastrada')).not.toBeInTheDocument();
  });

  it('links "Ver todas" to the investments page when goals exist', () => {
    mockUseGoals.mockReturnValue({
      ...baseHookResult,
      goals: [
        {
          id: '1',
          name: 'Reserva de emergência',
          targetValue: 5000,
          currentValue: 5000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    render(<GoalsCard />);
    const link = screen.getByRole('link', { name: /Ver todas/i });
    expect(link).toHaveAttribute('href', '/investimentos');
  });
});
