'use client';

import { useCallback, useState } from 'react';
import type { SessionSummaryDto } from '@/features/ai/types';

const LIST_ERROR = 'Não foi possível carregar suas conversas.';
const RENAME_ERROR = 'Não foi possível renomear a conversa. Tente novamente.';
const DELETE_ERROR = 'Não foi possível excluir a conversa. Tente novamente.';

export interface UseConversationsResult {
  sessions: SessionSummaryDto[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  rename: (id: string, title: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

function isSummary(value: unknown): value is SessionSummaryDto {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<SessionSummaryDto>;
  return typeof v.id === 'string' && typeof v.active === 'boolean';
}

export function useConversations(): UseConversationsResult {
  const [sessions, setSessions] = useState<SessionSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/sessions');
      if (!response.ok) throw new Error('list');
      const body: unknown = await response.json();
      const list = body && typeof body === 'object' ? (body as { sessions?: unknown }).sessions : undefined;
      setSessions(Array.isArray(list) ? list.filter(isSummary) : []);
      setError(null);
    } catch {
      setError(LIST_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rename = useCallback(async (id: string, title: string): Promise<boolean> => {
    const clean = title.trim();
    if (!clean) return false;
    try {
      const response = await fetch(`/api/ai/sessions/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: clean }),
      });
      if (!response.ok) throw new Error('rename');
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: clean } : s)));
      setError(null);
      return true;
    } catch {
      setError(RENAME_ERROR);
      return false;
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/ai/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('delete');
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setError(null);
      return true;
    } catch {
      setError(DELETE_ERROR);
      return false;
    }
  }, []);

  return {
    sessions,
    isLoading,
    error,
    refresh,
    rename,
    remove,
  };
}
