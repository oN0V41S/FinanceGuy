'use client';

import { Pencil, Trash2, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Goal } from '@/features/goals/validations';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const currentValue = goal.currentValue ?? 0;
  const percentage = goal.targetValue > 0 ? Math.round((currentValue / goal.targetValue) * 100) : 0;
  const isComplete = percentage >= 100;

  return (
    <Card data-testid="goal-card">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary/10 shrink-0">
            <Target className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <CardTitle className="text-base">{goal.name}</CardTitle>
            {goal.deadlineLabel && (
              <p className="text-sm text-on-surface-variant mt-1">{goal.deadlineLabel}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Editar meta"
            onClick={() => onEdit(goal)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Excluir meta"
            onClick={() => onDelete(goal)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-semibold font-mono text-on-surface">
            {formatCurrency(currentValue)}
          </p>
          <p className="text-sm text-on-surface-variant">de {formatCurrency(goal.targetValue)}</p>
        </div>
        <Progress value={percentage} />
        <p
          className={`text-xs font-medium ${isComplete ? 'text-finance-income' : 'text-on-surface-variant'}`}
        >
          {percentage}% concluído
        </p>
      </CardContent>
    </Card>
  );
}
