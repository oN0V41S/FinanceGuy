'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/features/transactions/validations';

interface RecentTransactionsProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Math.abs(value));
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function TransactionSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-outline-variant/20 last:border-0">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-12" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <TransactionSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-on-surface-variant text-sm">Nenhuma transação recente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Transações Recentes</CardTitle>
        <Link href="/transactions">
          <Button variant="ghost" size="sm">
            Ver todas
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between py-3 border-b border-outline-variant/20 last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-on-surface-variant font-mono w-12">
                  {formatDate(transaction.date)}
                </span>
                <div>
                  <p className="text-sm font-medium text-on-surface">{transaction.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-xs">
                      {transaction.category}
                    </Badge>
                    <span className="text-xs text-on-surface-variant">
                      {transaction.responsible}
                    </span>
                  </div>
                </div>
              </div>
              <span
                className={cn(
                  'text-sm font-semibold font-mono',
                  transaction.type === 'income' ? 'text-finance-income' : 'text-finance-expense'
                )}
              >
                {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.value)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
