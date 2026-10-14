'use client';

import { useCallback, useEffect, useState } from 'react';
import type { InvestmentHistoryEntry } from '@/features/investments/history.types';

interface HistoryItem extends Omit<InvestmentHistoryEntry, 'date'> {
  date: string;
}

interface UseInvestmentHistoryResult {
  entries: HistoryItem[];
  summaries: string[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useInvestmentHistory(): UseInvestmentHistoryResult {
  const [entries, setEntries] = useState<HistoryItem[]>([]);
  const [summaries, setSummaries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/investments/history');
        if (!response.ok) throw new Error('Não foi possível carregar o histórico agora.');
        const result = await response.json();
        if (cancelled) return;
        setEntries(Array.isArray(result.data?.entries) ? result.data.entries : []);
        setSummaries(Array.isArray(result.data?.summaries) ? result.data.summaries : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { entries, summaries, isLoading, error, refresh };
}
