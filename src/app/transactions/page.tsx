'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { HeaderLayout } from '@/features/dashboard/components/HeaderLayout';
import { MobileNavBar } from '@/features/dashboard/components/MobileNavBar';
import { SummaryCard } from '@/features/dashboard/components/SummaryCard';
import { EmptyState } from '@/features/dashboard/components/EmptyState';
import { LazyLoad } from '@/shared/components/LazyLoad';
import FilterControls from '@/features/transactions/components/FilterControls';
import CardTransaction from '@/features/transactions/components/CardTransaction';
import TransactionModal from '@/features/transactions/components/TransactionModal';
import ConfirmDeleteModal from '@/features/transactions/components/ConfirmDeleteModal';
import useTransactions from '@/features/transactions/hooks/useTransactions';
import type { TransactionFormData } from '@/features/transactions/types';

export default function TransactionsPage() {
  const {
    transactions,
    summary,
    isLoading,
    error,
    quinzenalFilter,
    setQuinzenalFilter,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    paidFilter,
    setPaidFilter,
    typeFilter,
    setTypeFilter,
    searchFilter,
    setSearchFilter,
    categoryFilter,
    setCategoryFilter,
    refresh,
    mutationKey,
    createTransaction,
    updateTransaction,
    updateFutureTransactions,
    isModalOpen,
    editingTransaction,
    openCreateModal,
    openEditModal,
    closeModal,
    isConfirmModalOpen,
    deletingTransaction,
    openConfirmModal,
    closeConfirmModal,
    confirmDeleteTransaction,
  } = useTransactions();

  const handleOpenModal = (transaction: Parameters<typeof openEditModal>[0]) => {
    openEditModal(transaction);
  };

  const handleDeleteRequest = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (tx) openConfirmModal(tx);
  };

  const handleSubmit = async (data: TransactionFormData) => {
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, data);
      } else {
        await createTransaction(data);
      }
      closeModal();
    } catch (error) {
      throw error;
    }
  };

  // Edição de transação recorrente propagada para todas as parcelas futuras.
  const handleSubmitFuture = async (data: TransactionFormData) => {
    if (!editingTransaction) return;
    try {
      await updateFutureTransactions(editingTransaction.id, data);
      closeModal();
    } catch (error) {
      throw error;
    }
  };

  // Transação em confirmação é recorrente quando pertence a uma série.
  const isDeletingRecurring = Boolean(
    deletingTransaction?.parent_transaction_id ||
      deletingTransaction?.is_recurring ||
      deletingTransaction?.total_installments,
  );

  return (
    <div className="min-h-dvh bg-background">
      {/* Main Content Area */}
      <div className="flex flex-col pb-16 md:pb-0">
        <HeaderLayout />

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Error banner */}
            {error && (
              <div
                className="mb-4 p-4 rounded-md bg-red-500/10 text-red-500 text-sm"
                role="alert"
                data-testid="error-banner"
              >
                <div className="flex items-center justify-between">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={refresh}
                    className="ml-4 px-3 py-1 rounded-md bg-red-500/20 hover:bg-red-500/30 transition-colors text-sm font-medium"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            )}

            {/* Page Title */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-on-surface font-sans">
                  Transações
                </h1>
                <p
                  data-testid="page-subtitle"
                  className="text-sm text-muted-foreground capitalize mt-0.5"
                >
                  {new Date(Number(selectedYear), Number(selectedMonth) - 1, 1)
                    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              {/* Desktop button — visible on sm+ only */}
              <button
                type="button"
                data-testid="btn-new-transaction-desktop"
                onClick={openCreateModal}
                className="hidden sm:flex h-12 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-medium transition-colors items-center gap-2"
              >
                <Plus className="w-5 h-5" data-testid="icon-plus" />
                Nova Transação
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <SummaryCard
                label="Entradas"
                value={summary.income}
                type="income"
                isLoading={isLoading}
              />
              <SummaryCard
                label="Saídas"
                value={summary.expense}
                type="expense"
                isLoading={isLoading}
              />
              <SummaryCard
                label="Saldo"
                value={summary.balance}
                type="balance"
                isLoading={isLoading}
              />
            </div>

            {/* Filters */}
            <div className="mb-4">
              <FilterControls
                quinzenalFilter={quinzenalFilter}
                onQuinzenalFilterChange={setQuinzenalFilter}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                paidFilter={paidFilter}
                onPaidFilterChange={setPaidFilter}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                searchFilter={searchFilter}
                onSearchChange={setSearchFilter}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                yearsRefreshTrigger={mutationKey}
              />
            </div>

            {/* Mobile button — below filters, visible on mobile only */}
            <button
              type="button"
              data-testid="btn-new-transaction-mobile"
              onClick={openCreateModal}
              className="sm:hidden w-full h-12 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-medium transition-colors flex items-center justify-center gap-2 mb-6"
            >
              <Plus className="w-5 h-5" data-testid="icon-plus" />
              Nova Transação
            </button>

            {/* Transactions Cards / Empty State */}
            <LazyLoad isReady={!isLoading} message="Carregando transações...">
              {!error && transactions.length === 0 ? (
                <EmptyState />
              ) : transactions.length > 0 ? (
                <CardTransaction
                  transactions={transactions}
                  isLoading={isLoading}
                  onEdit={handleOpenModal}
                  onDelete={handleDeleteRequest}
                />
              ) : null}
            </LazyLoad>
          </div>
        </main>
      </div>

      {/* Mobile FAB */}
      <button
        type="button"
        data-testid="fab-add-transaction"
        onClick={openCreateModal}
        className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label="Adicionar transação"
      >
        <Plus className="w-6 h-6" data-testid="icon-plus" />
      </button>

      {/* Mobile Navigation Bar */}
      <MobileNavBar />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        transaction={editingTransaction}
        onSave={handleSubmit}
        onSaveFuture={handleSubmitFuture}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={isConfirmModalOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmDeleteTransaction}
        isRecurring={isDeletingRecurring}
      />
    </div>
  );
}
