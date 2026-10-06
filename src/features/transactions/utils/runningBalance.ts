import type { Transaction } from '../validations';

const toCents = (value: number): number => Math.round(value * 100);

/**
 * Calcula o saldo final previsto ao fim de cada dia que possui transações.
 *
 * Acumula em ordem cronológica crescente a partir de `openingBalance`
 * (receitas somam, despesas subtraem; pendentes entram por ser "previsto").
 * A soma é feita em centavos inteiros para evitar erro de ponto flutuante.
 */
export function computeRunningBalances(
  transactions: Transaction[],
  openingBalance: number,
): Map<string, number> {
  const dailyCents = new Map<string, number>();
  for (const tx of transactions) {
    const signed = tx.type === 'income' ? toCents(tx.value) : -toCents(tx.value);
    dailyCents.set(tx.date, (dailyCents.get(tx.date) ?? 0) + signed);
  }

  const balances = new Map<string, number>();
  let running = toCents(openingBalance);
  for (const date of [...dailyCents.keys()].sort()) {
    running += dailyCents.get(date) as number;
    balances.set(date, running / 100);
  }
  return balances;
}
