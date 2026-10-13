/**
 * TDD — useOpeningBalance (issue #30)
 *
 * Contrato:
 * 1. Mês / 1ª quinzena: busca saldo anterior ao dia 01; 2ª quinzena: anterior ao dia 16.
 * 2. Repassa os filtros ativos (type, category, search, paid) como query params;
 *    filtros "vazios" (all/''/espaços) não são enviados.
 * 3. Estados: isLoading enquanto busca → openingBalance numérico; erro → openingBalance null + mensagem.
 * 4. Refaz a busca ao mudar filtros/mês e ao mudar mutationKey (após mutation).
 * 5. Busca (search) é debounced; resposta obsoleta nunca sobrescreve a mais recente.
 * 6. Sem dado sensível na URL (apenas filtros e data) e `cache: 'no-store'`.
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import useOpeningBalance, { buildOpeningBalanceUrl, type OpeningBalanceParams } from '../useOpeningBalance';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const ok = (data: number) => ({ ok: true, status: 200, json: async () => ({ data }) });
const fail = () => ({ ok: false, status: 500, json: async () => ({ error: 'x' }) });

const baseParams: OpeningBalanceParams = {
  quinzenalFilter: 'month',
  selectedYear: '2025',
  selectedMonth: '10',
  paidFilter: 'all',
  typeFilter: 'all',
  categoryFilter: '',
  searchFilter: '',
  mutationKey: 0,
};

describe('buildOpeningBalanceUrl', () => {
  it('mês: before = dia 01, sem filtros extras', () => {
    expect(buildOpeningBalanceUrl(baseParams)).toBe('/api/transactions/opening-balance?before=2025-10-01');
  });

  it('1ª quinzena: before = dia 01', () => {
    expect(buildOpeningBalanceUrl({ ...baseParams, quinzenalFilter: 'first' })).toContain('before=2025-10-01');
  });

  it('2ª quinzena: before = dia 16 (inclui a 1ª quinzena no saldo inicial)', () => {
    expect(buildOpeningBalanceUrl({ ...baseParams, quinzenalFilter: 'second' })).toContain('before=2025-10-16');
  });

  it('mês com 1 dígito é normalizado (padStart)', () => {
    expect(buildOpeningBalanceUrl({ ...baseParams, selectedMonth: '3' })).toContain('before=2025-03-01');
  });

  it('repassa filtros ativos e omite os vazios', () => {
    const url = new URL(
      buildOpeningBalanceUrl({
        ...baseParams,
        paidFilter: 'unpaid',
        typeFilter: 'expense',
        categoryFilter: 'Alimentação',
        searchFilter: '  mercado ',
      }),
      'http://localhost',
    );
    expect(url.searchParams.get('paid')).toBe('false');
    expect(url.searchParams.get('type')).toBe('expense');
    expect(url.searchParams.get('category')).toBe('Alimentação');
    expect(url.searchParams.get('search')).toBe('mercado');
  });

  it('paid=paid → true; paid=all → omitido; search só com espaços → omitido', () => {
    const paid = new URL(buildOpeningBalanceUrl({ ...baseParams, paidFilter: 'paid' }), 'http://localhost');
    expect(paid.searchParams.get('paid')).toBe('true');

    const none = new URL(buildOpeningBalanceUrl({ ...baseParams, searchFilter: '   ' }), 'http://localhost');
    expect(none.searchParams.has('paid')).toBe(false);
    expect(none.searchParams.has('search')).toBe(false);
  });
});

describe('useOpeningBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('começa em loading e resolve com o saldo numérico', async () => {
    mockFetch.mockResolvedValue(ok(1500.5));

    const { result } = renderHook(() => useOpeningBalance(baseParams));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.openingBalance).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.openingBalance).toBe(1500.5);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/transactions/opening-balance?before=2025-10-01',
      { cache: 'no-store' },
    );
  });

  it('aceita saldo 0 e negativo como valores válidos (não confunde com ausente)', async () => {
    mockFetch.mockResolvedValue(ok(0));
    const { result, rerender } = renderHook((p: OpeningBalanceParams) => useOpeningBalance(p), {
      initialProps: baseParams,
    });
    await waitFor(() => expect(result.current.openingBalance).toBe(0));

    mockFetch.mockResolvedValue(ok(-250));
    rerender({ ...baseParams, selectedMonth: '11' });
    await waitFor(() => expect(result.current.openingBalance).toBe(-250));
  });

  it('erro HTTP: openingBalance null e mensagem de erro, sem lançar', async () => {
    mockFetch.mockResolvedValue(fail());

    const { result } = renderHook(() => useOpeningBalance(baseParams));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.openingBalance).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('erro de rede (fetch rejeita): trata sem lançar', async () => {
    mockFetch.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useOpeningBalance(baseParams));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.openingBalance).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('payload inválido (data não numérico): trata como erro', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: 'abc' }) });

    const { result } = renderHook(() => useOpeningBalance(baseParams));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.openingBalance).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('refaz a busca ao mudar o mês e volta a loading, sem exibir o saldo antigo', async () => {
    mockFetch.mockResolvedValueOnce(ok(100));
    const { result, rerender } = renderHook((p: OpeningBalanceParams) => useOpeningBalance(p), {
      initialProps: baseParams,
    });
    await waitFor(() => expect(result.current.openingBalance).toBe(100));

    let resolveSecond: (v: unknown) => void = () => undefined;
    mockFetch.mockReturnValueOnce(new Promise((r) => { resolveSecond = r; }));
    rerender({ ...baseParams, selectedMonth: '11' });

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.openingBalance).toBeNull();

    await act(async () => resolveSecond(ok(300)));
    await waitFor(() => expect(result.current.openingBalance).toBe(300));
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/transactions/opening-balance?before=2025-11-01',
      { cache: 'no-store' },
    );
  });

  it('refaz a busca quando mutationKey muda (após criar/editar/excluir)', async () => {
    mockFetch.mockResolvedValue(ok(100));
    const { rerender } = renderHook((p: OpeningBalanceParams) => useOpeningBalance(p), {
      initialProps: baseParams,
    });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    rerender({ ...baseParams, mutationKey: 1 });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  it('resposta obsoleta não sobrescreve a mais recente (race)', async () => {
    let resolveFirst: (v: unknown) => void = () => undefined;
    mockFetch.mockReturnValueOnce(new Promise((r) => { resolveFirst = r; }));
    const { result, rerender } = renderHook((p: OpeningBalanceParams) => useOpeningBalance(p), {
      initialProps: baseParams,
    });

    mockFetch.mockResolvedValueOnce(ok(222));
    rerender({ ...baseParams, selectedMonth: '11' });
    await waitFor(() => expect(result.current.openingBalance).toBe(222));

    await act(async () => resolveFirst(ok(111)));
    expect(result.current.openingBalance).toBe(222);
  });

  describe('debounce da busca', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('digitação rápida gera uma única requisição com o termo final', async () => {
      mockFetch.mockResolvedValue(ok(10));
      const { rerender } = renderHook((p: OpeningBalanceParams) => useOpeningBalance(p), {
        initialProps: baseParams,
      });
      // Mount e mudanças que NÃO são de busca disparam imediatamente.
      expect(mockFetch).toHaveBeenCalledTimes(1);
      mockFetch.mockClear();

      rerender({ ...baseParams, searchFilter: 'm' });
      rerender({ ...baseParams, searchFilter: 'me' });
      rerender({ ...baseParams, searchFilter: 'mer' });

      expect(mockFetch).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain('search=mer');
    });
  });
});
