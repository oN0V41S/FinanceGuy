import React from 'react';
import { render, screen } from '@testing-library/react';
import { CategoryBreakdown } from '../CategoryBreakdown';
import type { Transaction } from '@/features/transactions/validations';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data }: { data: unknown[] }) => (
    <div data-testid="pie" data-count={data?.length ?? 0} />
  ),
  Cell: () => null,
  Tooltip: () => null,
}));

jest.mock('lucide-react', () => ({
  PieChart: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="icon-pie-chart" {...props} />
  ),
}));

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: '1',
    type: 'expense',
    description: 'Test',
    value: 100,
    date: '2024-01-01',
    category: 'Alimentação',
    responsible: 'Ana',
    paid: true,
    is_recurring: false,
    parent_transaction_id: null,
    ...overrides,
  };
}

const expenseTransactions: Transaction[] = [
  makeTransaction({ id: '1', category: 'Alimentação', value: 500 }),
  makeTransaction({ id: '2', category: 'Alimentação', value: 300 }),
  makeTransaction({ id: '3', category: 'Transporte', value: 200 }),
  makeTransaction({ id: '4', category: 'Casa', value: 800 }),
  makeTransaction({ id: '5', category: 'Saúde', value: 150 }),
  makeTransaction({ id: '6', category: 'Lazer', value: 100 }),
];

describe('CategoryBreakdown', () => {
  it('renders without crash', () => {
    render(<CategoryBreakdown transactions={[]} />);
    expect(screen.getByText('Gastos por Categoria')).toBeInTheDocument();
  });

  it('shows empty state when no expense transactions', () => {
    const incomeOnly: Transaction[] = [
      makeTransaction({ id: '1', type: 'income', category: 'Salário', value: 5000 }),
    ];
    render(<CategoryBreakdown transactions={incomeOnly} />);
    expect(screen.getByTestId('icon-pie-chart')).toBeInTheDocument();
    expect(screen.getByText('Sem despesas no período')).toBeInTheDocument();
  });

  it('shows empty state when transactions array is empty', () => {
    render(<CategoryBreakdown transactions={[]} />);
    expect(screen.getByText('Sem despesas no período')).toBeInTheDocument();
  });

  it('renders pie chart with expense data', () => {
    render(<CategoryBreakdown transactions={expenseTransactions} />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie')).toBeInTheDocument();
  });

  it('renders category labels in legend', () => {
    render(<CategoryBreakdown transactions={expenseTransactions} />);
    expect(screen.getByText('Alimentação')).toBeInTheDocument();
    expect(screen.getByText('Casa')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
  });

  it('renders percentage values', () => {
    render(<CategoryBreakdown transactions={expenseTransactions} />);
    const percentages = screen.getAllByText(/%/);
    expect(percentages.length).toBeGreaterThan(0);
  });
});
