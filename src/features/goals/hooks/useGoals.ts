'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CreateGoalInput, Goal, UpdateGoalInput } from '@/features/goals/validations';

interface UseGoalsResult {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  create: (input: CreateGoalInput) => Promise<Goal>;
  update: (id: string, input: UpdateGoalInput) => Promise<Goal>;
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

export function useGoals(): UseGoalsResult {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchGoals() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/goals');
        if (!response.ok) {
          throw new Error(await parseErrorMessage(response, 'Erro ao carregar metas'));
        }
        const result = await response.json();
        if (!cancelled) setGoals(result.data || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchGoals();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const create = useCallback(async (input: CreateGoalInput): Promise<Goal> => {
    setError(null);
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Erro ao criar meta'));
      }
      const result = await response.json();
      setGoals((prev) => [...prev, result.data]);
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const update = useCallback(async (id: string, input: UpdateGoalInput): Promise<Goal> => {
    setError(null);
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Erro ao atualizar meta'));
      }
      const result = await response.json();
      setGoals((prev) => prev.map((item) => (item.id === id ? result.data : item)));
      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      throw new Error(message);
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    setError(null);
    const previous = goals;
    setGoals((prev) => prev.filter((item) => item.id !== id));
    try {
      const response = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response, 'Erro ao excluir meta'));
      }
    } catch (err) {
      setGoals(previous);
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      throw new Error(message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals]);

  return { goals, isLoading, error, refresh, create, update, remove };
}
