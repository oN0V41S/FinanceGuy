'use client';

import Link from 'next/link';
import { Target, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useGoals } from '@/features/goals/hooks/useGoals';

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function GoalsCard() {
  const { goals, isLoading } = useGoals();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Metas Financeiras</CardTitle>
        {goals.length > 0 && (
          <Link
            href="/investimentos"
            className="text-sm text-primary hover:underline"
          >
            Ver todas
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <Target className="w-12 h-12 text-on-surface-variant" />
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold text-on-surface">
                Nenhuma meta cadastrada
              </p>
              <p className="text-sm text-on-surface-variant max-w-xs">
                Defina metas financeiras para acompanhar seu progresso mês a mês
              </p>
            </div>
            <Link href="/investimentos" className={buttonVariants({ className: 'mt-2' })}>
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
      </CardContent>
    </Card>
  );
}
