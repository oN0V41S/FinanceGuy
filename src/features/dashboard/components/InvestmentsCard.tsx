'use client';

import Link from 'next/link';
import { TrendingUp, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvestments } from '@/features/investments/hooks/useInvestments';

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function InvestmentsCard() {
  const { investments, isLoading } = useInvestments();
  const total = investments.reduce((sum, investment) => sum + investment.value, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Investimentos</CardTitle>
        {investments.length > 0 && (
          <Link
            href="/investimentos"
            className="text-sm text-primary hover:underline"
          >
            Ver todos
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : investments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <TrendingUp className="w-12 h-12 text-on-surface-variant" />
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold text-on-surface">
                Nenhum investimento cadastrado
              </p>
              <p className="text-sm text-on-surface-variant max-w-xs">
                Cadastre seus investimentos para acompanhar sua carteira em um só lugar
              </p>
            </div>
            <Link href="/investimentos" className={buttonVariants({ className: 'mt-2' })}>
              <Plus className="w-4 h-4" />
              Criar investimento
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-semibold font-mono text-on-surface">
              {formatCurrency(total)}
            </p>
            <p className="text-sm text-on-surface-variant">
              {investments.length} {investments.length === 1 ? 'investimento' : 'investimentos'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
