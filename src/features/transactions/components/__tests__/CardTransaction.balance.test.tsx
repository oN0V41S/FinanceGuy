/**
 * @jest-environment jsdom
 *
 * TDD — CardTransaction: Saldo Final previsto por dia (issue #30)
 *
 * Contrato:
 * 1. Cada cabeçalho de dia exibe "Saldo previsto" (testid `projected-balance`) com o
 *    saldo acumulado ao fim do dia, partindo de ZERO no período exibido (sem saldo
 *    anterior de meses passados).
 * 2. O total do dia (`daily-total`) continua exibido e vem DEPOIS do saldo (abaixo).
 * 3. Cor: text-finance-income para saldo >= 0, text-finance-expense para negativo.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import type { Transaction } from '@/types/finance';

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
}));

jest.mock('lucide-react', () => {
  const Icon = () => <svg />;
  return { Edit2: Icon, Trash2: Icon, Check: Icon, X: Icon, RefreshCw: Icon, TrendingUp: Icon, TrendingDown: Icon };
});

jest.mock('@/shared/utils', () => ({
  formatCurrency: (n: number) => `R$ ${n.toFixed(2)}`,
}));

import CardTransaction from '../CardTransaction';

let seq = 0;
const tx = (overrides: Partial<Transaction>): Transaction =>
  ({
    id: `t-${++seq}`,
    type: 'expense',
    description: 'Item',
    value: 100,
    date: '2025-10-01',
    category: 'Casa',
    responsible: 'João',
    paid: true,
    is_recurring: false,
    ...overrides,
  }) as Transaction;

const baseProps = { isLoading: false, onEdit: jest.fn(), onDelete: jest.fn() };

// Lista em ordem decrescente de data (como a tela exibe).
const transactions = [
  tx({ date: '2025-10-05', type: 'expense', value: 200 }),
  tx({ date: '2025-10-02', type: 'expense', value: 300 }),
  tx({ date: '2025-10-01', type: 'income', value: 1000 }),
];

describe('CardTransaction — Saldo previsto (issue #30)', () => {
  it('exibe o saldo final acumulado por dia, partindo de zero', () => {
    render(<CardTransaction {...baseProps} transactions={transactions} />);

    const balances = screen.getAllByTestId('projected-balance').map((el) => el.textContent);
    // Grupos em ordem decrescente: 05/10, 02/10, 01/10
    expect(balances[0]).toContain('R$ 500.00'); // 1000 - 300 - 200
    expect(balances[1]).toContain('R$ 700.00'); // 1000 - 300
    expect(balances[2]).toContain('R$ 1000.00'); // 1000
  });

  it('o saldo do primeiro dia do período é igual ao total do dia (sem saldo anterior)', () => {
    render(
      <CardTransaction
        {...baseProps}
        transactions={[
          tx({ type: 'income', value: 180.55 }),
          tx({ type: 'expense', value: 144.85 }),
          tx({ type: 'income', value: 843.73 }),
        ]}
      />,
    );

    expect(screen.getByTestId('projected-balance-value').textContent).toBe('R$ 879.43');
    expect(screen.getByTestId('daily-total').textContent).toBe('+R$ 879.43');
  });

  it('rotula claramente como "Saldo previsto"', () => {
    render(<CardTransaction {...baseProps} transactions={[tx({})]} />);

    expect(screen.getByTestId('projected-balance').textContent).toContain('Saldo previsto');
  });

  it('mantém o total do dia como informação secundária, abaixo do saldo', () => {
    render(<CardTransaction {...baseProps} transactions={[tx({ type: 'expense', value: 456 })]} />);

    const group = screen.getByTestId('date-group');
    const balance = within(group).getByTestId('projected-balance');
    const dailyTotal = within(group).getByTestId('daily-total');

    expect(dailyTotal.textContent).toContain('-R$ 456.00');
    // balance precede o total no DOM (renderizado acima)
    expect(balance.compareDocumentPosition(dailyTotal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('saldo positivo ou zero usa a cor de receita', () => {
    render(<CardTransaction {...baseProps} transactions={[tx({ type: 'income', value: 100 })]} />);

    const value = screen.getByTestId('projected-balance-value');
    expect(value.className).toContain('text-finance-income');
    expect(value.className).not.toContain('text-finance-expense');
  });

  it('saldo negativo usa a cor de despesa e exibe sinal de menos', () => {
    render(<CardTransaction {...baseProps} transactions={[tx({ type: 'expense', value: 300 })]} />);

    const value = screen.getByTestId('projected-balance-value');
    expect(value.className).toContain('text-finance-expense');
    expect(value.textContent).toBe('-R$ 300.00');
  });

  it('saldo acumula pendentes (previsto) e parcelas como transações normais', () => {
    render(
      <CardTransaction
        {...baseProps}
        transactions={[
          tx({ date: '2025-10-03', value: 50, paid: false }),
          tx({ date: '2025-10-03', value: 70, installment_number: 1, total_installments: 3 }),
        ]}
      />,
    );

    expect(screen.getByTestId('projected-balance-value').textContent).toBe('-R$ 120.00');
  });
});
