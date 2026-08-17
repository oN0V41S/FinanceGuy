/**
 * Fase RED (TDD) — Issue #9: refatoração de `useDashboardData` com
 * stale-while-revalidate + snapshot em localStorage (mesmo padrão de
 * `useTransactions`).
 *
 * Contrato definido aqui:
 * - `isLoading`: true APENAS quando NÃO há dado stale (primeiro load)
 * - `isFetching`: true quando há stale e o fetch de background roda
 * - Snapshot: `financeguy:cache:dashboard:{hashDashboardFilters(month, year, fortnight)}`
 *   com envelope `{ value: { data, summary }, timestamp, ttl }` (TTL 30min)
 * - `hashDashboardFilters` exportada como função pura
 * - Erro com stale: mantém recentTransactions + summary
 * - Erro sem stale: error real + dados zerados
 *
 * O hook atual (`useDashboardData.ts`) AINDA NÃO implementa essas decisões —
 * os testes devem falhar (red) até a implementação da próxima fase.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDashboardData, hashDashboardFilters } from '../useDashboardData';
import type { Transaction, FinancialSummary } from '@/features/transactions/validations';
import type { FortnightValue } from '@/features/dashboard/components/FortnightFilter';

const CACHE_PREFIX = 'financeguy:cache:dashboard:';
const TTL_30_MIN = 30 * 60 * 1000;

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(data: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => data,
  };
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: overrides.id ?? '00000000-0000-0000-0000-000000000001',
    date: overrides.date ?? '2026-01-15',
    description: overrides.description ?? 'Transação teste',
    value: overrides.value ?? 100,
    type: overrides.type ?? 'expense',
    category: overrides.category ?? 'Alimentação',
    responsible: overrides.responsible ?? 'João',
    paid: overrides.paid ?? false,
    is_recurring: overrides.is_recurring ?? false,
    ...overrides,
  };
}

function sortedByDateDesc(data: Transaction[]): Transaction[] {
  return [...data].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

interface DashboardPayload {
  data: Transaction[];
  summary: FinancialSummary;
}

const stalePayload: DashboardPayload = {
  data: [makeTransaction({ id: '99', date: '2026-01-08', description: 'Stale' })],
  summary: { income: 999, expense: 0, balance: 999 },
};

const freshPayload: DashboardPayload = {
  data: [
    makeTransaction({ id: '3', date: '2026-01-20', description: 'Nova receita', value: 300, type: 'income' }),
    makeTransaction({ id: '2', date: '2026-01-10', description: 'Mercado', value: 200 }),
    makeTransaction({ id: '1', date: '2026-01-01', description: 'Aluguel', value: 300 }),
  ],
  summary: { income: 300, expense: 500, balance: -200 },
};

const fortnightSummary: FinancialSummary = { income: 100, expense: 50, balance: 50 };

function createDeferredFetch(): {
  deferred: Promise<unknown>;
  resolveFetch: (value: unknown) => void;
} {
  let resolveFetch!: (value: unknown) => void;
  const deferred = new Promise<unknown>((resolve) => {
    resolveFetch = resolve;
  });
  return { deferred, resolveFetch };
}

/** Semeia um snapshot válido para o dashboard no localStorage. */
function seedDashboardSnapshot(
  month: string | undefined,
  year: string | undefined,
  fortnight: FortnightValue | undefined,
  payload: DashboardPayload,
  ttlMs = TTL_30_MIN,
): void {
  const hash = hashDashboardFilters(month, year, fortnight);
  localStorage.setItem(
    `${CACHE_PREFIX}${hash}`,
    JSON.stringify({ value: payload, timestamp: Date.now(), ttl: ttlMs }),
  );
}

beforeEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
  mockFetch.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// SWR — snapshot do cache
// ---------------------------------------------------------------------------

describe('useDashboardData — SWR com snapshot no localStorage', () => {
  describe('Leitura do snapshot (stale-while-revalidate)', () => {
    it('exibe stale IMEDIATAMENTE: isLoading=false, isFetching=true e fetch de background disparado', async () => {
      seedDashboardSnapshot('1', '2026', 'all', stalePayload);
      const { deferred, resolveFetch } = createDeferredFetch();
      mockFetch.mockImplementation(() => deferred);

      const { result } = renderHook(() => useDashboardData('1', '2026', 'all'));

      // Render instantâneo com dados stale
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(true);
      expect(result.current.recentTransactions).toEqual(stalePayload.data);
      expect(result.current.summary).toEqual(stalePayload.summary);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Background fetch resolve → estado atualiza
      await act(async () => {
        resolveFetch(makeResponse(freshPayload));
      });

      await waitFor(() => expect(result.current.isFetching).toBe(false));
      expect(result.current.recentTransactions).toEqual(
        sortedByDateDesc(freshPayload.data),
      );
      expect(result.current.summary).toEqual(freshPayload.summary);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSummaryLoading).toBe(false);
    });

    it('sem snapshot: isLoading=true e fetch normal', async () => {
      const { deferred, resolveFetch } = createDeferredFetch();
      mockFetch.mockImplementation(() => deferred);

      const { result } = renderHook(() => useDashboardData('1', '2026', 'all'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.recentTransactions).toEqual([]);

      await act(async () => {
        resolveFetch(makeResponse(freshPayload));
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recentTransactions).toEqual(
        sortedByDateDesc(freshPayload.data),
      );
      expect(result.current.isFetching).toBe(false);
    });

    it('snapshot com shape inválido não é exibido como stale (isLoading=true + fetch normal)', async () => {
      const hash = hashDashboardFilters('1', '2026', 'all');
      // Envelope válido (não expirado), mas o shape do value é inválido:
      // data é string e summary é null → deve ser tratado como ausente.
      localStorage.setItem(
        `${CACHE_PREFIX}${hash}`,
        JSON.stringify({
          value: { data: 'string', summary: null },
          timestamp: Date.now(),
          ttl: TTL_30_MIN,
        }),
      );
      const { deferred, resolveFetch } = createDeferredFetch();
      mockFetch.mockImplementation(() => deferred);

      const { result } = renderHook(() => useDashboardData('1', '2026', 'all'));

      // Shape inválido → tratado como ausente: skeleton (isLoading) e NÃO há
      // fetch em background; o fetch normal roda uma única vez.
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.recentTransactions).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveFetch(makeResponse(freshPayload));
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.recentTransactions).toEqual(
        sortedByDateDesc(freshPayload.data),
      );
      expect(result.current.isFetching).toBe(false);
    });

    it('fortnight !== all: stale exibido e refetch duplo (mês cheio + summary quinzenal)', async () => {
      seedDashboardSnapshot('1', '2026', 'first', {
        data: stalePayload.data,
        summary: fortnightSummary,
      });
      mockFetch
        .mockResolvedValueOnce(makeResponse(freshPayload))
        .mockResolvedValueOnce(
          makeResponse({ data: [], summary: fortnightSummary }),
        );

      const { result } = renderHook(() => useDashboardData('1', '2026', 'first'));

      // Stale render instantâneo (inclui summary quinzenal)
      expect(result.current.isLoading).toBe(false);
      expect(result.current.recentTransactions).toEqual(stalePayload.data);
      expect(result.current.summary).toEqual(fortnightSummary);

      await waitFor(() => expect(result.current.isSummaryLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.current.recentTransactions).toEqual(
        sortedByDateDesc(freshPayload.data),
      );
      expect(result.current.summary).toEqual(fortnightSummary);
    });
  });

  describe('Escrita do snapshot (sucesso do fetch)', () => {
    it('grava snapshot com TTL de 30min na chave prefixada pelo hash dos filtros', async () => {
      const setSpy = jest.spyOn(Storage.prototype, 'setItem');
      mockFetch.mockResolvedValue(makeResponse(freshPayload));

      const { result } = renderHook(() => useDashboardData('1', '2026', 'all'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const hash = hashDashboardFilters('1', '2026', 'all');
      const writeCall = setSpy.mock.calls.find(
        ([key]) => typeof key === 'string' && key.startsWith(CACHE_PREFIX),
      );

      expect(writeCall).toBeDefined();
      const writeKey = writeCall?.[0] as string;
      const writeValue = writeCall?.[1] as string;
      expect(writeKey).toBe(`${CACHE_PREFIX}${hash}`);

      const stored = JSON.parse(writeValue) as {
        value: DashboardPayload;
        ttl: number;
        timestamp: number;
      };
      expect(stored.ttl).toBe(TTL_30_MIN);
      expect(stored.value).toEqual(freshPayload);
      expect(stored.timestamp).toBeLessThanOrEqual(Date.now());
      expect(result.current.recentTransactions).toEqual(
        sortedByDateDesc(freshPayload.data),
      );
    });
  });

  describe('Erro no background fetch', () => {
    it('com stale: MANTÉM recentTransactions e summary na tela', async () => {
      seedDashboardSnapshot('1', '2026', 'all', stalePayload);
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      const { result } = renderHook(() => useDashboardData('1', '2026', 'all'));

      await waitFor(() => expect(result.current.error).toBeTruthy());

      // Dados stale continuam na tela — não zera
      expect(result.current.recentTransactions).toEqual(stalePayload.data);
      expect(result.current.summary).toEqual(stalePayload.summary);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
    });

    it('sem stale: error real + dados zerados', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      const { result } = renderHook(() => useDashboardData('1', '2026', 'all'));

      await waitFor(() => expect(result.current.error).toBe('Failed to fetch'));
      expect(result.current.recentTransactions).toEqual([]);
      expect(result.current.summary).toEqual({ income: 0, expense: 0, balance: 0 });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// hashDashboardFilters — função pura exportada
// ---------------------------------------------------------------------------

describe('hashDashboardFilters — função pura exportada', () => {
  it('é determinística: mesmos filtros → mesmo hash', () => {
    expect(hashDashboardFilters('1', '2026', 'all')).toBe(
      hashDashboardFilters('1', '2026', 'all'),
    );
  });

  it('muda quando month, year ou fortnight mudam', () => {
    const base = hashDashboardFilters('1', '2026', 'all');
    expect(hashDashboardFilters('2', '2026', 'all')).not.toBe(base);
    expect(hashDashboardFilters('1', '2027', 'all')).not.toBe(base);
    expect(hashDashboardFilters('1', '2026', 'first')).not.toBe(base);
  });
});

// ---------------------------------------------------------------------------
// refresh
// ---------------------------------------------------------------------------

describe('useDashboardData — refresh com stale-while-revalidate', () => {
  it('refresh() mantém dados na tela e roda fetch em background (isFetching)', async () => {
    seedDashboardSnapshot('1', '2026', 'all', stalePayload);
    mockFetch.mockResolvedValue(makeResponse(freshPayload));

    const { result } = renderHook(() => useDashboardData('1', '2026', 'all'));
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.recentTransactions).toEqual(
      sortedByDateDesc(freshPayload.data),
    );

    const { deferred, resolveFetch } = createDeferredFetch();
    mockFetch.mockImplementation(() => deferred);

    act(() => {
      result.current.refresh();
    });

    // Stale continua visível; fetch roda em background (NÃO é skeleton)
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(true);
    expect(result.current.recentTransactions).toEqual(
      sortedByDateDesc(freshPayload.data),
    );

    await act(async () => {
      resolveFetch(makeResponse(freshPayload));
    });

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.recentTransactions).toEqual(
      sortedByDateDesc(freshPayload.data),
    );
    expect(result.current.error).toBeNull();
  });
});