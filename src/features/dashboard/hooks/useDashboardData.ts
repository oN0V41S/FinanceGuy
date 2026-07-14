'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Transaction, FinancialSummary } from '@/features/transactions/validations';
import type { FortnightValue } from '@/features/dashboard/components/FortnightFilter';

interface DashboardData {
  recentTransactions: Transaction[];
  summary: FinancialSummary;
  isLoading: boolean;
  isSummaryLoading: boolean;
  error: string | null;
  refresh: () => void;
}

function buildDateRange(month?: string, year?: string, fortnight?: FortnightValue) {
  if (!month || !year) return null;
  const m = month.padStart(2, '0');
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();

  if (fortnight === 'first') {
    return { startDate: `${year}-${m}-01`, endDate: `${year}-${m}-15` };
  }
  if (fortnight === 'second') {
    return { startDate: `${year}-${m}-16`, endDate: `${year}-${m}-${String(lastDay).padStart(2, '0')}` };
  }
  // 'all' (default) — full month
  return { startDate: `${year}-${m}-01`, endDate: `${year}-${m}-${String(lastDay).padStart(2, '0')}` };
}

async function fetchSummary(month?: string, year?: string, fortnight?: FortnightValue): Promise<FinancialSummary> {
  const range = buildDateRange(month, year, fortnight);
  if (!range) return { income: 0, expense: 0, balance: 0 };

  const params = new URLSearchParams(range);
  const response = await fetch(`/api/transactions?${params.toString()}`);
  if (!response.ok) throw new Error('Erro ao carregar dados');
  const result = await response.json();
  return result.summary || { income: 0, expense: 0, balance: 0 };
}

export function useDashboardData(
  month?: string,
  year?: string,
  fortnight?: FortnightValue
): DashboardData {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({ income: 0, expense: 0, balance: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setIsSummaryLoading(true);
      setError(null);

      try {
        // 1. Full-month call — always for recentTransactions
        const fullMonthRange = buildDateRange(month, year, 'all');
        if (!fullMonthRange) {
          setIsLoading(false);
          setIsSummaryLoading(false);
          return;
        }

        const params = new URLSearchParams(fullMonthRange);
        const fullMonthResponse = await fetch(`/api/transactions?${params.toString()}`);
        if (!fullMonthResponse.ok) throw new Error('Erro ao carregar dados');
        const fullMonthResult = await fullMonthResponse.json();

        setTransactions(fullMonthResult.data || []);
        setIsLoading(false);

        // 2. Fortnight-filtered summary call (only when differing from full month)
        if (fortnight && fortnight !== 'all') {
          const summaryData = await fetchSummary(month, year, fortnight);
          setSummary(summaryData);
        } else {
          setSummary(fullMonthResult.summary || { income: 0, expense: 0, balance: 0 });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
        setIsSummaryLoading(false);
      }
    }

    fetchData();
  }, [month, year, fortnight, refreshKey]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  return { recentTransactions, summary, isLoading, isSummaryLoading, error, refresh };
}
