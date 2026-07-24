'use client';

import React from 'react';
import { Transaction } from '@/types/finance';
import { formatCurrency, formatDate } from '@/shared/utils';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-outline-variant/20">
      <td className="py-4 px-6">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-1/3 animate-pulse rounded-md bg-muted" />
        </div>
      </td>
      <td className="py-4 px-6">
        <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
      </td>
      <td className="py-4 px-6">
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
      </td>
      <td className="py-4 px-6">
        <div className="h-4 w-16 animate-pulse rounded-md bg-muted" />
      </td>
      <td className="py-4 px-6">
        <div className="ml-auto h-4 w-24 animate-pulse rounded-md bg-muted" />
      </td>
      <td className="py-4 px-6">
        <div className="flex items-center justify-center gap-3">
          <div className="size-8 animate-pulse rounded-md bg-muted" />
          <div className="size-8 animate-pulse rounded-md bg-muted" />
        </div>
      </td>
    </tr>
  );
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

const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  isLoading,
  onEdit,
  onDelete,
}) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-muted/50">
                <th className="px-6 py-4 text-left font-medium text-on-surface-variant">
                  Descrição
                </th>
                <th className="px-6 py-4 text-left font-medium text-on-surface-variant">
                  Data
                </th>
                <th className="px-6 py-4 text-left font-medium text-on-surface-variant">
                  Categoria
                </th>
                <th className="px-6 py-4 text-center font-medium text-on-surface-variant">
                  Status
                </th>
                <th className="px-6 py-4 text-right font-medium text-on-surface-variant">
                  Valor
                </th>
                <th className="px-6 py-4 text-center font-medium text-on-surface-variant">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody data-testid={isLoading ? 'table-loading' : undefined}>
              {isLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <SkeletonRow key={`skeleton-${index}`} />
                  ))
                : transactions.length === 0
                  ? (
                    <tr>
                      <td
                        colSpan={6}
                        data-testid="table-empty"
                        className="px-6 py-16 text-center text-on-surface-variant"
                      >
                        Nenhuma transação encontrada para o período selecionado.
                      </td>
                    </tr>
                  )
                  : (
                    transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        data-testid="table-row"
                        className="border-b border-outline-variant/20 transition-colors hover:bg-muted/50"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-on-surface">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {transaction.responsible}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-on-surface">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            className={cn(
                              'rounded-full font-medium',
                              CATEGORY_COLORS[transaction.category] || CATEGORY_COLORS.Outros,
                            )}
                          >
                            {transaction.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {transaction.paid ? (
                            <Badge className="bg-finance-income text-white rounded-full">
                              <Check className="w-3 h-3 mr-1" />
                              Pago
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                              <X className="w-3 h-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-semibold ${
                            transaction.type === 'income'
                              ? 'text-finance-income'
                              : 'text-finance-expense'
                          }`}
                        >
                          {formatCurrency(transaction.value)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Editar transação"
                              onClick={() => onEdit(transaction)}
                            >
                              <Edit2 className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Excluir transação"
                              onClick={() => onDelete(transaction.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionsTable;
