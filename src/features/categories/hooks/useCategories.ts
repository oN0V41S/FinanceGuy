'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_CATEGORIES } from '../defaults';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../validations';

/** Erro de API com `code`/`details` para a UI reagir (ex.: REASSIGN_REQUIRED). */
export class CategoryApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: { transactionCount?: number }
  ) {
    super(message);
    this.name = 'CategoryApiError';
  }
}

/** Padrões em memória: usados enquanto carrega ou se a API falhar (nunca bloqueia o app). */
export const FALLBACK_CATEGORIES: Category[] = DEFAULT_CATEGORIES.map((c) => ({
  id: `default-${c.name}`,
  name: c.name,
  type: c.type,
  color: c.color,
  icon: c.icon,
  isDefault: true,
}));

async function toApiError(response: Response, fallback: string): Promise<CategoryApiError> {
  try {
    const body = await response.json();
    return new CategoryApiError(body?.error || fallback, body?.code, body?.details);
  } catch {
    return new CategoryApiError(fallback);
  }
}

function asError(err: unknown, fallback: string): CategoryApiError {
  if (err instanceof CategoryApiError) return err;
  return new CategoryApiError(fallback);
}

interface UseCategoriesOptions {
  /** Filtra por compatibilidade com o tipo da transação (income inclui "both"). */
  type?: 'income' | 'expense';
}

export interface UseCategoriesResult {
  categories: Category[];
  isLoading: boolean;
  /** true quando a lista exibida é o fallback local (API indisponível). */
  isFallback: boolean;
  error: string | null;
  refresh: () => void;
  create: (input: CreateCategoryInput) => Promise<Category>;
  update: (id: string, input: UpdateCategoryInput) => Promise<Category>;
  remove: (id: string, reassignTo?: string) => Promise<void>;
}

export function useCategories(options: UseCategoriesOptions = {}): UseCategoriesResult {
  const { type } = options;
  const [loaded, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  // Último valor commitado: base síncrona para o rollback das mutações otimistas.
  const loadedRef = useRef(loaded);
  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(true);
  // Enquanto for fallback, filtra pelo tipo ATUAL (o tipo pode mudar antes da API responder).
  const categories = isFallback && type
    ? FALLBACK_CATEGORIES.filter((c) => c.type === 'both' || c.type === type)
    : loaded;
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const query = type ? `?type=${type}` : '';
        const response = await fetch(`/api/categories${query}`);
        if (!response.ok) throw await toApiError(response, 'Não foi possível carregar as categorias.');
        const result = await response.json();
        if (!cancelled) {
          setCategories(result.data ?? []);
          setIsFallback(false);
          setError(null);
        }
      } catch (err) {
        // Mantém a lista atual (padrões) para o usuário seguir trabalhando.
        if (!cancelled) {
          setError(asError(err, 'Não foi possível carregar as categorias.').message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [type, refreshKey]);

  const create = useCallback(async (input: CreateCategoryInput): Promise<Category> => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw await toApiError(response, 'Não foi possível criar a categoria.');
      const { data } = await response.json();
      setCategories((prev) => [...prev, { ...data, transactionCount: data.transactionCount ?? 0 }]);
      return data;
    } catch (err) {
      throw asError(err, 'Não foi possível criar a categoria.');
    }
  }, []);

  const update = useCallback(async (id: string, input: UpdateCategoryInput): Promise<Category> => {
    // Otimista: aplica já e reverte se falhar.
    const previous = loadedRef.current;
    setCategories(previous.map((c) => (c.id === id ? { ...c, ...input } : c)));

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw await toApiError(response, 'Não foi possível salvar a categoria.');
      const { data } = await response.json();
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
      return data;
    } catch (err) {
      setCategories(previous);
      throw asError(err, 'Não foi possível salvar a categoria.');
    }
  }, []);

  const remove = useCallback(async (id: string, reassignTo?: string): Promise<void> => {
    const previous = loadedRef.current;
    setCategories(previous.filter((c) => c.id !== id));

    try {
      const query = reassignTo ? `?reassignTo=${encodeURIComponent(reassignTo)}` : '';
      const response = await fetch(`/api/categories/${id}${query}`, { method: 'DELETE' });
      if (!response.ok) throw await toApiError(response, 'Não foi possível excluir a categoria.');
      // Contagens de quem recebeu as transações mudaram: recarrega em segundo plano.
      if (reassignTo) setRefreshKey((k) => k + 1);
    } catch (err) {
      setCategories(previous);
      throw asError(err, 'Não foi possível excluir a categoria.');
    }
  }, []);

  return { categories, isLoading, isFallback, error, refresh, create, update, remove };
}
