/**
 * Fase RED (TDD) — Issue #9: refatoração de `useTransactions` com
 * stale-while-revalidate + snapshot em localStorage.
 *
 * Este arquivo define o NOVO contrato do hook:
 * - `isLoading`: true APENAS quando NÃO há dado stale (primeiro load/skeleton)
 * - `isFetching`: true quando há stale e o fetch de background roda
 * - Snapshot: `financeguy:cache:transactions:{hashFilters(...)}` com envelope
 *   `{ value: { data, summary }, timestamp, ttl }` (TTL 30min)
 * - Erro com stale: mantém dados + mensagem suave 'Você está offline. Mostrando dados salvos.'
 * - Erro sem stale: error real + transactions=[]
 * - `hashFilters` exportada como função pura
 * - Mutations invalidam o prefixo `financeguy:cache:transactions:`
 *
 * O hook atual (`useTransactions.ts`) AINDA NÃO implementa essas decisões —
 * os testes devem falhar (red) até a implementação da próxima fase.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import useTransactions, { hashFilters } from '../useTransactions';
import type { Transaction, FinancialSummary } from '@/features/transactions/validations';
import type { TransactionFormData } from '@/features/transactions/types';

const CACHE_PREFIX = 'financeguy:cache:transactions:';
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

function makeFormData(): TransactionFormData {
  return {
    description: 'Nova despesa',
    value: '250',
    type: 'expense',
    date: '2026-01-20',
    category: 'Transporte',
    responsible: 'João',
    is_recurring: false,
    paid: false,
  };
}

const stalePayload: { data: Transaction[]; summary: FinancialSummary } = {
  data: [makeTransaction({ id: '99', description: 'Stale', value: 999 })],
  summary: { income: 999, expense: 0, balance: 999 },
};

const freshPayload: { data: Transaction[]; summary: FinancialSummary } = {
  data: [
    makeTransaction({ id: '1', description: 'Salário', value: 5000, type: 'income' }),
    makeTransaction({ id: '2', description: 'Aluguel', value: 1500, paid: true }),
  ],
  summary: { income: 5000, expense: 1500, balance: 3500 },
};

/**
 * Avança o relógio do Jest para uma data fixa (2026-01-15), garantindo que os
 * filtros padrão do hook (mês corrente) sejam Janeiro/2026 — determinístico
 * para o hash do snapshot.
 */
function useFakeDate(year = 2026, month = 0, day = 15) {
  jest.useFakeTimers({ now: new Date(year, month, day) });
}

/** Cria um fetch controlado manualmente (deferred promise). */
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

/** Semeia um snapshot válido no localStorage com o hash dos filtros default. */
function seedTransactionsSnapshot(
  payload: { data: Transaction[]; summary: FinancialSummary },
  ttlMs = TTL_30_MIN,
): void {
  const hash = hashFilters('month', '2026', '01', 'all');
  localStorage.setItem(
    `${CACHE_PREFIX}${hash}`,
    JSON.stringify({ value: payload, timestamp: Date.now(), ttl: ttlMs }),
  );
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  localStorage.clear();
  mockFetch.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// SWR — snapshot do cache
// ---------------------------------------------------------------------------

describe('useTransactions — SWR com snapshot no localStorage', () => {
  describe('Leitura do snapshot (stale-while-revalidate)', () => {
    it('exibe stale IMEDIATAMENTE: isLoading=false, isFetching=true e fetch de background disparado', async () => {
      useFakeDate();
      seedTransactionsSnapshot(stalePayload);
      const { deferred, resolveFetch } = createDeferredFetch();
      mockFetch.mockImplementation(() => deferred);

      const { result } = renderHook(() => useTransactions());

      // Render instantâneo com dados stale — sem esperar o fetch
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(true);
      expect(result.current.transactions).toEqual(stalePayload.data);
      expect(result.current.summary).toEqual(stalePayload.summary);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Quando o background fetch resolve, o estado atualiza
      await act(async () => {
        resolveFetch(makeResponse(freshPayload));
      });

      await waitFor(() => expect(result.current.isFetching).toBe(false));
      expect(result.current.transactions).toEqual(freshPayload.data);
      expect(result.current.summary).toEqual(freshPayload.summary);
      expect(result.current.isLoading).toBe(false);
    });

    it('sem snapshot: isLoading=true, isFetching=false e fetch normal', async () => {
      useFakeDate();
      const { deferred, resolveFetch } = createDeferredFetch();
      mockFetch.mockImplementation(() => deferred);

      const { result } = renderHook(() => useTransactions());

      // Sem stale → skeleton (isLoading) e NÃO há fetch em background
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.transactions).toEqual([]);

      await act(async () => {
        resolveFetch(makeResponse(freshPayload));
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.transactions).toEqual(freshPayload.data);
      expect(result.current.isFetching).toBe(false);
    });

    it('snapshot expirado é tratado como inexistente (isLoading=true + fetch)', async () => {
      useFakeDate();
      const hash = hashFilters('month', '2026', '01', 'all');
      // Snapshot com timestamp antigo (expirou há mais de 30min)
      localStorage.setItem(
        `${CACHE_PREFIX}${hash}`,
        JSON.stringify({
          value: stalePayload,
          timestamp: Date.now() - 2 * 60 * 60 * 1000,
          ttl: TTL_30_MIN,
        }),
      );
      mockFetch.mockResolvedValue(makeResponse(freshPayload));

      const { result } = renderHook(() => useTransactions());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.transactions).toEqual([]);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.transactions).toEqual(freshPayload.data);
    });

    it('snapshot com shape inválido não é exibido como stale (isLoading=true + fetch normal)', async () => {
      useFakeDate();
      const hash = hashFilters('month', '2026', '01', 'all');
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

      const { result } = renderHook(() => useTransactions());

      // Shape inválido → tratado como ausente: skeleton (isLoading) e NÃO há
      // fetch em background; o fetch normal roda uma única vez.
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.transactions).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveFetch(makeResponse(freshPayload));
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.transactions).toEqual(freshPayload.data);
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('Escrita do snapshot (sucesso do fetch)', () => {
    it('grava snapshot com TTL de 30min na chave prefixada pelo hash dos filtros', async () => {
      useFakeDate();
      const setSpy = jest.spyOn(Storage.prototype, 'setItem');
      mockFetch.mockResolvedValue(makeResponse(freshPayload));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const hash = hashFilters('month', '2026', '01', 'all');
      const writeCall = setSpy.mock.calls.find(
        ([key]) => typeof key === 'string' && key.startsWith(CACHE_PREFIX),
      );

      expect(writeCall).toBeDefined();
      const writeKey = writeCall?.[0] as string;
      const writeValue = writeCall?.[1] as string;
      expect(writeKey).toBe(`${CACHE_PREFIX}${hash}`);

      const stored = JSON.parse(writeValue) as {
        value: typeof freshPayload;
        ttl: number;
        timestamp: number;
      };
      expect(stored.ttl).toBe(TTL_30_MIN);
      expect(stored.value).toEqual(freshPayload);
      expect(stored.timestamp).toBeLessThanOrEqual(Date.now());
      expect(result.current.transactions).toEqual(freshPayload.data);
    });
  });

  describe('Erro no background fetch', () => {
    it('com stale: MANTÉM dados na tela + mensagem suave de offline', async () => {
      useFakeDate();
      seedTransactionsSnapshot(stalePayload);
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      const { result } = renderHook(() => useTransactions());

      await waitFor(() =>
        expect(result.current.error).toBe(
          'Você está offline. Mostrando dados salvos.',
        ),
      );

      // Dados stale continuam na tela — não zera
      expect(result.current.transactions).toEqual(stalePayload.data);
      expect(result.current.summary).toEqual(stalePayload.summary);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
    });

    it('sem stale: error real + transactions=[] e summary zerado', async () => {
      useFakeDate();
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => expect(result.current.error).toBe('Failed to fetch'));
      expect(result.current.transactions).toEqual([]);
      expect(result.current.summary).toEqual({ income: 0, expense: 0, balance: 0 });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// hashFilters — função pura exportada
// ---------------------------------------------------------------------------

describe('hashFilters — função pura exportada', () => {
  it('é determinística: mesmos filtros → mesmo hash', () => {
    expect(hashFilters('month', '2026', '01', 'all')).toBe(
      hashFilters('month', '2026', '01', 'all'),
    );
  });

  it('muda quando quinzenalFilter muda', () => {
    const base = hashFilters('month', '2026', '01', 'all');
    expect(hashFilters('first', '2026', '01', 'all')).not.toBe(base);
    expect(hashFilters('second', '2026', '01', 'all')).not.toBe(base);
  });

  it('muda quando ano, mês ou paidFilter mudam', () => {
    const base = hashFilters('month', '2026', '01', 'all');
    expect(hashFilters('month', '2027', '01', 'all')).not.toBe(base);
    expect(hashFilters('month', '2026', '02', 'all')).not.toBe(base);
    expect(hashFilters('month', '2026', '01', 'paid')).not.toBe(base);
    expect(hashFilters('month', '2026', '01', 'unpaid')).not.toBe(base);
  });
});

// ---------------------------------------------------------------------------
// Invalidação do cache em mutations
// ---------------------------------------------------------------------------

describe('useTransactions — invalidação do cache em mutations', () => {
  const mutationCases: Array<{
    name: string;
    run: (r: ReturnType<typeof useTransactions>) => Promise<void>;
  }> = [
    {
      name: 'createTransaction',
      run: (r) => r.createTransaction(makeFormData()),
    },
    {
      name: 'updateTransaction',
      run: (r) => r.updateTransaction('2', { description: 'Editada' }),
    },
    {
      name: 'deleteTransaction',
      run: (r) => r.deleteTransaction('2'),
    },
    {
      name: 'deleteFutureTransactions',
      run: (r) => r.deleteFutureTransactions('2'),
    },
    {
      name: 'updateFutureTransactions',
      run: (r) => r.updateFutureTransactions('2', { description: 'Editada' }),
    },
  ];

  it.each(mutationCases)(
    '$name deve limpar as chaves de cache de transações (clearCacheByPrefix)',
    async ({ run }) => {
      useFakeDate();
      const hash = hashFilters('month', '2026', '01', 'all');
      const tKey1 = `${CACHE_PREFIX}${hash}`;
      const tKey2 = `${CACHE_PREFIX}outro-hash`;
      const dashboardKey = 'financeguy:cache:dashboard:preservar';

      // Semeia snapshots: 2 de transações + 1 de outra área (deve ser preservado)
      localStorage.setItem(
        tKey1,
        JSON.stringify({ value: stalePayload, timestamp: Date.now(), ttl: TTL_30_MIN }),
      );
      localStorage.setItem(
        tKey2,
        JSON.stringify({ value: stalePayload, timestamp: Date.now(), ttl: TTL_30_MIN }),
      );
      localStorage.setItem(
        dashboardKey,
        JSON.stringify({ value: stalePayload, timestamp: Date.now(), ttl: TTL_30_MIN }),
      );

      mockFetch.mockResolvedValue(makeResponse(freshPayload));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isFetching).toBe(false));
      const callsBefore = mockFetch.mock.calls.length;

      await act(async () => {
        await run(result.current);
      });

      // Cache de transações invalidado (todo o prefixo)
      expect(localStorage.getItem(tKey1)).toBeNull();
      expect(localStorage.getItem(tKey2)).toBeNull();
      // Cache de outras áreas intocado
      expect(localStorage.getItem(dashboardKey)).not.toBeNull();
      // Mutation + refetch (GET) executados
      expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore);
    },
  );
});

// ---------------------------------------------------------------------------
// refresh
// ---------------------------------------------------------------------------

describe('useTransactions — refresh com stale-while-revalidate', () => {
  it('refresh() mantém dados na tela e roda fetch em background (isFetching)', async () => {
    useFakeDate();
    seedTransactionsSnapshot(stalePayload);
    mockFetch.mockResolvedValue(makeResponse(freshPayload));

    const { result } = renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.transactions).toEqual(freshPayload.data);

    const { deferred, resolveFetch } = createDeferredFetch();
    mockFetch.mockImplementation(() => deferred);

    act(() => {
      result.current.refresh();
    });

    // Stale continua visível; fetch roda em background (NÃO é skeleton)
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(true);
    expect(result.current.transactions).toEqual(freshPayload.data);

    await act(async () => {
      resolveFetch(makeResponse(freshPayload));
    });

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.transactions).toEqual(freshPayload.data);
    expect(result.current.error).toBeNull();
  });
});