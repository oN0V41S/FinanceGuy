'use client';

import Link from 'next/link';
import { TrendingUp, Target, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useInvestments } from '@/features/investments/hooks/useInvestments';
import { useGoals } from '@/features/goals/hooks/useGoals';

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function InvestmentsSummary() {
  const { investments, isLoading } = useInvestments();
  const total = investments.reduce((sum, investment) => sum + investment.value, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-on-surface">Investimentos</h3>
        {investments.length > 0 && (
          <Link href="/investimentos" className="text-sm text-primary hover:underline">
            Ver todos
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      ) : investments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <TrendingUp className="w-10 h-10 text-on-surface-variant" />
          <p className="text-sm font-semibold text-on-surface">Nenhum investimento cadastrado</p>
          <Link href="/investimentos" className={buttonVariants({ size: 'sm' })}>
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
    </div>
  );
}

function GoalsSummary() {
  const { goals, isLoading } = useGoals();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-on-surface">Metas Financeiras</h3>
        {goals.length > 0 && (
          <Link href="/investimentos" className="text-sm text-primary hover:underline">
            Ver todas
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <Target className="w-10 h-10 text-on-surface-variant" />
          <p className="text-sm font-semibold text-on-surface">Nenhuma meta cadastrada</p>
          <Link href="/investimentos" className={buttonVariants({ size: 'sm' })}>
            <Plus className="w-4 h-4" />
            Criar meta
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {goals.slice(0, 2).map((goal) => {
            const currentValue = goal.currentValue ?? 0;
            const percentage =
              goal.targetValue > 0 ? Math.round((currentValue / goal.targetValue) * 100) : 0;
            return (
              <div key={goal.id} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-on-surface">{goal.name}</p>
                  <p className="text-xs text-on-surface-variant">
                    {formatCurrency(currentValue)} de {formatCurrency(goal.targetValue)}
                  </p>
                </div>
                <Progress value={percentage} />
                <p
                  className={
                    percentage >= 100
                      ? 'text-xs font-medium text-finance-income'
                      : 'text-xs font-medium text-on-surface-variant'
                  }
                >
                  {percentage}% concluído
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function InvestmentsGoalsCard() {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:divide-x sm:divide-outline-variant/20">
        <InvestmentsSummary />
        <div className="sm:pl-6">
          <GoalsSummary />
        </div>
      </CardContent>
    </Card>
  );
}
