'use client';

import React from 'react';
import { Transaction } from '@/types/finance';
import { formatCurrency, formatDate } from '@/shared/utils';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell className="py-4 px-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </TableCell>
      <TableCell className="py-4 px-6">
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell className="py-4 px-6">
        <Skeleton className="h-5 w-16 rounded-full" />
      </TableCell>
      <TableCell className="py-4 px-6">
        <Skeleton className="h-4 w-16" />
      </TableCell>
      <TableCell className="py-4 px-6">
        <Skeleton className="ml-auto h-4 w-24" />
      </TableCell>
      <TableCell className="py-4 px-6">
        <div className="flex items-center justify-center gap-3">
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
        </div>
      </TableCell>
    </TableRow>
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
        <Table className='border-separate border-spacing-y-2 bg-[var(--background)]'>
          <TableHeader>
            <TableRow className='bg-blue-700'>
              <TableHead className='rounded-l-[var(--radius)]'>
                Descrição
              </TableHead>
              <TableHead>
                Data
              </TableHead>
              <TableHead>
                Categoria
              </TableHead>
              <TableHead>
                Status
              </TableHead>
              <TableHead>
                Valor
              </TableHead>
              <TableHead className='rounded-r-[var(--radius)]'>
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody data-testid={isLoading ? 'table-loading' : undefined}>
            {isLoading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonRow key={`skeleton-${index}`} />
                ))
              : transactions.length === 0
                ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      data-testid="table-empty"
                      className="px-6 py-16 text-center text-on-surface-variant"
                    >
                      Nenhuma transação encontrada para o período selecionado.
                    </TableCell>
                  </TableRow>
                )
                : (
                  transactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      data-testid="table-row"
                    >
                      <TableCell className="px-6 py-4 rounded-l-[var(--radius)]">
                        <p className="font-medium text-on-surface">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {transaction.responsible}
                        </p>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-on-surface">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge
                          className={cn(
                            'rounded-full font-medium',
                            CATEGORY_COLORS[transaction.category] || CATEGORY_COLORS.Outros,
                          )}
                        >
                          {transaction.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center">
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
                      </TableCell>
                      <TableCell
                        className={`px-6 py-4 font-semibold ${
                          transaction.type === 'income'
                            ? 'text-finance-income'
                            : 'text-finance-expense'
                        }`}
                      >
                        {formatCurrency(transaction.value)}
                      </TableCell>
                      <TableCell className="px-6 py-4 rounded-r-[var(--radius)]">
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TransactionsTable;
