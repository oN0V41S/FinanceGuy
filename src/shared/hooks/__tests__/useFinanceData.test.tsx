import { renderHook, act } from '@testing-library/react';
import { Transaction } from '@/features/transactions/types';
import useFinanceData from '../useFinanceData';

// Helper to build a Transaction, mirroring the shape used by the hook's mock data.
function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: overrides.id ?? 'x',
    date: overrides.date ?? '2025-09-10',
    value: overrides.value ?? -100,
    description: overrides.description ?? 'Desc',
    responsible: overrides.responsible ?? 'João',
    category: overrides.category ?? 'Outros',
    type: overrides.type ?? 'expense',
    is_recurring: overrides.is_recurring ?? false,
    paid: overrides.paid ?? true,
    ...overrides,
  } as Transaction;
}

function changeEvent(name: string, value: string) {
  return { target: { name, value } } as unknown as React.ChangeEvent<HTMLInputElement>;
}

function submitEvent() {
  return { preventDefault: jest.fn() } as unknown as React.FormEvent;
}

describe('useFinanceData', () => {
  describe('Initial state & effect', () => {
    it('loads mock transactions and defaults month/year on mount', () => {
      const { result } = renderHook(() => useFinanceData());

      expect(result.current.transactions).toHaveLength(6);
      expect(result.current.categories).toEqual([
        'Alimentação',
        'Transporte',
        'Lazer',
        'Saúde',
        'Educação',
        'Casa',
        'Outros',
      ]);
      // selectedMonth/year are set from the current real date
      expect(result.current.selectedMonth).toMatch(/^\d{2}$/);
      expect(result.current.selectedYear).toMatch(/^\d{4}$/);
      expect(result.current.activeTab).toBe('dashboard');
      expect(result.current.filterPeriod).toBe('month');
      expect(Array.isArray(result.current.COLORS)).toBe(true);
      expect(result.current.COLORS).toHaveLength(7);
    });
  });

  describe('handleInputChange', () => {
    it('updates formData fields by name', () => {
      const { result } = renderHook(() => useFinanceData());

      act(() => result.current.handleInputChange(changeEvent('description', 'Mercado')));
      act(() => result.current.handleInputChange(changeEvent('value', '99.90')));

      expect(result.current.formData.description).toBe('Mercado');
      expect(result.current.formData.value).toBe('99.90');
    });
  });

  describe('openModal / closeModal', () => {
    it('openModal with a transaction populates editing state and abs value', () => {
      const { result } = renderHook(() => useFinanceData());
      const tx = makeTransaction({ id: '1', value: -150.5, type: 'expense' });

      act(() => result.current.openModal(tx));

      expect(result.current.editingTransaction?.id).toBe('1');
      // value stored as string absolute for editing
      expect(result.current.formData.value).toBe('150.5');
      expect(result.current.formData.type).toBe('expense');
    });

    it('openModal with null resets editing state and formData', () => {
      const { result } = renderHook(() => useFinanceData());
      const tx = makeTransaction({ id: '1', value: -150.5 });

      act(() => result.current.openModal(tx));
      expect(result.current.editingTransaction).not.toBeNull();

      act(() => result.current.openModal(null));
      expect(result.current.editingTransaction).toBeNull();
    });

    it('closeModal resets editing transaction and formData', () => {
      const { result } = renderHook(() => useFinanceData());
      const tx = makeTransaction({ id: '1' });

      act(() => result.current.openModal(tx));
      act(() => result.current.closeModal());

      expect(result.current.editingTransaction).toBeNull();
      expect(result.current.formData).toEqual(
        expect.objectContaining({ description: '', value: '', date: '' })
      );
    });
  });

  describe('handleSubmit', () => {
    it('returns early when required fields are missing', () => {
      const { result } = renderHook(() => useFinanceData());
      const initialCount = result.current.transactions.length;

      act(() => result.current.handleSubmit(submitEvent()));

      expect(result.current.transactions).toHaveLength(initialCount);
    });

    it('creates a new expense transaction (negative value) when not editing', () => {
      const { result } = renderHook(() => useFinanceData());
      const initialCount = result.current.transactions.length;

      act(() => result.current.handleInputChange(changeEvent('date', '2025-09-25')));
      act(() => result.current.handleInputChange(changeEvent('value', '200')));
      act(() => result.current.handleInputChange(changeEvent('description', 'Nova')));
      act(() => result.current.handleSubmit(submitEvent()));

      expect(result.current.transactions).toHaveLength(initialCount + 1);
      const created = result.current.transactions[result.current.transactions.length - 1];
      expect(created.value).toBe(-200);
      expect(created.description).toBe('Nova');
      // modal closed after submit
      expect(result.current.editingTransaction).toBeNull();
    });

    it('creates a new income transaction (positive value)', () => {
      const { result } = renderHook(() => useFinanceData());

      act(() => result.current.handleInputChange(changeEvent('date', '2025-09-25')));
      act(() => result.current.handleInputChange(changeEvent('value', '1200')));
      act(() => result.current.handleInputChange(changeEvent('description', 'Bônus')));
      act(() => result.current.handleInputChange(changeEvent('type', 'income')));
      act(() => result.current.handleSubmit(submitEvent()));

      const created = result.current.transactions[result.current.transactions.length - 1];
      expect(created.value).toBe(1200);
      expect(created.type).toBe('income');
    });

    it('updates an existing transaction when editing', () => {
      const { result } = renderHook(() => useFinanceData());
      const tx = makeTransaction({ id: '2', value: 5000, type: 'income' });

      act(() => result.current.openModal(tx));
      act(() => result.current.handleInputChange(changeEvent('value', '6000')));
      act(() => result.current.handleSubmit(submitEvent()));

      const updated = result.current.transactions.find((t) => t.id === '2');
      expect(updated?.value).toBe(6000);
    });
  });

  describe('Category handlers', () => {
    it('addCategory trims, adds, and closes the add UI', () => {
      const { result } = renderHook(() => useFinanceData());
      const before = result.current.categories.length;

      act(() => result.current.setNewCategory('  Novo  '));
      act(() => result.current.addCategory());

      expect(result.current.categories).toHaveLength(before + 1);
      expect(result.current.categories).toContain('Novo');
      expect(result.current.newCategory).toBe('');
      expect(result.current.showAddCategory).toBe(false);
    });

    it('addCategory ignores empty or duplicate categories', () => {
      const { result } = renderHook(() => useFinanceData());
      const before = result.current.categories.length;

      act(() => result.current.setNewCategory('   '));
      act(() => result.current.addCategory());
      expect(result.current.categories).toHaveLength(before);

      act(() => result.current.setNewCategory('Lazer'));
      act(() => result.current.addCategory());
      expect(result.current.categories).toHaveLength(before);
    });

    it('removeCategory removes the given category', () => {
      const { result } = renderHook(() => useFinanceData());
      const before = result.current.categories.length;

      act(() => result.current.removeCategory('Lazer'));

      expect(result.current.categories).toHaveLength(before - 1);
      expect(result.current.categories).not.toContain('Lazer');
    });
  });

  describe('Delete handlers', () => {
    it('handleDeleteRequest sets the pending transaction id', () => {
      const { result } = renderHook(() => useFinanceData());

      act(() => result.current.handleDeleteRequest('3'));
      expect(result.current.transactionToDelete).toBe('3');
    });

    it('confirmDelete removes the transaction', () => {
      const { result } = renderHook(() => useFinanceData());
      const before = result.current.transactions.length;

      act(() => result.current.handleDeleteRequest('3'));
      act(() => result.current.confirmDelete());

      expect(result.current.transactions).toHaveLength(before - 1);
      expect(result.current.transactions.find((t) => t.id === '3')).toBeUndefined();
      expect(result.current.transactionToDelete).toBeNull();
    });

    it('confirmDelete does nothing when no transaction pending', () => {
      const { result } = renderHook(() => useFinanceData());
      const before = result.current.transactions.length;

      act(() => result.current.confirmDelete());

      expect(result.current.transactions).toHaveLength(before);
    });
  });

  describe('Filtering & calculations', () => {
    // The hook does not expose filteredTransactions; we assert filtering through
    // the derived totals / chartData instead.
    it('filterPeriod "all" returns every transaction', () => {
      const { result } = renderHook(() => useFinanceData());

      act(() => result.current.setFilterPeriod('all'));

      expect(result.current.totalIncome).toBe(5000);
      expect(result.current.totalExpenses).toBeCloseTo(645.5, 2);
      expect(result.current.balance).toBeCloseTo(4354.5, 2);
    });

    it('filters by selected month/year (2025-09 excludes the 2025-08 tx)', () => {
      const { result } = renderHook(() => useFinanceData());

      act(() => result.current.setFilterPeriod('month'));
      act(() => result.current.setSelectedMonth('09'));
      act(() => result.current.setSelectedYear('2025'));

      // 5 of 6 mock transactions are in 2025-09 (one is 2025-08, value -250)
      expect(result.current.totalIncome).toBe(5000);
      expect(result.current.totalExpenses).toBeCloseTo(395.5, 2); // 645.5 - 250
      expect(result.current.balance).toBeCloseTo(4604.5, 2);
      expect(result.current.chartData.length).toBe(4);
    });

    it('fortnight "1" keeps only days <= 15 within the month', () => {
      const { result } = renderHook(() => useFinanceData());

      act(() => result.current.setFilterPeriod('fortnight'));
      act(() => result.current.setSelectedMonth('09'));
      act(() => result.current.setSelectedYear('2025'));
      act(() => result.current.setSelectedFortnight('1'));

      // 2025-09 with day <= 15: ids 1(15), 2(01), 3(10), 6(05)
      expect(result.current.totalIncome).toBe(5000); // id2 (2025-09-01)
      expect(result.current.totalExpenses).toBeCloseTo(350.5, 2); // 150.5 + 80 + 120
      expect(result.current.chartData.length).toBe(3);
    });

    it('fortnight "2" keeps only days > 15 within the month', () => {
      const { result } = renderHook(() => useFinanceData());

      act(() => result.current.setFilterPeriod('fortnight'));
      act(() => result.current.setSelectedMonth('09'));
      act(() => result.current.setSelectedYear('2025'));
      act(() => result.current.setSelectedFortnight('2'));

      // 2025-09-20 only
      expect(result.current.totalIncome).toBe(0);
      expect(result.current.totalExpenses).toBe(45);
      expect(result.current.balance).toBe(-45);
      expect(result.current.chartData).toEqual([{ name: 'Saúde', value: 45 }]);
    });

    it('fortnight "0" returns all transactions within the month', () => {
      const { result } = renderHook(() => useFinanceData());

      act(() => result.current.setFilterPeriod('fortnight'));
      act(() => result.current.setSelectedMonth('09'));
      act(() => result.current.setSelectedYear('2025'));
      act(() => result.current.setSelectedFortnight('0'));

      expect(result.current.totalExpenses).toBeCloseTo(395.5, 2);
      expect(result.current.chartData.length).toBe(4);
    });

    it('returns empty chartData and zero totals when no transactions match', () => {
      const { result } = renderHook(() => useFinanceData());

      // Exclude all transactions via a non-matching month
      act(() => result.current.setFilterPeriod('month'));
      act(() => result.current.setSelectedMonth('01'));
      act(() => result.current.setSelectedYear('1999'));

      expect(result.current.chartData).toEqual([]);
      expect(result.current.totalIncome).toBe(0);
      expect(result.current.totalExpenses).toBe(0);
      expect(result.current.balance).toBe(0);
    });

    it('builds chartData grouped by category sorted by value desc', () => {
      const { result } = renderHook(() => useFinanceData());

      act(() => result.current.setFilterPeriod('all'));

      const chart = result.current.chartData;
      expect(chart.length).toBe(5);
      // Largest expense category is Lazer (250)
      expect(chart[0]).toEqual({ name: 'Lazer', value: 250 });
      for (let i = 1; i < chart.length; i++) {
        expect(chart[i - 1].value).toBeGreaterThanOrEqual(chart[i].value);
      }
    });

    it('sortedTransactions returns a Transaction array for the filtered set', () => {
      const { result } = renderHook(() => useFinanceData());

      act(() => result.current.setFilterPeriod('all'));

      expect(result.current.sortedTransactions).toHaveLength(6);
      result.current.sortedTransactions.forEach((t) => {
        expect(t).toHaveProperty('id');
      });
    });
  });
});
