'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
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
    <TableRow>
      <TableCell className="text-left">
        <Skeleton className="h-4 w-12" />
      </TableCell>
      <TableCell className="text-left">
        <Skeleton className="h-4 w-32" />
      </TableCell>
      <TableCell className="text-left">
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell className="text-left">
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell className="text-left">
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell className="text-center">
        <Skeleton className="h-5 w-5 mx-auto rounded-full" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-4 w-20 ml-auto" />
      </TableCell>
    </TableRow>
  );
}

export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20 text-left">Data</TableHead>
                  <TableHead className="text-left">Descrição</TableHead>
                  <TableHead className="text-left">Categoria</TableHead>
                  <TableHead className="text-left">Responsável</TableHead>
                  <TableHead className="text-left">Tipo</TableHead>
                  <TableHead className="w-16 text-center">Pago</TableHead>
                  <TableHead className="w-32 text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TransactionSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
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
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 text-left">Data</TableHead>
                <TableHead className="text-left">Descrição</TableHead>
                <TableHead className="text-left">Categoria</TableHead>
                <TableHead className="text-left">Responsável</TableHead>
                <TableHead className="text-left">Tipo</TableHead>
                <TableHead className="w-16 text-center">Pago</TableHead>
                <TableHead className="w-32 text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="text-left">
                    <span className="text-sm text-on-surface-variant font-mono">
                      {formatDate(transaction.date)}
                    </span>
                  </TableCell>
                  <TableCell className="text-left">
                    <p className="text-sm font-medium text-on-surface">{transaction.description}</p>
                  </TableCell>
                  <TableCell className="text-left">
                    <Badge variant="secondary" className="text-xs">
                      {transaction.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-left">
                    <span className="text-sm text-on-surface-variant">
                      {transaction.responsible}
                    </span>
                  </TableCell>
                  <TableCell className="text-left">
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs',
                        transaction.type === 'income' ? 'bg-finance-income/10 text-finance-income' : 'bg-finance-expense/10 text-finance-expense'
                      )}
                    >
                      {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {transaction.paid ? (
                      <CheckCircle2 className="w-5 h-5 text-finance-income mx-auto" />
                    ) : (
                      <XCircle className="w-5 h-5 text-finance-expense mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        'text-sm font-semibold font-mono',
                        transaction.type === 'income' ? 'text-finance-income' : 'text-finance-expense'
                      )}
                    >
                      {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.value)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
