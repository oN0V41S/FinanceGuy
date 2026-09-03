'use client';

import { ResponsiveContainer } from 'recharts';

interface ChartWrapperProps {
  children: React.ReactNode;
  height?: number;
}

export const CHART_COLORS = {
  income: '#10B981',
  expense: '#E11D48',
  primary: '#2563EB',
} as const;

export const ChartTooltipStyle = {
  backgroundColor: '#1e1e20',
  border: '1px solid #2e2e32',
  color: '#ffffff',
  borderRadius: '8px',
  fontSize: '12px',
} as const;

export function ChartWrapper({ children, height = 280 }: ChartWrapperProps) {
  return (
    <div className="font-sans text-xs">
      <ResponsiveContainer width="100%" height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}
