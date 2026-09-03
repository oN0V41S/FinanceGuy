'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, LayoutDashboard, ArrowLeftRight, Settings, X } from 'lucide-react';
import { HeaderLayout } from '@/features/dashboard/components/HeaderLayout';
import { MobileNavBar } from '@/features/dashboard/components/MobileNavBar';
import { SummaryCard } from '@/features/dashboard/components/SummaryCard';
import { MonthFilter } from '@/features/dashboard/components/MonthFilter';
import { MonthlyChart } from '@/features/dashboard/components/MonthlyChart';
import { CategoryBreakdown } from '@/features/dashboard/components/CategoryBreakdown';
import { GoalsCard } from '@/features/dashboard/components/GoalsCard';
import { AIInsightCard } from '@/features/dashboard/components/AIInsightCard';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import { useMonthlySummary } from '@/features/dashboard/hooks/useMonthlySummary';
import { LazyLoad } from '@/shared/components/LazyLoad';
import { cn } from '@/lib/utils';

const navigationItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Transações', href: '/transactions', icon: ArrowLeftRight },
];

const footerItem = { label: 'Configurações', href: '/settings', icon: Settings };

export default function DashboardPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  const { recentTransactions, summary, isLoading, error } = useDashboardData(
    selectedMonth,
    selectedYear,
    'all',
  );

  const { data: monthlyData, isLoading: chartLoading, period, setPeriod } = useMonthlySummary();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-dvh bg-background">
      {drawerOpen && (
        <div
          data-testid="drawer-overlay"
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

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
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-semibold text-xl text-primary">FinanceGuy</span>
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
                <Icon className={cn('w-5 h-5', active ? 'text-primary' : 'text-neutral')} />
                <span className={cn('text-sm font-medium', active ? 'text-primary' : 'text-neutral')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

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
            <Settings className={cn('w-5 h-5', isActive(footerItem.href) ? 'text-primary' : 'text-neutral')} />
            <span className={cn('text-sm font-medium', isActive(footerItem.href) ? 'text-primary' : 'text-neutral')}>
              {footerItem.label}
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex flex-col pb-16 md:pb-0">
        <HeaderLayout onOpenMobileDrawer={() => setDrawerOpen(true)} />

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {error && (
              <div className="mb-4 p-4 rounded-md bg-red-500/10 text-red-500 text-sm" role="alert">
                {error}
              </div>
            )}

            {/* Page title + month filter + link */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-on-surface font-display">Visão Geral</h1>
                <p className="text-sm text-on-surface-variant mt-1">
                  {new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1).toLocaleDateString('pt-BR', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <MonthFilter
                  value={selectedMonth}
                  onChange={(m) => m && setSelectedMonth(m)}
                  year={selectedYear}
                  onYearChange={setSelectedYear}
                />
                <Link
                  href="/transactions"
                  className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors px-3 py-2 rounded-md border border-outline-variant/30 hover:border-outline-variant"
                >
                  Ver transações
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <SummaryCard label="Entradas" value={summary.income} type="income" isLoading={isLoading} />
              <SummaryCard label="Saídas" value={summary.expense} type="expense" isLoading={isLoading} />
              <SummaryCard label="Saldo" value={summary.balance} type="balance" isLoading={isLoading} />
            </div>

            {/* Analysis Grid 2×2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <LazyLoad isReady={!chartLoading} message="Carregando evolução mensal...">
                <MonthlyChart
                  data={monthlyData}
                  period={period}
                  onPeriodChange={setPeriod}
                />
              </LazyLoad>
              <LazyLoad isReady={!isLoading} message="Carregando categorias...">
                <CategoryBreakdown transactions={recentTransactions} />
              </LazyLoad>
              <GoalsCard />
              <AIInsightCard />
            </div>
          </div>
        </main>
      </div>

      <MobileNavBar />
    </div>
  );
}
