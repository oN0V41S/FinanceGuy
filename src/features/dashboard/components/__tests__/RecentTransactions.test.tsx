import { render, screen } from '@testing-library/react';
import { RecentTransactions } from '../RecentTransactions';
import type { Transaction } from '@/features/transactions/validations';

jest.mock('next/link', () => {
  const MockLink = ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

function createMockTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    type: 'expense',
    description: 'Almoço no restaurante',
    value: 45.9,
    date: '2026-07-10',
    category: 'Alimentação',
    responsible: 'João',
    paid: true,
    is_recurring: false,
    ...overrides,
  };
}

describe('RecentTransactions', () => {
  describe('loading state', () => {
    it('shows 5 skeleton rows when isLoading is true', () => {
      const { container } = render(
        <RecentTransactions transactions={[]} isLoading={true} />
      );
      const skeletonRows = container.querySelectorAll('.space-y-3 > div');
      expect(skeletonRows.length).toBe(5);
    });

    it('loading state takes priority over empty transactions', () => {
      const { container } = render(
        <RecentTransactions transactions={[]} isLoading={true} />
      );
      expect(screen.getByText('Transações Recentes')).toBeInTheDocument();
      expect(screen.queryByText('Nenhuma transação recente')).not.toBeInTheDocument();
      const skeletonRows = container.querySelectorAll('.space-y-3 > div');
      expect(skeletonRows.length).toBe(5);
    });
  });

  describe('empty state', () => {
    it('shows empty message when transactions array is empty and not loading', () => {
      render(<RecentTransactions transactions={[]} isLoading={false} />);
      expect(screen.getByText('Nenhuma transação recente')).toBeInTheDocument();
    });

    it('does not show skeleton loaders when not loading', () => {
      const { container } = render(
        <RecentTransactions transactions={[]} isLoading={false} />
      );
      const skeletonRows = container.querySelectorAll('.space-y-3 > div');
      expect(skeletonRows.length).toBe(0);
    });
  });

  describe('transaction list', () => {
    it('renders transaction with correct description', () => {
      const transaction = createMockTransaction({
        description: 'Supermercado Extra',
      });
      render(<RecentTransactions transactions={[transaction]} />);
      expect(screen.getByText('Supermercado Extra')).toBeInTheDocument();
    });

    it('renders transaction with correct date formatted as DD/MM', () => {
      const transaction = createMockTransaction({ date: '2026-03-05' });
      render(<RecentTransactions transactions={[transaction]} />);
      expect(screen.getByText('05/03')).toBeInTheDocument();
    });

    it('renders transaction with correct category badge', () => {
      const transaction = createMockTransaction({ category: 'Transporte' });
      render(<RecentTransactions transactions={[transaction]} />);
      expect(screen.getByText('Transporte')).toBeInTheDocument();
    });

    it('renders transaction with correct responsible name', () => {
      const transaction = createMockTransaction({ responsible: 'Maria' });
      render(<RecentTransactions transactions={[transaction]} />);
      expect(screen.getByText('Maria')).toBeInTheDocument();
    });

    it('shows "+" prefix for income transactions', () => {
      const transaction = createMockTransaction({
        type: 'income',
        value: 5000,
        description: 'Salário',
      });
      render(<RecentTransactions transactions={[transaction]} />);
      expect(screen.getByText(/\+.*R\$/)).toBeInTheDocument();
    });

    it('shows "-" prefix for expense transactions', () => {
      const transaction = createMockTransaction({
        type: 'expense',
        value: 120.5,
      });
      render(<RecentTransactions transactions={[transaction]} />);
      expect(screen.getByText(/-.*R\$/)).toBeInTheDocument();
    });

    it('formats value as BRL currency', () => {
      const transaction = createMockTransaction({
        type: 'income',
        value: 1234.56,
      });
      render(<RecentTransactions transactions={[transaction]} />);
      expect(screen.getByText(/\+.*R\$\s*1\.234,56/)).toBeInTheDocument();
    });

    it('formats value with thousands separator', () => {
      const transaction = createMockTransaction({
        type: 'income',
        value: 10000,
      });
      render(<RecentTransactions transactions={[transaction]} />);
      expect(screen.getByText(/\+.*R\$\s*10\.000,00/)).toBeInTheDocument();
    });

    it('"Ver todas" button links to /transactions', () => {
      const transaction = createMockTransaction();
      render(<RecentTransactions transactions={[transaction]} />);
      const link = screen.getByText('Ver todas').closest('a');
      expect(link).toHaveAttribute('href', '/transactions');
    });
  });

  describe('multiple transactions', () => {
    it('renders multiple transactions correctly', () => {
      const transactions = [
        createMockTransaction({
          id: '550e8400-e29b-41d4-a716-446655440001',
          description: 'Uber',
          category: 'Transporte',
          value: 35,
          type: 'expense',
          date: '2026-07-12',
          responsible: 'Ana',
        }),
        createMockTransaction({
          id: '550e8400-e29b-41d4-a716-446655440002',
          description: 'Freelance',
          category: 'Salário',
          value: 2000,
          type: 'income',
          date: '2026-07-11',
          responsible: 'Carlos',
        }),
        createMockTransaction({
          id: '550e8400-e29b-41d4-a716-446655440003',
          description: 'Academia',
          category: 'Saúde',
          value: 99.9,
          type: 'expense',
          date: '2026-07-09',
          responsible: 'João',
        }),
      ];
      render(<RecentTransactions transactions={transactions} />);

      expect(screen.getByText('Uber')).toBeInTheDocument();
      expect(screen.getByText('Freelance')).toBeInTheDocument();
      expect(screen.getByText('Academia')).toBeInTheDocument();

      expect(screen.getByText('Transporte')).toBeInTheDocument();
      expect(screen.getByText('Salário')).toBeInTheDocument();
      expect(screen.getByText('Saúde')).toBeInTheDocument();

      expect(screen.getByText('Ana')).toBeInTheDocument();
      expect(screen.getByText('Carlos')).toBeInTheDocument();
      expect(screen.getByText('João')).toBeInTheDocument();

      expect(screen.getByText('12/07')).toBeInTheDocument();
      expect(screen.getByText('11/07')).toBeInTheDocument();
      expect(screen.getByText('09/07')).toBeInTheDocument();
    });

    it('renders correct prefix and value for mixed income/expense', () => {
      const transactions = [
        createMockTransaction({
          id: '550e8400-e29b-41d4-a716-446655440010',
          type: 'income',
          value: 3000,
          description: 'Salário',
        }),
        createMockTransaction({
          id: '550e8400-e29b-41d4-a716-446655440011',
          type: 'expense',
          value: 250,
          description: 'Aluguel',
        }),
      ];
      render(<RecentTransactions transactions={transactions} />);

      expect(screen.getByText(/\+.*R\$\s*3\.000,00/)).toBeInTheDocument();
      expect(screen.getByText(/-.*R\$\s*250,00/)).toBeInTheDocument();
    });
  });
});
