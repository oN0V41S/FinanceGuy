'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HeaderLayout } from '@/features/dashboard/components/HeaderLayout';
import { MobileNavBar } from '@/features/dashboard/components/MobileNavBar';
import { SummaryCard } from '@/features/dashboard/components/SummaryCard';
import { MonthFilter } from '@/features/dashboard/components/MonthFilter';
import { MonthlyChart } from '@/features/dashboard/components/MonthlyChart';
import { CategoryBreakdown } from '@/features/dashboard/components/CategoryBreakdown';
import { InvestmentsGoalsCard } from '@/features/dashboard/components/InvestmentsGoalsCard';
import { AIInsightCard } from '@/features/dashboard/components/AIInsightCard';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';
import { useMonthlySummary } from '@/features/dashboard/hooks/useMonthlySummary';
import { LazyLoad } from '@/shared/components/LazyLoad';

export default function DashboardPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  const { recentTransactions, summary, isLoading, error } = useDashboardData(
    selectedMonth,
    selectedYear,
    'all',
  );

  const { data: monthlyData, isLoading: chartLoading, semester, setSemester } = useMonthlySummary(selectedYear);

  return (
    <div className="min-h-dvh bg-background">
      <div className="flex flex-col pb-16 md:pb-0">
        <HeaderLayout />

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
                  semester={semester}
                  onSemesterChange={setSemester}
                />
              </LazyLoad>
              <LazyLoad isReady={!isLoading} message="Carregando categorias...">
                <CategoryBreakdown transactions={recentTransactions} />
              </LazyLoad>
              <InvestmentsGoalsCard />
              <AIInsightCard />
            </div>
          </div>
        </main>
      </div>

      <MobileNavBar />
    </div>
  );
}
