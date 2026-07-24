import { renderHook, act, waitFor } from '@testing-library/react';
import useTransactions from '../useTransactions';
import type { Transaction } from '@/features/transactions/validations';
import type { TransactionFormData } from '@/features/transactions/types';
import type { FortnightValue } from '@/features/dashboard/components/FortnightFilter';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function makeResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => data,
  };
}

function makeTransaction(
  overrides: Partial<Transaction> = {},
): Transaction {
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

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockTransactions: Transaction[] = [
  makeTransaction({
    id: '1',
    description: 'Salário',
    value: 5000,
    type: 'income',
    date: '2026-01-05',
    category: 'Salário',
    responsible: 'João',
  }),
  makeTransaction({
    id: '2',
    description: 'Aluguel',
    value: 1500,
    type: 'expense',
    date: '2026-01-01',
    category: 'Casa',
    responsible: 'João',
    paid: true,
  }),
  makeTransaction({
    id: '3',
    description: 'Mercado',
    value: 800,
    type: 'expense',
    date: '2026-01-10',
    category: 'Alimentação',
    responsible: 'Maria',
  }),
];

const mockSummary = { income: 5000, expense: 2300, balance: 2700 };

const mockApiResponse = {
  data: mockTransactions,
  summary: mockSummary,
  total: mockTransactions.length,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Avança o relógio do Jest para uma data fixa (2026-01-15).
 * Isso garante que o filtro padrão "mês corrente" sempre use Janeiro/2026.
 */
function useFakeDate(year = 2026, month = 0, day = 15) {
  jest.useFakeTimers({ now: new Date(year, month, day) });
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  mockFetch.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTransactions', () => {
  // =========================================================================
  // Green Paths
  // =========================================================================

  describe('Green path — fetch inicial e dados', () => {
    it('deve realizar fetch inicial na montagem com filtro do mês corrente', async () => {
      useFakeDate(2026, 0, 15); // 2026-01-15
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());

      // Estado inicial — loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.transactions).toEqual([]);

      // Após conclusão
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      // Deve chamar com startDate=2026-01-01 e endDate=2026-01-31
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('startDate=2026-01-01');
      expect(callUrl).toContain('endDate=2026-01-31');
      expect(result.current.transactions).toHaveLength(3);
      expect(result.current.summary).toEqual(mockSummary);
      expect(result.current.error).toBeNull();
    });

    it('deve expor dados corretos após fetch bem-sucedido', async () => {
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() =>
        useTransactions(),
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.transactions).toEqual(mockTransactions);
      expect(result.current.summary).toEqual(mockSummary);
      expect(result.current.error).toBeNull();
      expect(result.current.filterPeriod).toBe('month');
      expect(result.current.selectedMonth).toBeDefined();
      expect(result.current.selectedYear).toBeDefined();
      // Modal deve começar fechado
      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.editingTransaction).toBeNull();
    });

    it('deve aceitar array vazio de transações', async () => {
      const emptyResponse = { data: [], summary: { income: 0, expense: 0, balance: 0 }, total: 0 };
      mockFetch.mockResolvedValue(makeResponse(emptyResponse));

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.transactions).toEqual([]);
      expect(result.current.summary).toEqual({ income: 0, expense: 0, balance: 0 });
      expect(result.current.error).toBeNull();
    });
  });

  describe('Green path — refresh', () => {
    it('refresh() deve reexecutar o fetch', async () => {
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Act — refresh
      act(() => {
        result.current.refresh();
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Green path — filtros', () => {
    it('deve iniciar com filterPeriod="month" e mês/year atuais', async () => {
      useFakeDate(2026, 5, 10); // 2026-06-10
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.filterPeriod).toBe('month');
      expect(result.current.selectedMonth).toBe('06');
      expect(result.current.selectedYear).toBe('2026');
    });

    it('setFilterPeriod("fortnight") deve disparar fetch com datas da quinzena', async () => {
      useFakeDate(2026, 0, 15); // Janeiro
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Act — mudar para "fortnight" (deve usar a quinzena atual = second, já que dia 15)
      act(() => {
        result.current.setFilterPeriod('fortnight');
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
      expect(result.current.filterPeriod).toBe('fortnight');

      const lastCallUrl = mockFetch.mock.calls[1][0] as string;
      expect(lastCallUrl).toContain('startDate=2026-01-16');
      expect(lastCallUrl).toContain('endDate=2026-01-31');
    });

    it('mudar selectedMonth deve disparar novo fetch', async () => {
      useFakeDate(2026, 0, 15);
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Act — mudar mês
      act(() => {
        result.current.setSelectedMonth('02');
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
      expect(result.current.selectedMonth).toBe('02');
      const lastCallUrl = mockFetch.mock.calls[1][0] as string;
      expect(lastCallUrl).toContain('startDate=2026-02-01');
    });

    it('mudar selectedYear deve disparar novo fetch', async () => {
      useFakeDate(2026, 0, 15);
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Act — mudar ano
      act(() => {
        result.current.setSelectedYear('2027');
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
      expect(result.current.selectedYear).toBe('2027');
      const lastCallUrl = mockFetch.mock.calls[1][0] as string;
      expect(lastCallUrl).toContain('startDate=2027-01-01');
    });

    it('mudar selectedFortnight deve disparar novo fetch', async () => {
      useFakeDate(2026, 0, 15);
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Act — mudar quinzena
      act(() => {
        result.current.setSelectedFortnight('first');
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
      expect(result.current.selectedFortnight).toBe('first');
    });
  });

  describe('Green path — CRUD', () => {
    it('createTransaction(data) deve fazer POST e depois refresh', async () => {
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const newTransactionData: TransactionFormData = {
        description: 'Nova despesa',
        value: '250',
        type: 'expense',
        date: '2026-01-20',
        category: 'Transporte',
        responsible: 'João',
        is_recurring: false,
        paid: false,
      };

      // Configurar mock para POST e depois para o refresh
      mockFetch
        .mockResolvedValueOnce(makeResponse({ data: { ...newTransactionData, id: '4' } }, true, 201))
        .mockResolvedValue(makeResponse(mockApiResponse));

      await act(async () => {
        await result.current.createTransaction(newTransactionData);
      });

      // Deve ter chamado POST + refresh = +2 chamadas
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verificar chamada POST
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/api/transactions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: expect.stringContaining('"description":"Nova despesa"'),
        }),
      );

      // Terceira chamada deve ser o GET do refresh
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('/api/transactions'),
        undefined, // GET sem options
      );
    });

    it('updateTransaction(id, data) deve fazer PUT e depois refresh', async () => {
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Configurar mock para PUT e depois refresh
      mockFetch
        .mockResolvedValueOnce(makeResponse({ data: { id: '2', description: 'Aluguel atualizado' } }))
        .mockResolvedValue(makeResponse(mockApiResponse));

      await act(async () => {
        await result.current.updateTransaction('2', { description: 'Aluguel atualizado' });
      });

      // POST + refresh = +2
      expect(mockFetch).toHaveBeenCalledTimes(3);

      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/api/transactions/2'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: expect.stringContaining('"description":"Aluguel atualizado"'),
        }),
      );

      // Terceira chamada deve ser o GET do refresh
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('/api/transactions'),
        undefined,
      );
    });

    it('deleteTransaction(id) deve fazer DELETE e depois refresh', async () => {
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      mockFetch
        .mockResolvedValueOnce(makeResponse({ success: true, id: '3' }))
        .mockResolvedValue(makeResponse(mockApiResponse));

      await act(async () => {
        await result.current.deleteTransaction('3');
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);

      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/api/transactions/3'),
        expect.objectContaining({
          method: 'DELETE',
        }),
      );

      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('/api/transactions'),
        undefined,
      );
    });
  });

  describe('Green path — modal state', () => {
    it('openCreateModal() deve abrir modal sem transaction', async () => {
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.openCreateModal();
      });

      expect(result.current.isModalOpen).toBe(true);
      expect(result.current.editingTransaction).toBeNull();
    });

    it('openEditModal(transaction) deve abrir modal com transaction para edição', async () => {
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const transaction = mockTransactions[0];

      act(() => {
        result.current.openEditModal(transaction);
      });

      expect(result.current.isModalOpen).toBe(true);
      expect(result.current.editingTransaction).toEqual(transaction);
    });

    it('closeModal() deve fechar modal e limpar editingTransaction', async () => {
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Abre modal de edição
      act(() => {
        result.current.openEditModal(mockTransactions[0]);
      });
      expect(result.current.isModalOpen).toBe(true);

      // Fecha modal
      act(() => {
        result.current.closeModal();
      });

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.editingTransaction).toBeNull();
    });
  });

  // =========================================================================
  // Red Paths — estados de erro
  // =========================================================================

  describe('Red path — erro no fetch', () => {
    it('deve setar error quando API retorna status não-OK', async () => {
      mockFetch.mockResolvedValue(makeResponse(null, false, 500));

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe('Erro ao carregar transações');
      expect(result.current.transactions).toEqual([]);
      expect(result.current.summary).toEqual({ income: 0, expense: 0, balance: 0 });
    });

    it('deve setar error quando fetch lança exceção de rede', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe('Network error');
      expect(result.current.transactions).toEqual([]);
    });

    it('deve usar mensagem fallback quando erro não é instância de Error', async () => {
      mockFetch.mockRejectedValue('erro qualquer');

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe('Erro desconhecido');
      expect(result.current.transactions).toEqual([]);
    });

    it('deve limpar error ao fazer refresh com sucesso', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Falha na rede'))
        .mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());

      await waitFor(() => expect(result.current.error).toBe('Falha na rede'));

      // Act — refresh
      act(() => {
        result.current.refresh();
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeNull();
      expect(result.current.transactions).toHaveLength(3);
    });
  });

  describe('Red path — erro no CRUD', () => {
    it('createTransaction deve propagar erro quando POST falha', async () => {
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      mockFetch.mockResolvedValue(makeResponse({ error: 'Validação falhou' }, false, 400));

      const data: TransactionFormData = {
        description: '',
        value: '',
        type: 'expense',
        date: '',
        category: 'Outros',
        responsible: '',
        is_recurring: false,
        paid: false,
      };

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.createTransaction(data);
        } catch (err) {
          error = err as Error;
        }
      });

      expect(error).not.toBeNull();
      // refresh NÃO deve ter sido chamado após erro
      // Total: 1 (fetch inicial) + 1 (POST falho) = 2
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('updateTransaction deve propagar erro quando PUT falha', async () => {
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      mockFetch.mockResolvedValue(makeResponse({ error: 'Transação não encontrada' }, false, 404));

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.updateTransaction('inexistente', { description: 'teste' });
        } catch (err) {
          error = err as Error;
        }
      });

      expect(error).not.toBeNull();
    });

    it('deleteTransaction deve propagar erro quando DELETE falha', async () => {
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      mockFetch.mockResolvedValue(makeResponse({ error: 'Transação não encontrada' }, false, 404));

      let error: Error | null = null;
      await act(async () => {
        try {
          await result.current.deleteTransaction('inexistente');
        } catch (err) {
          error = err as Error;
        }
      });

      expect(error).not.toBeNull();
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('Edge cases — filtros', () => {
    it('filterPeriod="fortnight" com selectedFortnight="first" deve usar 1-15', async () => {
      useFakeDate(2026, 0, 15);
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.setFilterPeriod('fortnight');
        result.current.setSelectedFortnight('first');
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const lastCallUrl = mockFetch.mock.calls[1][0] as string;
      expect(lastCallUrl).toContain('startDate=2026-01-01');
      expect(lastCallUrl).toContain('endDate=2026-01-15');
    });

    it('filterPeriod="fortnight" com selectedFortnight="second" deve usar 16-31', async () => {
      useFakeDate(2026, 0, 15);
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.setFilterPeriod('fortnight');
        result.current.setSelectedFortnight('second');
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const lastCallUrl = mockFetch.mock.calls[1][0] as string;
      expect(lastCallUrl).toContain('startDate=2026-01-16');
      expect(lastCallUrl).toContain('endDate=2026-01-31');
    });

    it('filterPeriod="fortnight" em fevereiro ano bissexto deve usar 16-29', async () => {
      useFakeDate(2024, 1, 20); // Fevereiro de 2024 (bissexto)
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Mudar para fevereiro e quinzena
      act(() => {
        result.current.setSelectedMonth('02');
        result.current.setSelectedYear('2024');
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.setFilterPeriod('fortnight');
        result.current.setSelectedFortnight('second');
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const lastCallUrl = mockFetch.mock.calls[1][0] as string;
      expect(lastCallUrl).toContain('startDate=2024-02-16');
      expect(lastCallUrl).toContain('endDate=2024-02-29');
    });

    it('mudar filterPeriod para "fortnight" e voltar para "month" reativa datas mensais', async () => {
      useFakeDate(2026, 0, 14); // day 14 → first fortnight
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Vai para "fortnight"
      act(() => { result.current.setFilterPeriod('fortnight'); });
      await waitFor(() => {
        const calls = mockFetch.mock.calls;
        const lastCall = calls[calls.length - 1];
        const url = lastCall[0] as string;
        expect(url).toContain('startDate=2026-01-01');
        expect(url).toContain('endDate=2026-01-15');
      });

      // Volta para "month"
      act(() => { result.current.setFilterPeriod('month'); });
      await waitFor(() => {
        const calls = mockFetch.mock.calls;
        const lastCall = calls[calls.length - 1];
        const url = lastCall[0] as string;
        expect(url).toContain('startDate=2026-01-01');
        expect(url).toContain('endDate=2026-01-31');
      });
    });
  });

  describe('Edge cases — estados de transição', () => {
    it('isLoading deve ser true durante o fetch e false após', async () => {
      // Usar um deferred para controlar tempo
      let resolvePromise!: (value: unknown) => void;
      const deferred = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockImplementation(() => deferred.then(() => makeResponse(mockApiResponse)));

      const { result } = renderHook(() => useTransactions());

      // Ainda deve estar carregando
      expect(result.current.isLoading).toBe(true);

      // Resolver a promise
      await act(async () => {
        resolvePromise(null);
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.transactions).toEqual(mockTransactions);
    });

    it('isLoading deve ser true durante refresh', async () => {
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.refresh();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));
    });
  });

  describe('Edge cases — reset de filtros', () => {
    it('setFilterPeriod("month") deve resetar selectedFortnight para "all"', async () => {
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Ir para fortnight
      act(() => { result.current.setFilterPeriod('fortnight'); });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Voltar para month
      act(() => { result.current.setFilterPeriod('month'); });

      expect(result.current.selectedFortnight).toBe('all');
    });

    it('setFilterPeriod("all") deve resetar selectedFortnight para "all"', async () => {
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.setFilterPeriod('fortnight'); });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.setFilterPeriod('all'); });

      expect(result.current.selectedFortnight).toBe('all');
    });
  });

  describe('Edge cases — múltiplas mudanças de filtro', () => {
    it('mudar mês e ano simultaneamente só dispara um fetch', async () => {
      useFakeDate(2026, 0, 15);
      mockFetch.mockResolvedValue(makeResponse(mockApiResponse));

      const { result } = renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      const callsAfterMount = mockFetch.mock.calls.length;

      // Mudar mês e ano no mesmo act
      act(() => {
        result.current.setSelectedMonth('12');
        result.current.setSelectedYear('2025');
      });

      await waitFor(() => expect(mockFetch.mock.calls.length).toBe(callsAfterMount + 1));
    });
  });
});
