/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCategories, FALLBACK_CATEGORIES } from '../useCategories';
import type { Category } from '../../validations';

const mockFetch = jest.fn();

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

const SERVER_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Mercado', type: 'expense', color: '#111111', icon: 'tag', isDefault: false, transactionCount: 2 },
  { id: 'c2', name: 'Outros', type: 'both', color: '#222222', icon: 'tag', isDefault: true, transactionCount: 0 },
];

describe('useCategories', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('começa com os padrões e troca pela lista da API', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: SERVER_CATEGORIES }));
    const { result } = renderHook(() => useCategories());

    expect(result.current.isFallback).toBe(true);
    expect(result.current.categories).toEqual(FALLBACK_CATEGORIES);

    await waitFor(() => expect(result.current.isFallback).toBe(false));
    expect(result.current.categories).toEqual(SERVER_CATEGORIES);
    expect(result.current.error).toBeNull();
  });

  it('mantém os padrões e expõe mensagem calma quando a API falha', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Falhou' }, false, 500));
    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isFallback).toBe(true);
    expect(result.current.categories.length).toBeGreaterThan(0);
    expect(result.current.error).toBe('Falhou');
  });

  it('filtra o fallback pelo tipo atual, mesmo que ele mude antes da API responder', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, false, 500));
    const { result, rerender } = renderHook(({ type }) => useCategories({ type }), {
      initialProps: { type: 'expense' as 'income' | 'expense' },
    });
    expect(result.current.categories.some((c) => c.name === 'Salário')).toBe(false);

    rerender({ type: 'income' });
    expect(result.current.categories.some((c) => c.name === 'Salário')).toBe(true);
    expect(result.current.categories.some((c) => c.name === 'Alimentação')).toBe(false);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('create adiciona a categoria nova na lista com contagem 0 de transações', async () => {
    const created: Category = { id: 'c3', name: 'Pets', type: 'expense', color: '#06B6D4', icon: 'paw-print', isDefault: false };
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ data: SERVER_CATEGORIES }))
      .mockResolvedValueOnce(jsonResponse({ data: created }, true, 201));
    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isFallback).toBe(false));

    await act(async () => {
      await result.current.create({ name: 'Pets', type: 'expense' });
    });

    expect(result.current.categories.find((c) => c.id === 'c3')?.transactionCount).toBe(0);
  });

  it('update é otimista e reverte quando a API recusa', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: SERVER_CATEGORIES }));
    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isFallback).toBe(false));

    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Já existe', code: 'DUPLICATE' }, false, 409));
    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.update('c1', { name: 'Feira' });
      } catch (err) {
        thrown = err;
      }
    });

    expect(thrown).toMatchObject({ message: 'Já existe', code: 'DUPLICATE' });
    expect(result.current.categories.find((c) => c.id === 'c1')?.name).toBe('Mercado');
  });

  it('remove com reassignTo envia a query e recarrega a lista', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: SERVER_CATEGORIES }));
    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isFallback).toBe(false));

    mockFetch.mockResolvedValueOnce(jsonResponse({ data: { success: true, moved: 2 } }));
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: [SERVER_CATEGORIES[1]] }));
    await act(async () => {
      await result.current.remove('c1', 'c2');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/categories/c1?reassignTo=c2', { method: 'DELETE' });
    await waitFor(() => expect(result.current.categories).toEqual([SERVER_CATEGORIES[1]]));
  });

  it('remove reverte a lista quando a API exige reatribuição', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: SERVER_CATEGORIES }));
    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.isFallback).toBe(false));

    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: 'Escolha um destino', code: 'REASSIGN_REQUIRED', details: { transactionCount: 2 } }, false, 409)
    );
    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.remove('c1');
      } catch (err) {
        thrown = err;
      }
    });

    expect(thrown).toMatchObject({ code: 'REASSIGN_REQUIRED', details: { transactionCount: 2 } });
    expect(result.current.categories).toHaveLength(2);
  });
});
