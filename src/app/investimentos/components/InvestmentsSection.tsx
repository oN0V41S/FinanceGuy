'use client';

import { useMemo, useState } from 'react';
import { History, Plus, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LazyLoad } from '@/shared/components/LazyLoad';
import { ConfirmDeleteDialog } from '@/shared/components/ConfirmDeleteDialog';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { InvestmentCard } from '@/features/investments/components/InvestmentCard';
import { InvestmentFormDialog } from '@/features/investments/components/InvestmentFormDialog';
import { PortfolioByCategory, matchesCategoryFilters } from '@/features/investments/components/PortfolioByCategory';
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
  // Filtro por chips do painel (multisseleção): vazio = Todas; senão chaves de categoria ou 'sem-categoria'.
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  const activeInvestments = useMemo(() => investments.filter((i) => i.status !== 'REDEEMED'), [investments]);
  const visibleInvestments = useMemo(() => {
    if (categoryFilter.length === 0) return investments;
    return investments.filter((investment) => matchesCategoryFilters(investment, categoryFilter, categories));
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

  const showPortfolio = isLoading || activeInvestments.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <Button onClick={handleCreateClick} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo investimento
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={showHistory ? 'Ocultar histórico de investimentos' : 'Ver histórico de investimentos'}
          aria-pressed={showHistory}
          title={showHistory ? 'Ocultar histórico' : 'Ver histórico'}
          onClick={() => setShowHistory((v) => !v)}
        >
          <History className="w-4 h-4" aria-hidden="true" />
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

      {/* Desktop (lg+): carteira à esquerda, lista de investimentos à direita. Mobile: carteira em cima. */}
      <div
        className={cn(
          'flex flex-col gap-4',
          showPortfolio && 'lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-6'
        )}
      >
        {showPortfolio && (
          <div className="lg:sticky lg:top-4">
            <PortfolioByCategory
              investments={activeInvestments}
              categories={categories}
              isLoading={isLoading || isCategoriesLoading}
              categoriesError={categoriesError}
              selectedKeys={categoryFilter}
              onSelectionChange={setCategoryFilter}
            />
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-4">
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
              <p className="text-sm text-on-surface-variant">Nenhum investimento nas categorias selecionadas.</p>
              <Button variant="outline" size="sm" onClick={() => setCategoryFilter([])}>
                Ver todos
              </Button>
            </div>
          )
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
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

      {showHistory && <InvestmentHistory refreshKey={historyKey} />}
        </div>
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
