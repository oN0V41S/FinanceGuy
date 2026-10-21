'use client';

import { useMemo, useState } from 'react';
import { History, Plus, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LazyLoad } from '@/shared/components/LazyLoad';
import { ConfirmDeleteDialog } from '@/shared/components/ConfirmDeleteDialog';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { InvestmentCard } from '@/features/investments/components/InvestmentCard';
import { InvestmentFormDialog } from '@/features/investments/components/InvestmentFormDialog';
import { PortfolioByCategory, matchesCategoryFilter } from '@/features/investments/components/PortfolioByCategory';
import { RedeemDialog } from '@/features/investments/components/RedeemDialog';
import { InvestmentHistory } from '@/features/investments/components/InvestmentHistory';
import { useInvestments } from '@/features/investments/hooks/useInvestments';
import { useMarketPortfolio } from '@/features/investments/hooks/useMarketPortfolio';
import type { Investment } from '@/features/investments/validations';

export function InvestmentsSection() {
  const { investments, isLoading, error, create, update, remove, refresh } = useInvestments();
  const { categories, isLoading: isCategoriesLoading, error: categoriesError } = useCategories({
    scope: 'investment',
  });
  const { byId: portfolioById, isLoading: isQuotesLoading, error: quotesError, refresh: refreshQuotes } =
    useMarketPortfolio(investments);
  const [redeemingInvestment, setRedeemingInvestment] = useState<Investment | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Filtro por chip do painel: null = Todas; senão chave da categoria ou 'sem-categoria'.
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const activeInvestments = useMemo(() => investments.filter((i) => i.status !== 'REDEEMED'), [investments]);
  const visibleInvestments = useMemo(() => {
    if (categoryFilter === null) return investments;
    return investments.filter((investment) => matchesCategoryFilter(investment, categoryFilter, categories));
  }, [investments, categories, categoryFilter]);

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
      setHistoryKey((k) => k + 1);
    }
  }

  function handleRedeemed() {
    refresh();
    refreshQuotes();
    setHistoryKey((k) => k + 1);
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

      {quotesError && (
        <div role="status" className="p-3 rounded-md bg-surface-container-low text-on-surface-variant text-sm">
          {quotesError} Seus investimentos continuam salvos.
        </div>
      )}

      {(isLoading || activeInvestments.length > 0) && (
        <PortfolioByCategory
          investments={activeInvestments}
          categories={categories}
          isLoading={isLoading || isCategoriesLoading}
          categoriesError={categoriesError}
          selectedKey={categoryFilter}
          onSelect={setCategoryFilter}
        />
      )}

      <LazyLoad isReady={!isLoading} message="Carregando investimentos...">
        {visibleInvestments.length === 0 ? (
          investments.length === 0 ? (
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
            <div className="flex flex-col items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container p-8 text-center">
              <p className="text-sm text-on-surface-variant">Nenhum investimento nesta categoria.</p>
              <Button variant="outline" size="sm" onClick={() => setCategoryFilter(null)}>
                Ver todos
              </Button>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleInvestments.map((investment) => (
              <InvestmentCard
                key={investment.id}
                investment={investment}
                portfolio={portfolioById[investment.id]}
                isQuoteLoading={isQuotesLoading}
                onEdit={handleEditClick}
                onDelete={setDeletingInvestment}
                onRedeem={setRedeemingInvestment}
              />
            ))}
          </div>
        )}
      </LazyLoad>

      <div className="flex flex-col gap-3">
        <Button variant="outline" className="self-start gap-2" onClick={() => setShowHistory((v) => !v)}>
          <History className="w-4 h-4" />
          {showHistory ? 'Ocultar histórico' : 'Ver histórico de investimentos'}
        </Button>
        {showHistory && <InvestmentHistory refreshKey={historyKey} />}
      </div>

      <RedeemDialog
        open={Boolean(redeemingInvestment)}
        onOpenChange={(open) => {
          if (!open) setRedeemingInvestment(null);
        }}
        investment={redeemingInvestment}
        onRedeemed={handleRedeemed}
      />

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
