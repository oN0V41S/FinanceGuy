import { renderHook, act, waitFor } from '@testing-library/react';
import { useDashboardData } from '../useDashboardData';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function makeResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
  };
}

function makeTransaction(overrides: Partial<{ id: string; date: string; description: string; value: number; type: 'income' | 'expense'; category: string; responsible: string }> = {}) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    date: overrides.date ?? '2025-01-10',
    description: overrides.description ?? 'Test Transaction',
    value: overrides.value ?? 100,
    type: overrides.type ?? 'expense',
    category: overrides.category ?? 'Alimentação',
    responsible: overrides.responsible ?? 'Admin',
    ...overrides,
  };
}

const fullMonthData = {
  data: [
    makeTransaction({ id: '1', date: '2025-01-05', description: 'Oldest' }),
    makeTransaction({ id: '2', date: '2025-01-15', description: 'Mid' }),
    makeTransaction({ id: '3', date: '2025-01-20', description: 'Newest' }),
  ],
  summary: { income: 500, expense: 300, balance: 200 },
};

const fortnightSummary = { summary: { income: 100, expense: 50, balance: 50 } };

beforeEach(() => {
  mockFetch.mockReset();
  // Issue #9: o hook agora grava snapshots em localStorage (SWR). Limpar o
  // cache a cada teste restaura o isolamento que existia antes do cache.
  localStorage.clear();
});

describe('useDashboardData', () => {
  describe('Green path', () => {
    it('fetches transactions with valid month/year (fortnight=all) and returns top 5 sorted by date desc', async () => {
      // Arrange
      mockFetch.mockResolvedValue(makeResponse(fullMonthData));

      // Act
      const { result } = renderHook(() => useDashboardData('1', '2025', 'all'));

      // Assert
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('startDate=2025-01-01'),
        // Issue #9: GET agora envia cache:'no-store' (nunca serve do cache
        // HTTP do browser — dados frescos sempre).
        expect.objectContaining({ cache: 'no-store' }),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('endDate=2025-01-31'),
        expect.objectContaining({ cache: 'no-store' }),
      );
      expect(result.current.recentTransactions).toHaveLength(3);
      expect(result.current.recentTransactions[0].id).toBe('3');
      expect(result.current.recentTransactions[1].id).toBe('2');
      expect(result.current.recentTransactions[2].id).toBe('1');
      expect(result.current.summary).toEqual({ income: 500, expense: 300, balance: 200 });
    });

    it('limits recentTransactions to top 5', async () => {
      // Arrange
      const manyTransactions = {
        data: Array.from({ length: 10 }, (_, i) =>
          makeTransaction({ id: String(i), date: `2025-01-${String(i + 1).padStart(2, '0')}` })
        ),
        summary: { income: 0, expense: 0, balance: 0 },
      };
      mockFetch.mockResolvedValue(makeResponse(manyTransactions));

      // Act
      const { result } = renderHook(() => useDashboardData('1', '2025', 'all'));

      // Assert
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.recentTransactions).toHaveLength(5);
      expect(result.current.recentTransactions[0].id).toBe('9');
    });

    it('fetches fortnight summary separately when fortnight !== all', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce(makeResponse(fullMonthData))
        .mockResolvedValueOnce(makeResponse(fortnightSummary));

      // Act
      const { result } = renderHook(() => useDashboardData('1', '2025', 'first'));

      // Assert
      await waitFor(() => expect(result.current.isSummaryLoading).toBe(false));

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.current.summary).toEqual(fortnightSummary.summary);
    });

    it('uses full month summary when fortnight is all', async () => {
      // Arrange
      mockFetch.mockResolvedValue(makeResponse(fullMonthData));

      // Act
      const { result } = renderHook(() => useDashboardData('1', '2025', 'all'));

      // Assert
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.current.summary).toEqual({ income: 500, expense: 300, balance: 200 });
    });
  });

  describe('Edge cases', () => {
    it('does not fetch when month is missing', async () => {
      // Arrange & Act
      const { result } = renderHook(() => useDashboardData(undefined, '2025', 'all'));

      // Assert
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.recentTransactions).toEqual([]);
    });

    it('does not fetch when year is missing', async () => {
      // Arrange & Act
      const { result } = renderHook(() => useDashboardData('1', undefined, 'all'));

      // Assert
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.recentTransactions).toEqual([]);
    });

    it('handles empty API response gracefully', async () => {
      // Arrange
      mockFetch.mockResolvedValue(makeResponse({ data: [], summary: { income: 0, expense: 0, balance: 0 } }));

      // Act
      const { result } = renderHook(() => useDashboardData('1', '2025', 'all'));

      // Assert
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recentTransactions).toEqual([]);
      expect(result.current.summary).toEqual({ income: 0, expense: 0, balance: 0 });
    });

    it('sets summary to zeros when API returns no summary field', async () => {
      // Arrange
      mockFetch.mockResolvedValue(makeResponse({ data: [] }));

      // Act
      const { result } = renderHook(() => useDashboardData('1', '2025', 'all'));

      // Assert
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.summary).toEqual({ income: 0, expense: 0, balance: 0 });
    });

    it('re-fetches when month/year changes', async () => {
      // Arrange
      mockFetch.mockResolvedValue(makeResponse(fullMonthData));

      // Act - render with month=1
      const { result, rerender } = renderHook(
        ({ month, year }) => useDashboardData(month, year, 'all'),
        { initialProps: { month: '1', year: '2025' } }
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Act - change to month=2
      rerender({ month: '2', year: '2025' });

      // Assert
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('startDate=2025-02-01'),
        // Issue #9: GET com cache:'no-store' (ver contrato do hook).
        expect.objectContaining({ cache: 'no-store' }),
      );
    });

    it('re-fetches when fortnight changes', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce(makeResponse(fullMonthData))
        .mockResolvedValueOnce(makeResponse(fortnightSummary));

      // Act - render with fortnight=all
      const { result, rerender } = renderHook(
        ({ fortnight }: { fortnight: 'all' | 'first' | 'second' }) => useDashboardData('1', '2025', fortnight),
        { initialProps: { fortnight: 'all' } }
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Act - change to fortnight=first
      rerender({ fortnight: 'first' });

      // Assert
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));
    });

    it('re-fetches when refresh() is called', async () => {
      // Arrange
      mockFetch.mockResolvedValue(makeResponse(fullMonthData));

      // Act
      const { result } = renderHook(() => useDashboardData('1', '2025', 'all'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Act - call refresh
      act(() => {
        result.current.refresh();
      });

      // Assert
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    });
  });

  describe('Error handling', () => {
    it('sets error state when API returns non-OK response', async () => {
      // Arrange
      mockFetch.mockResolvedValue(makeResponse(null, false, 500));

      // Act
      const { result } = renderHook(() => useDashboardData('1', '2025', 'all'));

      // Assert
      await waitFor(() => expect(result.current.error).toBe('Erro ao carregar dados'));
      expect(result.current.recentTransactions).toEqual([]);
    });

    it('sets error state when fetch throws network error', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      // Act
      const { result } = renderHook(() => useDashboardData('1', '2025', 'all'));

      // Assert
      await waitFor(() => expect(result.current.error).toBe('Failed to fetch'));
      expect(result.current.recentTransactions).toEqual([]);
    });

    it('handles non-Error thrown values with fallback message', async () => {
      // Arrange
      mockFetch.mockRejectedValue('unexpected string');

      // Act
      const { result } = renderHook(() => useDashboardData('1', '2025', 'all'));

      // Assert
      await waitFor(() => expect(result.current.error).toBe('Erro desconhecido'));
      expect(result.current.recentTransactions).toEqual([]);
    });
  });
});
