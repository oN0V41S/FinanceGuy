/**
 * @jest-environment node
 *
 * TDD — PostgresTransactionRepository.getOpeningBalance (issue #30)
 *
 * Contrato:
 * 1. Soma receitas − despesas de transações com `date < before` (agregação no banco).
 * 2. SEMPRE filtra por userId (isolamento entre usuários).
 * 3. Aplica os mesmos filtros da lista: type, category, responsible, paid e search
 *    (search = description/title/responsible/category, case-insensitive).
 * 4. Sem transações anteriores → 0.
 */
import { PostgresTransactionRepository } from '../postgresTransaction.repository';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      groupBy: jest.fn(),
    },
  },
}));

const groupBy = prisma.transaction.groupBy as unknown as jest.Mock;
const dec = (n: number) => ({ toString: () => n.toFixed(2) });

describe('PostgresTransactionRepository.getOpeningBalance', () => {
  const repository = new PostgresTransactionRepository();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna receitas − despesas anteriores à data', async () => {
    groupBy.mockResolvedValue([
      { type: 'income', _sum: { value: dec(5000) } },
      { type: 'expense', _sum: { value: dec(1250.5) } },
    ]);

    const result = await repository.getOpeningBalance({ userId: 'u1', before: '2025-10-01' });

    expect(result).toBeCloseTo(3749.5);
  });

  it('retorna 0 quando não há transações anteriores', async () => {
    groupBy.mockResolvedValue([]);

    expect(await repository.getOpeningBalance({ userId: 'u1', before: '2025-10-01' })).toBe(0);
  });

  it('trata soma nula (_sum.value = null) como 0', async () => {
    groupBy.mockResolvedValue([{ type: 'expense', _sum: { value: null } }]);

    expect(await repository.getOpeningBalance({ userId: 'u1', before: '2025-10-01' })).toBe(0);
  });

  it('filtra por userId e por date < before (estritamente anterior)', async () => {
    groupBy.mockResolvedValue([]);

    await repository.getOpeningBalance({ userId: 'u1', before: '2025-10-01' });

    const args = groupBy.mock.calls[0][0];
    expect(args.by).toEqual(['type']);
    expect(args.where.userId).toBe('u1');
    expect(args.where.date).toEqual({ lt: new Date('2025-10-01') });
  });

  it('aplica filtros type, category, responsible e paid quando informados', async () => {
    groupBy.mockResolvedValue([]);

    await repository.getOpeningBalance({
      userId: 'u1',
      before: '2025-10-01',
      type: 'expense',
      category: 'Alimentação',
      responsible: 'Rafael',
      paid: false,
    });

    const { where } = groupBy.mock.calls[0][0];
    expect(where.type).toBe('expense');
    expect(where.category).toBe('Alimentação');
    expect(where.responsible).toBe('Rafael');
    expect(where.paid).toBe(false);
  });

  it('não adiciona filtros opcionais ausentes ao where', async () => {
    groupBy.mockResolvedValue([]);

    await repository.getOpeningBalance({ userId: 'u1', before: '2025-10-01' });

    const { where } = groupBy.mock.calls[0][0];
    expect(Object.keys(where).sort()).toEqual(['date', 'userId']);
  });

  it('search vira OR case-insensitive em description, title, responsible e category', async () => {
    groupBy.mockResolvedValue([]);

    await repository.getOpeningBalance({ userId: 'u1', before: '2025-10-01', search: '  Mercado ' });

    const { where } = groupBy.mock.calls[0][0];
    expect(where.OR).toEqual([
      { description: { contains: 'Mercado', mode: 'insensitive' } },
      { title: { contains: 'Mercado', mode: 'insensitive' } },
      { responsible: { contains: 'Mercado', mode: 'insensitive' } },
      { category: { contains: 'Mercado', mode: 'insensitive' } },
    ]);
  });

  it('search vazio (só espaços) é ignorado', async () => {
    groupBy.mockResolvedValue([]);

    await repository.getOpeningBalance({ userId: 'u1', before: '2025-10-01', search: '   ' });

    expect(groupBy.mock.calls[0][0].where.OR).toBeUndefined();
  });
});
