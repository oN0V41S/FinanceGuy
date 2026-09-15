import { renderHook, act, waitFor } from '@testing-library/react';
import { useGoals } from '../useGoals';
import type { Goal } from '@/features/goals/validations';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function makeResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
  };
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: overrides.id ?? '1',
    name: overrides.name ?? 'Viagem',
    targetValue: overrides.targetValue ?? 10000,
    currentValue: overrides.currentValue ?? 2000,
    deadlineLabel: overrides.deadlineLabel,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('useGoals', () => {
  it('fetches goals on mount', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: [makeGoal()] }));

    const { result } = renderHook(() => useGoals());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith('/api/goals');
    expect(result.current.goals).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('sets error state when fetch fails', async () => {
    mockFetch.mockResolvedValue(makeResponse({ error: 'Falha ao buscar metas' }, false, 500));

    const { result } = renderHook(() => useGoals());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Falha ao buscar metas');
    expect(result.current.goals).toEqual([]);
  });

  it('creates a goal and appends it to state', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({ data: [] }));
    const { result } = renderHook(() => useGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const created = makeGoal({ id: '2', name: 'Reserva de Emergência' });
    mockFetch.mockResolvedValueOnce(makeResponse({ data: created }, true, 201));

    await act(async () => {
      await result.current.create({ name: 'Reserva de Emergência', targetValue: 5000, currentValue: 0 });
    });

    expect(result.current.goals).toContainEqual(created);
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/goals',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updates a goal in place', async () => {
    const existing = makeGoal({ id: '1', currentValue: 2000 });
    mockFetch.mockResolvedValueOnce(makeResponse({ data: [existing] }));
    const { result } = renderHook(() => useGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const updated = { ...existing, currentValue: 5000 };
    mockFetch.mockResolvedValueOnce(makeResponse({ data: updated }));

    await act(async () => {
      await result.current.update('1', { currentValue: 5000 });
    });

    expect(result.current.goals[0].currentValue).toBe(5000);
  });

  it('removes a goal optimistically and rolls back on failure', async () => {
    const existing = makeGoal({ id: '1' });
    mockFetch.mockResolvedValueOnce(makeResponse({ data: [existing] }));
    const { result } = renderHook(() => useGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockFetch.mockResolvedValueOnce(makeResponse({ error: 'Não encontrado' }, false, 404));

    await act(async () => {
      await expect(result.current.remove('1')).rejects.toThrow('Não encontrado');
    });

    expect(result.current.goals).toHaveLength(1);
    expect(result.current.error).toBe('Não encontrado');
  });

  it('removes a goal successfully', async () => {
    const existing = makeGoal({ id: '1' });
    mockFetch.mockResolvedValueOnce(makeResponse({ data: [existing] }));
    const { result } = renderHook(() => useGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockFetch.mockResolvedValueOnce(makeResponse({ data: { success: true } }));

    await act(async () => {
      await result.current.remove('1');
    });

    expect(result.current.goals).toHaveLength(0);
  });

  it('refresh triggers a refetch', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: [] }));
    const { result } = renderHook(() => useGoals());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });
});
