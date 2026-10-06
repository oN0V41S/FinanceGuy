'use client';

import { useEffect, useRef, useState } from 'react';

const SEARCH_DEBOUNCE_MS = 300;

export interface OpeningBalanceParams {
  quinzenalFilter: 'month' | 'first' | 'second';
  selectedYear: string;
  selectedMonth: string;
  paidFilter: 'all' | 'paid' | 'unpaid';
  typeFilter: 'all' | 'income' | 'expense';
  categoryFilter: string;
  searchFilter: string;
  /** Muda a cada mutation (create/update/delete) para forçar nova busca. */
  mutationKey: number;
}

export interface UseOpeningBalanceReturn {
  /** Saldo acumulado ANTERIOR ao período exibido; null enquanto carrega ou em erro. */
  openingBalance: number | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * URL do saldo inicial: transações anteriores ao 1º dia do período (mês e 1ª
 * quinzena) ou ao dia 16 (2ª quinzena, que herda a 1ª), com os mesmos filtros
 * ativos da lista. Só filtros e data trafegam na URL.
 */
export function buildOpeningBalanceUrl(params: OpeningBalanceParams): string {
  const month = String(params.selectedMonth).padStart(2, '0');
  const day = params.quinzenalFilter === 'second' ? '16' : '01';

  const query = new URLSearchParams({ before: `${params.selectedYear}-${month}-${day}` });
  if (params.typeFilter !== 'all') query.set('type', params.typeFilter);
  if (params.categoryFilter) query.set('category', params.categoryFilter);
  const search = params.searchFilter.trim();
  if (search) query.set('search', search);
  if (params.paidFilter !== 'all') query.set('paid', params.paidFilter === 'paid' ? 'true' : 'false');

  return `/api/transactions/opening-balance?${query.toString()}`;
}

/**
 * Busca o saldo inicial do período para o "Saldo previsto" por dia (issue #30).
 * Hook separado de `useTransactions` para que uma falha aqui nunca derrube a
 * lista: em erro, `openingBalance` fica null e a UI mostra só o total do dia.
 */
export default function useOpeningBalance(params: OpeningBalanceParams): UseOpeningBalanceReturn {
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const previousSearchRef = useRef(params.searchFilter);

  const url = buildOpeningBalanceUrl(params);
  const { mutationKey, searchFilter } = params;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Só a digitação na busca é debounced; demais mudanças disparam na hora.
    const searchChanged = previousSearchRef.current !== searchFilter;
    previousSearchRef.current = searchFilter;

    setIsLoading(true);
    setOpeningBalance(null);
    setError(null);

    async function load() {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error('Erro ao carregar saldo inicial');

        const result = (await response.json()) as { data?: unknown };
        if (typeof result.data !== 'number' || !Number.isFinite(result.data)) {
          throw new Error('Resposta inválida do saldo inicial');
        }

        if (cancelled) return;
        setOpeningBalance(result.data);
      } catch (err) {
        if (cancelled) return;
        setOpeningBalance(null);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (searchChanged) {
      timer = setTimeout(load, SEARCH_DEBOUNCE_MS);
    } else {
      void load();
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [url, mutationKey, searchFilter]);

  return { openingBalance, isLoading, error };
}
