'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChartWrapper, CHART_COLORS, ChartTooltipStyle } from './ChartWrapper';
import { PeriodSelector } from './PeriodSelector';

interface MonthlyPoint {
  month: string;
  monthLabel: string;
  income: number;
  expense: number;
}

interface MonthlyChartProps {
  data: MonthlyPoint[];
  period: string;
  onPeriodChange: (p: string) => void;
}

function formatYAxis(value: number): string {
  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`;
  return `R$${value}`;
}

export function MonthlyChart({ data, period, onPeriodChange }: MonthlyChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg">Evolução Mensal</CardTitle>
          <PeriodSelector value={period} onChange={onPeriodChange} />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[280px]">
          <p className="text-on-surface-variant text-sm">Nenhum dado para o período selecionado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg">Evolução Mensal</CardTitle>
        <PeriodSelector value={period} onChange={onPeriodChange} />
      </CardHeader>
      <CardContent>
        <ChartWrapper height={280}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e2e32" vertical={false} />
            <XAxis
              dataKey="monthLabel"
              tick={{ fill: '#787679', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fill: '#787679', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              contentStyle={ChartTooltipStyle}
              formatter={(value: number) =>
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
              }
            />
            <Legend
              formatter={(value: string) =>
                value === 'income' ? 'Entradas' : 'Saídas'
              }
              wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            />
            <Bar
              dataKey="income"
              name="income"
              fill={CHART_COLORS.income}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Bar
              dataKey="expense"
              name="expense"
              fill={CHART_COLORS.expense}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ChartWrapper>
      </CardContent>
    </Card>
  );
}
