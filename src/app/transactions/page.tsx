'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, LayoutDashboard, ArrowLeftRight, Settings, X, Plus } from 'lucide-react';
import { HeaderLayout } from '@/features/dashboard/components/HeaderLayout';
import { MobileNavBar } from '@/features/dashboard/components/MobileNavBar';
import { SummaryCard } from '@/features/dashboard/components/SummaryCard';
import { EmptyState } from '@/features/dashboard/components/EmptyState';
import { LazyLoad } from '@/shared/components/LazyLoad';
import FilterControls from '@/features/transactions/components/FilterControls';
import TransactionsTable from '@/features/transactions/components/TransactionsTable';
import TransactionModal from '@/features/transactions/components/TransactionModal';
import useTransactions from '@/features/transactions/hooks/useTransactions';
import type { TransactionFormData } from '@/features/transactions/types';
import { cn } from '@/lib/utils';

const navigationItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Transações', href: '/transactions', icon: ArrowLeftRight },
];

const footerItem = { label: 'Configurações', href: '/settings', icon: Settings };

export default function TransactionsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  const {
    transactions,
    summary,
    isLoading,
    error,
    filterPeriod,
    setFilterPeriod,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    selectedFortnight,
    setSelectedFortnight,
    paidFilter,
    setPaidFilter,
    refresh,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    isModalOpen,
    editingTransaction,
    openCreateModal,
    openEditModal,
    closeModal,
  } = useTransactions();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const handleOpenModal = (transaction: Parameters<typeof openEditModal>[0]) => {
    openEditModal(transaction);
  };

  const handleDeleteRequest = (id: string) => {
    deleteTransaction(id);
  };

  const handleSubmit = async (data: TransactionFormData) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, data);
    } else {
      await createTransaction(data);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* Drawer overlay backdrop */}
      {drawerOpen && (
        <div
          data-testid="drawer-overlay"
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72',
          'bg-surface-container flex flex-col',
          'transition-transform duration-200 ease-out',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <span className="font-sans font-semibold text-xl text-primary">
              FinanceGuy
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center justify-center p-2 rounded-md text-neutral hover:bg-surface-container-low transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {navigationItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
                  active
                    ? 'text-primary bg-surface-container-low'
                    : 'text-neutral hover:bg-surface-container-low',
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5',
                    active ? 'text-primary' : 'text-neutral',
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-medium',
                    active ? 'text-primary' : 'text-neutral',
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 pt-0">
          <Link
            href={footerItem.href}
            onClick={() => setDrawerOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
              isActive(footerItem.href)
                ? 'text-primary bg-surface-container-low'
                : 'text-neutral hover:bg-surface-container-low',
            )}
          >
            <Settings
              className={cn(
                'w-5 h-5',
                isActive(footerItem.href) ? 'text-primary' : 'text-neutral',
              )}
            />
            <span
              className={cn(
                'text-sm font-medium',
                isActive(footerItem.href) ? 'text-primary' : 'text-neutral',
              )}
            >
              {footerItem.label}
            </span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col pb-16 md:pb-0">
        <HeaderLayout
          isDrawerOpen={drawerOpen}
          onToggleDrawer={() => setDrawerOpen(!drawerOpen)}
        />

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

            {/* Page Title + Filters + New Transaction Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h1 className="text-2xl font-semibold text-on-surface font-sans">
                Transações
              </h1>
              <div className="flex items-center gap-2">
                <FilterControls
                  filterPeriod={filterPeriod}
                  onFilterPeriodChange={setFilterPeriod}
                  selectedYear={selectedYear}
                  onYearChange={setSelectedYear}
                  selectedMonth={selectedMonth}
                  onMonthChange={setSelectedMonth}
                  selectedFortnight={selectedFortnight}
                  onFortnightChange={setSelectedFortnight}
                  paidFilter={paidFilter}
                  onPaidFilterChange={setPaidFilter}
                />
                <button
                  type="button"
                  data-testid="btn-new-transaction"
                  onClick={openCreateModal}
                  className="h-12 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-medium transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Nova Transação
                </button>
              </div>
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

            {/* Transactions Table / Empty State */}
            <LazyLoad isReady={!isLoading} message="Carregando transações...">
              {!error && transactions.length === 0 ? (
                <EmptyState />
              ) : transactions.length > 0 ? (
                <TransactionsTable
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
        <Plus className="w-6 h-6" />
      </button>

      {/* Mobile Navigation Bar */}
      <MobileNavBar />

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        transaction={editingTransaction}
        onSave={handleSubmit}
      />
    </div>
  );
}
