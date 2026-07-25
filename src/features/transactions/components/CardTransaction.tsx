'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/shared/utils';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types/finance';

interface CardTransactionProps {
  transactions: Transaction[];
  isLoading: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Alimentação: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Transporte: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Casa: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Saúde: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Educação: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Lazer: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  Salário: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  Investimentos: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  Outros: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

function CardTransaction({ transactions, isLoading, onEdit, onDelete }: CardTransactionProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="p-4">
            <div className="text-center space-y-3">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <Skeleton className="h-4 w-1/3 mx-auto" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div data-testid="empty-state" className="text-center py-12">
        <p className="text-muted-foreground">
          Nenhuma transação encontrada para o período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="transactions-grid">
      {transactions.map((tx) => (
        <Card key={tx.id} data-testid="transaction-card">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base">{tx.description}</CardTitle>
                <CardDescription>{tx.responsible}</CardDescription>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDate(tx.date)}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className={cn(CATEGORY_COLORS[tx.category] || CATEGORY_COLORS.Outros, 'rounded-full')}>
                {tx.category}
              </Badge>
              <span
                data-testid="status-indicator"
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  tx.paid
                    ? 'bg-finance-income text-white'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                )}
              >
                {tx.paid ? (
                  <>
                    <Check className="w-3 h-3" /> Pago
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3" /> Pendente
                  </>
                )}
              </span>
            </div>
            <div
              data-testid="transaction-value"
              className={cn(
                'font-semibold text-lg',
                tx.type === 'income' ? 'text-finance-income' : 'text-finance-expense',
              )}
            >
              {formatCurrency(tx.value)}
            </div>
          </CardContent>
          <CardFooter className="grid grid-cols-2 gap-2 md:flex md:justify-end md:gap-2">
            <div className="flex justify-center">
              <Button variant="ghost" size="icon" aria-label="Editar transação" onClick={() => onEdit(tx)} className="size-8 md:size-9">
                <Edit2 className="size-4" />
              </Button>
            </div>
            <div className="flex justify-center">
              <Button variant="ghost" size="icon" aria-label="Excluir transação" onClick={() => onDelete(tx.id)} className="size-8 md:size-9">
                <Trash2 className="size-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export default CardTransaction;