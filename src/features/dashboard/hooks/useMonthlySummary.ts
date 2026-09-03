'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MonthlyPoint } from '@/features/transactions/types';

interface UseMonthlySummaryResult {
  data: MonthlyPoint[];
  isLoading: boolean;
  error: string | null;
  period: string;
  setPeriod: (p: string) => void;
}

export function useMonthlySummary(): UseMonthlySummaryResult {
  const [period, setPeriod] = useState('last6');
  const [data, setData] = useState<MonthlyPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (p: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/monthly-summary?period=${encodeURIComponent(p)}`);
      if (!res.ok) throw new Error(`Erro ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar evolução mensal');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(period);
  }, [fetchSummary, period]);

  return { data, isLoading, error, period, setPeriod };
}
