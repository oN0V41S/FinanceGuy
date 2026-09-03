'use client';

import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ChartWrapper, ChartTooltipStyle } from './ChartWrapper';
import type { Transaction } from '@/features/transactions/validations';

interface CategoryBreakdownProps {
  transactions: Transaction[];
}

const DONUT_COLORS = [
  '#E11D48',
  '#F59E0B',
  '#8B5CF6',
  '#2563EB',
  '#10B981',
  '#787679',
] as const;

interface CategorySlice {
  name: string;
  value: number;
  color: string;
  percent: number;
}

function buildSlices(transactions: Transaction[]): CategorySlice[] {
  const expenses = transactions.filter((t) => t.type === 'expense');
  if (expenses.length === 0) return [];

  const totals = new Map<string, number>();
  for (const t of expenses) {
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.value);
  }

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const top5 = sorted.slice(0, 5);
  const rest = sorted.slice(5);

  const slices: { name: string; value: number }[] = top5.map(([name, value]) => ({
    name,
    value,
  }));

  if (rest.length > 0) {
    const othersValue = rest.reduce((acc, [, v]) => acc + v, 0);
    slices.push({ name: 'Outros', value: othersValue });
  }

  const total = slices.reduce((acc, s) => acc + s.value, 0);

  return slices.map((s, i) => ({
    name: s.name,
    value: s.value,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
    percent: total > 0 ? Math.round((s.value / total) * 100) : 0,
  }));
}

export function CategoryBreakdown({ transactions }: CategoryBreakdownProps) {
  const slices = buildSlices(transactions);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Gastos por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-on-surface-variant">
            <PieChartIcon className="w-12 h-12" />
            <p className="text-sm">Sem despesas no período</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <ChartWrapper height={220}>
                <PieChart>
                  <Pie
                    data={slices}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {slices.map((slice, index) => (
                      <Cell key={`cell-${index}`} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={ChartTooltipStyle}
                    formatter={(value: number) =>
                      new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(value)
                    }
                  />
                </PieChart>
              </ChartWrapper>
            </div>
            <ul className="flex flex-col gap-2 w-full">
              {slices.map((slice) => (
                <li key={slice.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-on-surface flex-1 truncate">{slice.name}</span>
                  <span className="text-on-surface-variant font-mono text-xs">
                    {slice.percent}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
