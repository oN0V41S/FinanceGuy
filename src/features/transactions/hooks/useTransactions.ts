'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Transaction, FinancialSummary } from '@/features/transactions/validations';
import type { TransactionFormData } from '@/features/transactions/types';

export interface UseTransactionsReturn {
  transactions: Transaction[];
  summary: FinancialSummary;
  isLoading: boolean;
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

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    income: 0,
    expense: 0,
    balance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quinzenalFilter, setQuinzenalFilterState] = useState<'month' | 'first' | 'second'>('month');
  const [selectedYear, setSelectedYearState] = useState(initialYear);
  const [selectedMonth, setSelectedMonthState] = useState(initialMonth);
  const [paidFilter, setPaidFilterState] = useState<'all' | 'paid' | 'unpaid'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [confirmModalLoading, setConfirmModalLoading] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

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

  // ---- Fetch ----

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const url = buildTransactionsUrl(
          quinzenalFilter,
          selectedYear,
          selectedMonth,
          paidFilter,
        );

        const response = await fetch(url, undefined);

        if (!response.ok) {
          throw new Error('Erro ao carregar transações');
        }

        const result = await response.json();

        if (!cancelled) {
          setTransactions(result.data || []);
          setSummary(
            result.summary || { income: 0, expense: 0, balance: 0 },
          );
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Erro desconhecido',
          );
          setTransactions([]);
          setSummary({ income: 0, expense: 0, balance: 0 });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [quinzenalFilter, selectedYear, selectedMonth, paidFilter, refreshKey]);

  // ---- Refresh ----

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // ---- CRUD ----

  const createTransaction = useCallback(
    async (data: TransactionFormData) => {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Erro ao criar transação');
      }

      refresh();
    },
    [refresh],
  );

  const updateTransaction = useCallback(
    async (id: string, data: Partial<TransactionFormData>) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Erro ao atualizar transação');
      }

      refresh();
    },
    [refresh],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Erro ao excluir transação');
      }

      refresh();
    },
    [refresh],
  );

  const deleteFutureTransactions = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/transactions/${id}?scope=future`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Erro ao excluir transações futuras');
      }

      refresh();
    },
    [refresh],
  );

  const updateFutureTransactions = useCallback(
    async (id: string, data: Partial<TransactionFormData>) => {
      const response = await fetch(`/api/transactions/${id}?scope=future`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Erro ao atualizar transações futuras');
      }

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
