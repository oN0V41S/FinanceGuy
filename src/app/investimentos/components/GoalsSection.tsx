'use client';

import { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LazyLoad } from '@/shared/components/LazyLoad';
import { ConfirmDeleteDialog } from '@/shared/components/ConfirmDeleteDialog';
import { GoalCard } from '@/features/goals/components/GoalCard';
import { GoalFormDialog } from '@/features/goals/components/GoalFormDialog';
import { useGoals } from '@/features/goals/hooks/useGoals';
import type { Goal } from '@/features/goals/validations';

export function GoalsSection() {
  const { goals, isLoading, error, create, update, remove } = useGoals();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleCreateClick() {
    setEditingGoal(null);
    setFormOpen(true);
  }

  function handleEditClick(goal: Goal) {
    setEditingGoal(goal);
    setFormOpen(true);
  }

  async function handleSubmit(input: Parameters<typeof create>[0]) {
    if (editingGoal) {
      await update(editingGoal.id, input);
    } else {
      await create(input);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingGoal) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await remove(deletingGoal.id);
      setDeletingGoal(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao excluir meta');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={handleCreateClick} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova meta
        </Button>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-md bg-finance-expense/10 text-finance-expense text-sm">
          {error}
        </div>
      )}

      <LazyLoad isReady={!isLoading} message="Carregando metas...">
        {goals.length === 0 ? (
          <Card className="p-8">
            <CardContent className="flex flex-col items-center justify-center text-center gap-2">
              <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-2">
                <Target className="w-8 h-8 text-on-surface-variant" />
              </div>
              <h3 className="text-lg font-semibold text-on-surface">Nenhuma meta cadastrada</h3>
              <p className="text-sm text-on-surface-variant max-w-sm">
                Defina metas financeiras para acompanhar seu progresso mês a mês.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onEdit={handleEditClick} onDelete={setDeletingGoal} />
            ))}
          </div>
        )}
      </LazyLoad>

      <GoalFormDialog open={formOpen} onOpenChange={setFormOpen} goal={editingGoal} onSubmit={handleSubmit} />

      <ConfirmDeleteDialog
        open={Boolean(deletingGoal)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingGoal(null);
            setDeleteError(null);
          }
        }}
        title="Excluir meta"
        description={
          deleteError ??
          `Tem certeza que deseja excluir "${deletingGoal?.name}"? Essa ação não pode ser desfeita.`
        }
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
