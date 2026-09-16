'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CreateInvestmentInput, Investment, UpdateInvestmentInput } from '@/features/investments/validations';

interface UseInvestmentsResult {
  investments: Investment[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  create: (input: CreateInvestmentInput) => Promise<Investment>;
  update: (id: string, input: UpdateInvestmentInput) => Promise<Investment>;
  remove: (id: string) => Promise<void>;
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return body?.error || fallback;
  } catch {
    return fallback;
  }
}

export function useInvestments(): UseInvestmentsResult {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchInvestments() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/investments');
        if (!response.ok) {
          throw new Error(await parseErrorMessage(response, 'Erro ao carregar investimentos'));
        }
        const result = await response.json();
        if (!cancelled) setInvestments(result.data || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchInvestments();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const create = useCallback(async (input: CreateInvestmentInput): Promise<Investment> => {
    setError(null);
    try {
      const response = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Erro ao criar investimento'));
      }
      const result = await response.json();
      setInvestments((prev) => [...prev, result.data]);
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const update = useCallback(async (id: string, input: UpdateInvestmentInput): Promise<Investment> => {
    setError(null);
    try {
      const response = await fetch(`/api/investments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Erro ao atualizar investimento'));
      }
      const result = await response.json();
      setInvestments((prev) => prev.map((item) => (item.id === id ? result.data : item)));
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    setError(null);
    const previous = investments;
    setInvestments((prev) => prev.filter((item) => item.id !== id));
    try {
      const response = await fetch(`/api/investments/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Erro ao excluir investimento'));
      }
    } catch (err) {
      setInvestments(previous);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      throw new Error(message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investments]);

  return { investments, isLoading, error, refresh, create, update, remove };
}
