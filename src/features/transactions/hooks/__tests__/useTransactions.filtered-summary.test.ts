import { renderHook, act, waitFor } from '@testing-library/react';
import useTransactions from '../useTransactions';
import type { Transaction } from '@/features/transactions/validations';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'id',
    date: '2026-01-15',
    description: 'Transação',
    value: 100,
    type: 'expense',
    category: 'Casa',
    responsible: 'Eu',
    paid: false,
    is_recurring: false,
    ...overrides,
  };
}

const txs: Transaction[] = [
  makeTx({ id: '1', description: 'Salário', value: 5000, type: 'income', category: 'Salário' }),
  makeTx({ id: '2', description: 'Aluguel', value: 1500.5, type: 'expense' }),
  makeTx({ id: '3', description: 'Mercado', value: 300, type: 'expense', category: 'Alimentação' }),
];

const apiSummary = { income: 5000, expense: 1800.5, balance: 3199.5 };

async function setup() {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: txs, summary: apiSummary, total: txs.length }),
  });
  const hook = renderHook(() => useTransactions());
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

beforeEach(() => {
  localStorage.clear();
  mockFetch.mockReset();
});

describe('useTransactions — resumo acompanha filtros do cliente (issue #31)', () => {
  it('sem filtros usa o summary da API', async () => {
    const { result } = await setup();
    expect(result.current.summary).toEqual(apiSummary);
  });

  it('filtro Entradas recalcula o resumo apenas com entradas', async () => {
    const { result } = await setup();
    act(() => result.current.setTypeFilter('income'));
    expect(result.current.summary).toEqual({ income: 5000, expense: 0, balance: 5000 });
  });

  it('filtro Saídas recalcula o resumo apenas com saídas (saldo negativo)', async () => {
    const { result } = await setup();
    act(() => result.current.setTypeFilter('expense'));
    expect(result.current.summary).toEqual({ income: 0, expense: 1800.5, balance: -1800.5 });
  });

  it('busca por valor "300" encontra a transação e recalcula o resumo', async () => {
    const { result } = await setup();
    act(() => result.current.setSearchFilter('300'));
    expect(result.current.transactions.map((t) => t.id)).toEqual(['3']);
    expect(result.current.summary).toEqual({ income: 0, expense: 300, balance: -300 });
  });

  it.each(['R$ 300,00', '300,00', '300.00', 'r$300'])(
    'busca por valor formatado "%s" encontra a transação de R$ 300',
    async (query) => {
      const { result } = await setup();
      act(() => result.current.setSearchFilter(query));
      expect(result.current.transactions.map((t) => t.id)).toEqual(['3']);
    },
  );

  it('busca por valor com milhar "R$ 5.000,00" encontra a entrada', async () => {
    const { result } = await setup();
    act(() => result.current.setSearchFilter('R$ 5.000,00'));
    expect(result.current.transactions.map((t) => t.id)).toEqual(['1']);
  });

  it('Entradas + busca por valor de saída resulta em lista vazia e resumo zerado', async () => {
    const { result } = await setup();
    act(() => {
      result.current.setTypeFilter('income');
      result.current.setSearchFilter('300');
    });
    expect(result.current.transactions).toEqual([]);
    expect(result.current.summary).toEqual({ income: 0, expense: 0, balance: 0 });
  });

  it('busca textual continua funcionando por descrição', async () => {
    const { result } = await setup();
    act(() => result.current.setSearchFilter('aluguel'));
    expect(result.current.transactions.map((t) => t.id)).toEqual(['2']);
  });
});
