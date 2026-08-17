'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  readCache,
  writeCache,
} from '@/shared/hooks/useLocalStorageCache';
import type { Transaction, FinancialSummary } from '@/features/transactions/validations';
import type { FortnightValue } from '@/features/dashboard/components/FortnightFilter';

const DASHBOARD_CACHE_PREFIX = 'financeguy:cache:dashboard:';
const DASHBOARD_TTL_MS = 30 * 60 * 1000; // 30 minutos

interface DashboardSnapshot {
  data: Transaction[];
  summary: FinancialSummary;
}

/**
 * Validação manual de shape (A02/defense-in-depth): um snapshot com envelope
 * válido mas shape inválido (ex: `{ data: 'string', summary: null }`) NÃO deve
 * ser exibido como stale — é tratado como ausente, sem lançar.
 */
function isValidDashboardSnapshot(snapshot: unknown): snapshot is DashboardSnapshot {
  if (typeof snapshot !== 'object' || snapshot === null) return false;
  const candidate = snapshot as Record<string, unknown>;
  return (
    Array.isArray(candidate.data) &&
    candidate.summary !== null &&
    typeof candidate.summary === 'object'
  );
}

interface DashboardData {
  recentTransactions: Transaction[];
  summary: FinancialSummary;
  isLoading: boolean;
  isFetching: boolean;
  isSummaryLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hash determinístico dos filtros do dashboard — usado na chave do snapshot
 * em localStorage (`financeguy:cache:dashboard:{hash}`).
 */
export function hashDashboardFilters(
  month: string | undefined,
  year: string | undefined,
  fortnight: FortnightValue | undefined,
): string {
  return JSON.stringify([month ?? null, year ?? null, fortnight ?? null]);
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
  // Issue #9: `cache: 'no-store'` — o GET responde com `Cache-Control:
  // private, max-age=300`; sem no-store o browser serviria dados velhos do
  // cache HTTP após mutations em outra área.
  const response = await fetch(`/api/transactions?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Erro ao carregar dados');
  const result = await response.json();
  return result.summary || { income: 0, expense: 0, balance: 0 };
}

export function useDashboardData(
  month?: string,
  year?: string,
  fortnight?: FortnightValue
): DashboardData {
  // Chave do snapshot — memoizada para estabilidade entre renders.
  // O prefixo `financeguy:cache:` é adicionado pelo utilitário readCache/writeCache.
  const cacheKey = useMemo(
    () => `dashboard:${hashDashboardFilters(month, year, fortnight)}`,
    [month, year, fortnight],
  );

  // Lazy initializers: leem o snapshot SÍNCRONAMENTE no mount, garantindo
  // que dados stale apareçam no primeiro render (isLoading=false com stale).
  // Snapshot com shape inválido é tratado como ausente.
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const snapshot = readCache<DashboardSnapshot>(cacheKey);
    return isValidDashboardSnapshot(snapshot) ? snapshot.data : [];
  });
  const [summary, setSummary] = useState<FinancialSummary>(() => {
    const snapshot = readCache<DashboardSnapshot>(cacheKey);
    return isValidDashboardSnapshot(snapshot)
      ? snapshot.summary
      : {
          income: 0,
          expense: 0,
          balance: 0,
        };
  });
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !isValidDashboardSnapshot(readCache<DashboardSnapshot>(cacheKey)),
  );
  const [isFetching, setIsFetching] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    let hadStale = false;

    // Snapshot do cache: se existe, é fresco e tem shape válido, exibe
    // imediatamente e roda o fetch em background (isFetching). Caso contrário,
    // mostra skeleton (shape inválido é tratado como ausente).
    const snapshot = readCache<DashboardSnapshot>(cacheKey);
    if (isValidDashboardSnapshot(snapshot)) {
      hadStale = true;
      setTransactions(snapshot.data);
      setSummary(snapshot.summary);
      setIsLoading(false);
      setIsFetching(true);
    } else {
      setIsLoading(true);
      setIsFetching(false);
    }
    setError(null);
    setIsSummaryLoading(true);

    async function fetchData() {
      try {
        // 1. Full-month call — always for recentTransactions
        const fullMonthRange = buildDateRange(month, year, 'all');
        if (!fullMonthRange) {
          setIsLoading(false);
          setIsSummaryLoading(false);
          return;
        }

        const params = new URLSearchParams(fullMonthRange);
        // Issue #9: `cache: 'no-store'` — nunca servir o GET do cache HTTP
        // do browser (o server responde `max-age=300`); dados frescos sempre.
        const fullMonthResponse = await fetch(`/api/transactions?${params.toString()}`, {
          cache: 'no-store',
        });
        if (!fullMonthResponse.ok) throw new Error('Erro ao carregar dados');
        const fullMonthResult = await fullMonthResponse.json();

        if (cancelled) return;

        const nextData = fullMonthResult.data || [];
        setTransactions(nextData);
        setIsLoading(false);

        // 2. Fortnight-filtered summary call (only when differing from full month)
        if (fortnight && fortnight !== 'all') {
          setIsSummaryLoading(true);
          const summaryData = await fetchSummary(month, year, fortnight);
          if (cancelled) return;
          setSummary(summaryData);
          writeCache(cacheKey, { data: nextData, summary: summaryData }, DASHBOARD_TTL_MS);
        } else {
          const nextSummary = fullMonthResult.summary || { income: 0, expense: 0, balance: 0 };
          setSummary(nextSummary);
          writeCache(cacheKey, { data: nextData, summary: nextSummary }, DASHBOARD_TTL_MS);
        }
      } catch (err) {
        if (cancelled) return;

        if (hadStale) {
          // Mantém os dados stale na tela com mensagem suave de offline.
          setError('Você está offline. Mostrando dados salvos.');
        } else {
          setError(err instanceof Error ? err.message : 'Erro desconhecido');
          setTransactions([]);
          setSummary({ income: 0, expense: 0, balance: 0 });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsFetching(false);
          setIsSummaryLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, month, year, fortnight, refreshKey]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  return { recentTransactions, summary, isLoading, isFetching, isSummaryLoading, error, refresh };
}