'use client';

import { useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LazyLoad } from '@/shared/components/LazyLoad';
import { ConfirmDeleteDialog } from '@/shared/components/ConfirmDeleteDialog';
import { InvestmentCard } from '@/features/investments/components/InvestmentCard';
import { InvestmentFormDialog } from '@/features/investments/components/InvestmentFormDialog';
import { useInvestments } from '@/features/investments/hooks/useInvestments';
import type { Investment } from '@/features/investments/validations';

export function InvestmentsSection() {
  const { investments, isLoading, error, create, update, remove } = useInvestments();
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleCreateClick() {
    setEditingInvestment(null);
    setFormOpen(true);
  }

  function handleEditClick(investment: Investment) {
    setEditingInvestment(investment);
    setFormOpen(true);
  }

  async function handleSubmit(input: Parameters<typeof create>[0]) {
    if (editingInvestment) {
      await update(editingInvestment.id, input);
    } else {
      await create(input);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingInvestment) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await remove(deletingInvestment.id);
      setDeletingInvestment(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao excluir investimento');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={handleCreateClick} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo investimento
        </Button>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-md bg-finance-expense/10 text-finance-expense text-sm">
          {error}
        </div>
      )}

      <LazyLoad isReady={!isLoading} message="Carregando investimentos...">
        {investments.length === 0 ? (
          <Card className="p-8">
            <CardContent className="flex flex-col items-center justify-center text-center gap-2">
              <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center mb-2">
                <TrendingUp className="w-8 h-8 text-on-surface-variant" />
              </div>
              <h3 className="text-lg font-semibold text-on-surface">Nenhum investimento cadastrado</h3>
              <p className="text-sm text-on-surface-variant max-w-sm">
                Cadastre seus investimentos para acompanhar sua carteira em um só lugar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {investments.map((investment) => (
              <InvestmentCard
                key={investment.id}
                investment={investment}
                onEdit={handleEditClick}
                onDelete={setDeletingInvestment}
              />
            ))}
          </div>
        )}
      </LazyLoad>

      <InvestmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        investment={editingInvestment}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteDialog
        open={Boolean(deletingInvestment)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingInvestment(null);
            setDeleteError(null);
          }
        }}
        title="Excluir investimento"
        description={
          deleteError ??
          `Tem certeza que deseja excluir "${deletingInvestment?.name}"? Essa ação não pode ser desfeita.`
        }
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
