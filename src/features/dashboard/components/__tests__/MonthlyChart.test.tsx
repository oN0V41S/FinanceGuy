import React from 'react';
import { render, screen } from '@testing-library/react';
import { MonthlyChart } from '../MonthlyChart';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ dataKey }: { dataKey: string }) => (
    <div data-testid={`bar-${dataKey}`} />
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => <div data-testid="legend" />,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="period-select">{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
}));

const mockData = [
  { month: '04', monthLabel: 'Abr', income: 4800, expense: 3200 },
  { month: '05', monthLabel: 'Mai', income: 5200, expense: 3800 },
];

describe('MonthlyChart', () => {
  it('renders without crash', () => {
    render(
      <MonthlyChart
        data={[]}
        period="last6"
        onPeriodChange={() => {}}
      />
    );
    expect(screen.getByText('Evolução Mensal')).toBeInTheDocument();
  });

  it('renders chart with real data', () => {
    render(
      <MonthlyChart
        data={mockData}
        period="last6"
        onPeriodChange={() => {}}
      />
    );
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-income')).toBeInTheDocument();
    expect(screen.getByTestId('bar-expense')).toBeInTheDocument();
  });

  it('shows empty state text when data is empty', () => {
    render(
      <MonthlyChart
        data={[]}
        period="last6"
        onPeriodChange={() => {}}
      />
    );
    expect(screen.getByText('Nenhum dado para o período selecionado.')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
  });

  it('renders PeriodSelector', () => {
    render(
      <MonthlyChart
        data={mockData}
        period="last6"
        onPeriodChange={() => {}}
      />
    );
    expect(screen.getByTestId('period-select')).toBeInTheDocument();
  });
});
