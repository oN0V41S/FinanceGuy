'use client';

import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  label: string;
  value: number;
  type: 'income' | 'expense' | 'balance';
  isLoading?: boolean;
}

const typeConfig = {
  income: {
    icon: TrendingUp,
    color: 'text-finance-income',
    bgColor: 'bg-finance-income/10',
    iconColor: 'text-finance-income',
  },
  expense: {
    icon: TrendingDown,
    color: 'text-finance-expense',
    bgColor: 'bg-finance-expense/10',
    iconColor: 'text-finance-expense',
  },
  balance: {
    icon: Wallet,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(value));
}

export function SummaryCard({ label, value, type, isLoading }: SummaryCardProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  if (isLoading) {
    return (
      <Card className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-8 w-32" />
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('p-2 rounded-lg', config.bgColor)}>
          <Icon className={cn('w-5 h-5', config.iconColor)} />
        </div>
        <span className="text-sm text-on-surface-variant font-medium">{label}</span>
      </div>
      <p className={cn('text-2xl md:text-3xl font-semibold font-mono', config.color)}>
        {type === 'expense' && value > 0 ? '- ' : ''}
        {formatCurrency(value)}
      </p>
    </Card>
  );
}
