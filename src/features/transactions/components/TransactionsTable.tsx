'use client';

import React from 'react';
import { Transaction } from '@/types/finance';
import { formatCurrency, formatDate } from '@/shared/utils';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  isLoading,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-card">
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
                      <Badge variant="secondary">{transaction.category}</Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {transaction.paid ? (
                        <Badge variant="default" className="bg-finance-income text-white">
                          <Check className="w-3 h-3 mr-1" />
                          Pago
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-on-surface-variant">
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
  );
};

export default TransactionsTable;
