'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  readCache,
  writeCache,
  clearCacheByPrefix,
} from '@/shared/hooks/useLocalStorageCache';
import type { Transaction, FinancialSummary } from '@/features/transactions/validations';
import type { TransactionFormData } from '@/features/transactions/types';

const TRANSACTIONS_CACHE_PREFIX = 'financeguy:cache:transactions:';
const TRANSACTIONS_TTL_MS = 30 * 60 * 1000; // 30 minutos

interface TransactionsSnapshot {
  data: Transaction[];
  summary: FinancialSummary;
}

/**
 * Validação manual de shape (A02/defense-in-depth): um snapshot com envelope
 * válido mas shape inválido (ex: `{ data: 'string', summary: null }`) NÃO deve
 * ser exibido como stale — é tratado como ausente, sem lançar.
 */
function isValidTransactionsSnapshot(snapshot: unknown): snapshot is TransactionsSnapshot {
  if (typeof snapshot !== 'object' || snapshot === null) return false;
  const candidate = snapshot as Record<string, unknown>;
  return (
    Array.isArray(candidate.data) &&
    candidate.summary !== null &&
    typeof candidate.summary === 'object'
  );
}

/**
 * Hash determinístico dos filtros — usado na chave do snapshot em
 * localStorage (`financeguy:cache:transactions:{hash}`).
 */
export function hashFilters(
  quinzenalFilter: 'month' | 'first' | 'second',
  selectedYear: string,
  selectedMonth: string,
  paidFilter: 'all' | 'paid' | 'unpaid',
): string {
  return JSON.stringify([quinzenalFilter, selectedYear, selectedMonth, paidFilter]);
}

export interface UseTransactionsReturn {
  transactions: Transaction[];
  summary: FinancialSummary;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  quinzenalFilter: 'month' | 'first' | 'second';
  setQuinzenalFilter: (value: 'month' | 'first' | 'second') => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  paidFilter: 'all' | 'paid' | 'unpaid';
  setPaidFilter: (filter: 'all' | 'paid' | 'unpaid') => void;
  refresh: () => void;
  createTransaction: (data: TransactionFormData) => Promise<void>;
  updateTransaction: (id: string, data: Partial<TransactionFormData>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  deleteFutureTransactions: (id: string) => Promise<void>;
  updateFutureTransactions: (id: string, data: Partial<TransactionFormData>) => Promise<void>;
  isModalOpen: boolean;
  editingTransaction: Transaction | null;
  openCreateModal: () => void;
  openEditModal: (transaction: Transaction) => void;
  closeModal: () => void;
  isConfirmModalOpen: boolean;
  deletingTransaction: Transaction | null;
  openConfirmModal: (transaction: Transaction) => void;
  closeConfirmModal: () => void;
  confirmDeleteTransaction: (scope: 'single' | 'future') => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad(n: number | string): string {
  return String(n).padStart(2, '0');
}

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getCurrentDateFields() {
  const now = new Date();
  return {
    year: String(now.getFullYear()),
    month: pad(now.getMonth() + 1),
    day: now.getDate(),
  };
}

function buildTransactionsUrl(
  quinzenalFilter: 'month' | 'first' | 'second',
  year: string,
  month: string,
  paidFilter: 'all' | 'paid' | 'unpaid',
): string {
  const params = new URLSearchParams();

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const lastDay = getLastDayOfMonth(y, m);

  let startDate: string;
  let endDate: string;

  if (quinzenalFilter === 'first') {
    startDate = `${year}-${pad(month)}-01`;
    endDate = `${year}-${pad(month)}-15`;
  } else if (quinzenalFilter === 'second') {
    startDate = `${year}-${pad(month)}-16`;
    endDate = `${year}-${pad(month)}-${pad(lastDay)}`;
  } else {
    startDate = `${year}-${pad(month)}-01`;
    endDate = `${year}-${pad(month)}-${pad(lastDay)}`;
  }

  params.set('startDate', startDate);
  params.set('endDate', endDate);

  if (paidFilter !== 'all') {
    params.set('paid', paidFilter === 'paid' ? 'true' : 'false');
  }

  const queryString = params.toString();
  return `/api/transactions?${queryString}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export default function useTransactions(): UseTransactionsReturn {
  const { year: initialYear, month: initialMonth } = getCurrentDateFields();

  const [quinzenalFilter, setQuinzenalFilterState] = useState<'month' | 'first' | 'second'>('month');
  const [selectedYear, setSelectedYearState] = useState(initialYear);
  const [selectedMonth, setSelectedMonthState] = useState(initialMonth);
  const [paidFilter, setPaidFilterState] = useState<'all' | 'paid' | 'unpaid'>('all');

  // Chave do snapshot — memoizada para não recalcular a cada render.
  // O prefixo `financeguy:cache:` é adicionado pelo utilitário readCache/writeCache.
  const cacheKey = useMemo(
    () => `transactions:${hashFilters(quinzenalFilter, selectedYear, selectedMonth, paidFilter)}`,
    [quinzenalFilter, selectedYear, selectedMonth, paidFilter],
  );

  // Lazy initializers: leem o snapshot SÍNCRONAMENTE no mount, garantindo
  // que dados stale apareçam no primeiro render (isLoading=false com stale).
  // Snapshot com shape inválido é tratado como ausente.
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const snapshot = readCache<TransactionsSnapshot>(cacheKey);
    return isValidTransactionsSnapshot(snapshot) ? snapshot.data : [];
  });
  const [summary, setSummary] = useState<FinancialSummary>(() => {
    const snapshot = readCache<TransactionsSnapshot>(cacheKey);
    return isValidTransactionsSnapshot(snapshot)
      ? snapshot.summary
      : {
          income: 0,
          expense: 0,
          balance: 0,
        };
  });
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !isValidTransactionsSnapshot(readCache<TransactionsSnapshot>(cacheKey)),
  );
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [confirmModalLoading, setConfirmModalLoading] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  // Flag consumida pelo efeito: após uma mutation invalidar o cache, o fetch
  // de revalidação NÃO deve re-gravar o snapshot (a invalidação já cumpriu o
  // papel de forçar dados frescos; a escrita ficaria obsoleta em seguida).
  // O reset é GARANTIDO no `finally` do fetchData — em caso de falha ou
  // cancelamento do refetch, a flag nunca fica presa `true` (Issue #9,
  // agravante: snapshots futuros nunca mais seriam re-gravados).
  const skipCacheWriteRef = useRef(false);

  // ---- Filter setters ----

  const setQuinzenalFilter = useCallback((value: 'month' | 'first' | 'second') => {
    setQuinzenalFilterState(value);
  }, []);

  const setSelectedYear = useCallback((value: string) => {
    setSelectedYearState(value);
  }, []);

  const setSelectedMonth = useCallback((value: string) => {
    setSelectedMonthState(value);
  }, []);

  const setPaidFilter = useCallback((value: 'all' | 'paid' | 'unpaid') => {
    setPaidFilterState(value);
  }, []);

  // ---- Fetch (stale-while-revalidate) ----

  useEffect(() => {
    let cancelled = false;
    let hadStale = false;

    // Snapshot do cache: se existe, é fresco e tem shape válido, exibe
    // imediatamente e roda o fetch em background (isFetching). Caso contrário,
    // mostra skeleton (shape inválido é tratado como ausente).
    const snapshot = readCache<TransactionsSnapshot>(cacheKey);
    if (isValidTransactionsSnapshot(snapshot)) {
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

    async function fetchData() {
      try {
        const url = buildTransactionsUrl(
          quinzenalFilter,
          selectedYear,
          selectedMonth,
          paidFilter,
        );

        // Issue #9: o GET /api/transactions responde com
        // `Cache-Control: private, max-age=300` — sem `cache: 'no-store'` o
        // NAVEGADOR serviria o refetch pós-mutation (mesma URL) do CACHE HTTP
        // com dados velhos → UI não atualiza após criar/editar/deletar.
        // `no-store` força SEMPRE a busca no servidor; o stale-while-revalidate
        // continua funcionando via snapshot do localStorage (leitura).
        const response = await fetch(url, { cache: 'no-store' });

        if (!response.ok) {
          throw new Error('Erro ao carregar transações');
        }

        const result = await response.json();

        if (cancelled) return;

        const nextData = result.data || [];
        const nextSummary = result.summary || { income: 0, expense: 0, balance: 0 };
        setTransactions(nextData);
        setSummary(nextSummary);
        setError(null);

        if (skipCacheWriteRef.current) {
          // Revalidação pós-mutation: não re-grava o snapshot recém-invalidado.
          skipCacheWriteRef.current = false;
        } else {
          writeCache(cacheKey, { data: nextData, summary: nextSummary }, TRANSACTIONS_TTL_MS);
        }
      } catch (err) {
        if (cancelled) return;

        if (hadStale) {
          // Mantém os dados stale na tela com mensagem suave de offline.
          setError('Você está offline. Mostrando dados salvos.');
        } else {
          setError(
            err instanceof Error ? err.message : 'Erro desconhecido',
          );
          setTransactions([]);
          setSummary({ income: 0, expense: 0, balance: 0 });
        }
      } finally {
        // Garantia (Issue #9): a flag de skip de escrita do snapshot é
        // SEMPRE resetada — inclusive quando o refetch falha ou é cancelado.
        // Sem isto, um refetch pós-mutation malsucedido deixaria a flag presa
        // `true` para sempre e snapshots nunca mais seriam re-gravados.
        skipCacheWriteRef.current = false;
        if (!cancelled) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, quinzenalFilter, selectedYear, selectedMonth, paidFilter, refreshKey]);

  // ---- Refresh ----

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // ---- CRUD ----

  const createTransaction = useCallback(
    async (data: TransactionFormData) => {
      // cache: 'no-store' por consistência/defesa (mutations não são
      // cacheadas pelo browser por padrão, mas evita surpresas com proxies).
      const response = await fetch('/api/transactions', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Erro ao criar transação');
      }

      clearCacheByPrefix(TRANSACTIONS_CACHE_PREFIX);
      skipCacheWriteRef.current = true;
      refresh();
    },
    [refresh],
  );

  const updateTransaction = useCallback(
    async (id: string, data: Partial<TransactionFormData>) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Erro ao atualizar transação');
      }

      clearCacheByPrefix(TRANSACTIONS_CACHE_PREFIX);
      skipCacheWriteRef.current = true;
      refresh();
    },
    [refresh],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        cache: 'no-store',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Erro ao excluir transação');
      }

      clearCacheByPrefix(TRANSACTIONS_CACHE_PREFIX);
      skipCacheWriteRef.current = true;
      refresh();
    },
    [refresh],
  );

  const deleteFutureTransactions = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/transactions/${id}?scope=future`, {
        method: 'DELETE',
        cache: 'no-store',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Erro ao excluir transações futuras');
      }

      clearCacheByPrefix(TRANSACTIONS_CACHE_PREFIX);
      skipCacheWriteRef.current = true;
      refresh();
    },
    [refresh],
  );

  const updateFutureTransactions = useCallback(
    async (id: string, data: Partial<TransactionFormData>) => {
      const response = await fetch(`/api/transactions/${id}?scope=future`, {
        method: 'PUT',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Erro ao atualizar transações futuras');
      }

      clearCacheByPrefix(TRANSACTIONS_CACHE_PREFIX);
      skipCacheWriteRef.current = true;
      refresh();
    },
    [refresh],
  );

  // ---- Modal ----

  const openCreateModal = useCallback(() => {
    setIsModalOpen(true);
    setEditingTransaction(null);
  }, []);

  const openEditModal = useCallback((transaction: Transaction) => {
    setIsModalOpen(true);
    setEditingTransaction(transaction);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  }, []);

  const openConfirmModal = useCallback((transaction: Transaction) => {
    setDeletingTransaction(transaction);
    setIsConfirmModalOpen(true);
  }, []);

  const closeConfirmModal = useCallback(() => {
    setIsConfirmModalOpen(false);
    setDeletingTransaction(null);
  }, []);

  const confirmDeleteTransaction = useCallback(
    async (scope: 'single' | 'future') => {
      if (!deletingTransaction) return;
      setConfirmModalLoading(true);
      try {
        if (scope === 'future') {
          await deleteFutureTransactions(deletingTransaction.id);
        } else {
          await deleteTransaction(deletingTransaction.id);
        }
        closeConfirmModal();
      } finally {
        setConfirmModalLoading(false);
      }
    },
    [deletingTransaction, deleteTransaction, deleteFutureTransactions, closeConfirmModal],
  );

  return {
    transactions,
    summary,
    isLoading,
    isFetching,
    error,
    quinzenalFilter,
    setQuinzenalFilter,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    paidFilter,
    setPaidFilter,
    refresh,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    deleteFutureTransactions,
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
  };
}