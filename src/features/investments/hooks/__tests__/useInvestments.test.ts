import { renderHook, act, waitFor } from '@testing-library/react';
import { useInvestments } from '../useInvestments';
import type { Investment } from '@/features/investments/validations';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function makeResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
  };
}

function makeInvestment(overrides: Partial<Investment> = {}): Investment {
  return {
    id: overrides.id ?? '1',
    name: overrides.name ?? 'Tesouro Selic',
    type: overrides.type ?? 'Renda Fixa',
    value: overrides.value ?? 1000,
    quantity: overrides.quantity,
    term: overrides.term,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('useInvestments', () => {
  it('fetches investments on mount', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: [makeInvestment()] }));

    const { result } = renderHook(() => useInvestments());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith('/api/investments');
    expect(result.current.investments).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('sets error state when fetch fails', async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: 'Falha ao buscar' }, false, 500));

    const { result } = renderHook(() => useInvestments());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Falha ao buscar');
    expect(result.current.investments).toEqual([]);
  });

  it('creates an investment and appends it to state', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ data: [] }));
    const { result } = renderHook(() => useInvestments());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const created = makeInvestment({ id: '2', name: 'CDB' });
    mockFetch.mockResolvedValueOnce(makeResponse({ data: created }, true, 201));

    await act(async () => {
      await result.current.create({ name: 'CDB', type: 'Renda Fixa', value: 500 });
    });

    expect(result.current.investments).toContainEqual(created);
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/investments',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updates an investment in place', async () => {
    const existing = makeInvestment({ id: '1', name: 'Tesouro Selic' });
    mockFetch.mockResolvedValueOnce(makeResponse({ data: [existing] }));
    const { result } = renderHook(() => useInvestments());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updated = { ...existing, name: 'Tesouro IPCA' };
    mockFetch.mockResolvedValueOnce(makeResponse({ data: updated }));

    await act(async () => {
      await result.current.update('1', { name: 'Tesouro IPCA' });
    });

    expect(result.current.investments[0].name).toBe('Tesouro IPCA');
  });

  it('removes an investment optimistically and rolls back on failure', async () => {
    const existing = makeInvestment({ id: '1' });
    mockFetch.mockResolvedValueOnce(makeResponse({ data: [existing] }));
    const { result } = renderHook(() => useInvestments());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockFetch.mockResolvedValueOnce(makeResponse({ error: 'Não encontrado' }, false, 404));

    await act(async () => {
      await expect(result.current.remove('1')).rejects.toThrow('Não encontrado');
    });

    expect(result.current.investments).toHaveLength(1);
    expect(result.current.error).toBe('Não encontrado');
  });

  it('removes an investment successfully', async () => {
    const existing = makeInvestment({ id: '1' });
    mockFetch.mockResolvedValueOnce(makeResponse({ data: [existing] }));
    const { result } = renderHook(() => useInvestments());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockFetch.mockResolvedValueOnce(makeResponse({ data: { success: true } }));

    await act(async () => {
      await result.current.remove('1');
    });

    expect(result.current.investments).toHaveLength(0);
  });

  it('refresh triggers a refetch', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: [] }));
    const { result } = renderHook(() => useInvestments());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });
});
