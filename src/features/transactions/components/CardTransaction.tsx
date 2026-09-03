'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit2, Trash2, TrendingUp, TrendingDown, RefreshCw, Check, X } from 'lucide-react';
import { formatCurrency } from '@/shared/utils';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types/finance';

// ---- Types ----
interface CardTransactionProps {
  transactions: Transaction[];
  isLoading: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

// ---- Helpers ----
function groupByDate(transactions: Transaction[]): [string, Transaction[]][] {
  const map: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    if (!map[tx.date]) map[tx.date] = [];
    map[tx.date].push(tx);
  }
  return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
}

function formatDateHeader(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayNum = String(day).padStart(2, '0');
  const monthName = date.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase();
  return `${dayNum} DE ${monthName}`;
}

function calcDailyTotal(txs: Transaction[]): number {
  return txs.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.value : -tx.value), 0);
}

// ---- Category colors ----
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

// ---- Skeleton row ----
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton data-testid="skeleton" className="size-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton data-testid="skeleton" className="h-4 w-3/4" />
        <Skeleton data-testid="skeleton" className="h-3 w-1/2" />
      </div>
      <Skeleton data-testid="skeleton" className="h-4 w-20 shrink-0" />
    </div>
  );
}

// ---- Component ----
function CardTransaction({ transactions, isLoading, onEdit, onDelete }: CardTransactionProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="h-px bg-border mx-4" />}
            <SkeletonRow />
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div
        data-testid="empty-state"
        className="rounded-xl border border-border bg-card px-6 py-16 text-center text-on-surface-variant"
      >
        Nenhuma transação encontrada para o período selecionado.
      </div>
    );
  }

  const groups = groupByDate(transactions);

  return (
    <div data-testid="transactions-list" className="rounded-xl border border-border bg-card overflow-hidden">
      {groups.map(([date, txs], groupIdx) => {
        const dailyTotal = calcDailyTotal(txs);
        return (
          <div key={date} data-testid="date-group">
            {/* Date header */}
            <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border">
              <span
                data-testid="date-header"
                className="text-xs font-semibold text-on-surface-variant tracking-widest"
              >
                {formatDateHeader(date)}
              </span>
              <span
                data-testid="daily-total"
                className={cn(
                  'text-xs font-semibold',
                  dailyTotal >= 0 ? 'text-finance-income' : 'text-finance-expense',
                )}
              >
                {dailyTotal >= 0 ? '+' : '-'}{formatCurrency(Math.abs(dailyTotal))}
              </span>
            </div>

            {/* Transaction rows */}
            {txs.map((tx, txIdx) => (
              <React.Fragment key={tx.id}>
                {txIdx > 0 && <div className="h-px bg-border mx-4" />}
                <div
                  data-testid="transaction-card"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  {/* Type icon */}
                  <div
                    className={cn(
                      'flex items-center justify-center size-9 rounded-full shrink-0',
                      tx.type === 'income'
                        ? 'bg-finance-income/10 text-finance-income'
                        : 'bg-finance-expense/10 text-finance-expense',
                    )}
                  >
                    {tx.type === 'income'
                      ? <TrendingUp className="size-4" />
                      : <TrendingDown className="size-4" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-on-surface text-sm truncate" title={tx.title || tx.description}>
                      {tx.title
                        ? `${tx.title}${tx.description ? ` — ${tx.description}` : ''}`
                        : tx.description}
                    </p>
                    {/* Chips */}
                    <div className="flex items-center flex-wrap gap-1 mt-0.5">
                      <span
                        data-testid="badge"
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          CATEGORY_COLORS[tx.category] || CATEGORY_COLORS.Outros,
                        )}
                      >
                        {tx.category}
                      </span>
                      {tx.responsible && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-on-surface-variant">
                          {tx.responsible}
                        </span>
                      )}
                      <span
                        data-testid="status-indicator"
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                          tx.paid
                            ? 'bg-finance-income/10 text-finance-income'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                        )}
                      >
                        {tx.paid ? (
                          <><Check className="size-3" />Pago</>
                        ) : (
                          <><X className="size-3" />Pendente</>
                        )}
                      </span>
                      {(tx.is_recurring || tx.total_installments || tx.parent_transaction_id) && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          <RefreshCw className="size-2.5" />Recorrente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Value */}
                  <div
                    data-testid="transaction-value"
                    className={cn(
                      'font-semibold text-sm shrink-0',
                      tx.type === 'income' ? 'text-finance-income' : 'text-finance-expense',
                    )}
                  >
                    {tx.type === 'income' ? '+ ' : '- '}
                    {formatCurrency(tx.value)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar transação"
                        onClick={() => onEdit(tx)}
                        className="size-8 md:size-9"
                      >
                        <Edit2 className="size-4" />
                      </Button>
                    </div>
                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir transação"
                        onClick={() => onDelete(tx.id)}
                        className="size-8 md:size-9"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}

            {groupIdx < groups.length - 1 && <div className="h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

export default CardTransaction;
