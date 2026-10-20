/**
 * TDD — computeRunningBalances (issue #30: Saldo Final previsto por dia)
 *
 * Contrato testado:
 * 1. Retorna Map<'YYYY-MM-DD', saldoFinalDoDia> apenas para dias com transações.
 * 2. Saldo do dia = saldo do dia anterior + receitas − despesas do dia.
 * 3. Acumula em ordem cronológica crescente, independente da ordem de entrada
 *    (a lista é exibida em ordem decrescente).
 * 4. O saldo parte de ZERO no período exibido: não carrega saldo de meses anteriores.
 * 5. Pendentes entram no cálculo (saldo "previsto").
 * 6. Não muta o array de entrada e tolera lista vazia.
 */
import { computeRunningBalances } from '../runningBalance';
import type { Transaction } from '../../validations';

let seq = 0;
const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: `tx-${++seq}`,
  date: '2025-10-01',
  value: 100,
  type: 'expense',
  category: 'Outros',
  responsible: 'Rafael',
  is_recurring: false,
  paid: true,
  ...overrides,
} as Transaction);

describe('computeRunningBalances', () => {
  it('retorna Map vazio quando não há transações', () => {
    expect(computeRunningBalances([]).size).toBe(0);
  });

  it('parte de zero: um dia só com despesa resulta em saldo negativo', () => {
    const balances = computeRunningBalances([tx({ date: '2025-10-03', value: 456 })]);
    expect(balances.get('2025-10-03')).toBeCloseTo(-456);
  });

  it('o saldo do primeiro dia é exatamente o total do dia (sem saldo anterior)', () => {
    const balances = computeRunningBalances([
      tx({ date: '2025-10-03', type: 'income', value: 180.55 }),
      tx({ date: '2025-10-03', type: 'expense', value: 144.85 }),
      tx({ date: '2025-10-03', type: 'income', value: 843.73 }),
    ]);
    expect(balances.get('2025-10-03')).toBe(879.43);
  });

  it('soma receitas e subtrai despesas dentro do mesmo dia', () => {
    const balances = computeRunningBalances([
      tx({ date: '2025-10-03', type: 'income', value: 1024.28 }),
      tx({ date: '2025-10-03', type: 'expense', value: 456 }),
    ]);
    expect(balances.get('2025-10-03')).toBeCloseTo(568.28);
  });

  it('acumula entre dias: saldo do dia = saldo do dia anterior + movimento do dia', () => {
    const balances = computeRunningBalances([
      tx({ date: '2025-10-01', type: 'income', value: 1000 }),
      tx({ date: '2025-10-02', type: 'expense', value: 300 }),
      tx({ date: '2025-10-05', type: 'expense', value: 200 }),
    ]);
    expect(balances.get('2025-10-01')).toBeCloseTo(1000);
    expect(balances.get('2025-10-02')).toBeCloseTo(700);
    expect(balances.get('2025-10-05')).toBeCloseTo(500);
  });

  it('acumula cronologicamente mesmo com a entrada em ordem decrescente', () => {
    const balances = computeRunningBalances([
      tx({ date: '2025-10-05', type: 'expense', value: 200 }),
      tx({ date: '2025-10-02', type: 'expense', value: 300 }),
      tx({ date: '2025-10-01', type: 'income', value: 1000 }),
    ]);
    expect(balances.get('2025-10-01')).toBeCloseTo(1000);
    expect(balances.get('2025-10-02')).toBeCloseTo(700);
    expect(balances.get('2025-10-05')).toBeCloseTo(500);
  });

  it('inclui transações pendentes (saldo previsto)', () => {
    const balances = computeRunningBalances([
      tx({ date: '2025-10-01', type: 'income', value: 200, paid: true }),
      tx({ date: '2025-10-02', type: 'expense', value: 50, paid: false }),
    ]);
    expect(balances.get('2025-10-01')).toBeCloseTo(200);
    expect(balances.get('2025-10-02')).toBeCloseTo(150);
  });

  it('trata parcelas e recorrências como transações normais', () => {
    const balances = computeRunningBalances([
      tx({ date: '2025-10-10', value: 100, installment_number: 2, total_installments: 6 }),
      tx({ date: '2025-10-10', value: 40, is_recurring: true }),
    ]);
    expect(balances.get('2025-10-10')).toBeCloseTo(-140);
  });

  it('só inclui chaves de dias que possuem transações', () => {
    const balances = computeRunningBalances([
      tx({ date: '2025-10-01', type: 'income', value: 10 }),
      tx({ date: '2025-10-09', type: 'income', value: 10 }),
    ]);
    expect([...balances.keys()].sort()).toEqual(['2025-10-01', '2025-10-09']);
  });

  it('não muta o array de entrada', () => {
    const input = [tx({ date: '2025-10-05' }), tx({ date: '2025-10-01' })];
    const snapshot = input.map((t) => t.id);
    computeRunningBalances(input);
    expect(input.map((t) => t.id)).toEqual(snapshot);
  });

  it('evita erro de ponto flutuante em centavos (0.1 + 0.2)', () => {
    const balances = computeRunningBalances([
      tx({ date: '2025-10-01', type: 'income', value: 0.1 }),
      tx({ date: '2025-10-01', type: 'income', value: 0.2 }),
    ]);
    expect(balances.get('2025-10-01')).toBe(0.3);
  });
});
