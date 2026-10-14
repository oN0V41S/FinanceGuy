/**
 * @jest-environment node
 *
 * FING-18 — repositório: update/delete/search escopados por userId.
 */
import { PostgresTransactionRepository } from '../postgresTransaction.repository';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const tx = prisma.transaction as unknown as Record<string, jest.Mock>;
const row = (over: Record<string, unknown> = {}) => ({
  id: 't1',
  userId: 'A',
  value: { toString: () => '10' },
  date: new Date('2025-03-10T00:00:00Z'),
  type: 'expense',
  category: 'food',
  title: 'Mercado',
  description: null,
  installment_number: null,
  total_installments: null,
  ...over,
});

describe('PostgresTransactionRepository — ownership', () => {
  const repo = new PostgresTransactionRepository();
  beforeEach(() => jest.clearAllMocks());

  it('update filtra por {id,userId} e retorna null quando count=0', async () => {
    tx.updateMany.mockResolvedValue({ count: 0 });
    const res = await repo.update('tA', 'B', { value: 1 });
    expect(res).toBeNull();
    expect(tx.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'tA', userId: 'B' } }));
    expect(tx.findFirst).not.toHaveBeenCalled();
  });

  it('update com sucesso relê a linha escopada e não grava userId vindo do payload', async () => {
    tx.updateMany.mockResolvedValue({ count: 1 });
    tx.findFirst.mockResolvedValue(row());
    const res = await repo.update('t1', 'A', { value: 10, userId: 'EVIL' });
    expect(res).toMatchObject({ id: 't1', value: 10, date: '2025-03-10' });
    const data = tx.updateMany.mock.calls[0][0].data;
    expect(data.userId).toBeUndefined();
    expect(tx.findFirst).toHaveBeenCalledWith({ where: { id: 't1', userId: 'A' } });
  });

  it('delete filtra por {id,userId}; count=0 → false', async () => {
    tx.deleteMany.mockResolvedValue({ count: 0 });
    await expect(repo.delete('tA', 'B')).resolves.toBe(false);
    expect(tx.deleteMany).toHaveBeenCalledWith({ where: { id: 'tA', userId: 'B' } });
    tx.deleteMany.mockResolvedValue({ count: 1 });
    await expect(repo.delete('t1', 'A')).resolves.toBe(true);
  });

  it('delete retorna false se o banco lançar', async () => {
    tx.deleteMany.mockRejectedValue(new Error('x'));
    await expect(repo.delete('t1', 'A')).resolves.toBe(false);
  });
});

describe('PostgresTransactionRepository.search', () => {
  const repo = new PostgresTransactionRepository();
  beforeEach(() => jest.clearAllMocks());

  it('escopa por userId, busca título/descrição insensitive, valor exato, data desc, limite', async () => {
    tx.findMany.mockResolvedValue([row()]);
    const res = await repo.search({
      userId: 'A',
      query: ' mercado ',
      amount: 10,
      startDate: '2025-03-01',
      endDate: '2025-03-31',
      limit: 5,
    });
    const arg = tx.findMany.mock.calls[0][0];
    expect(arg.where.userId).toBe('A');
    expect(arg.where.value).toBe(10);
    expect(arg.where.date).toEqual({ gte: new Date('2025-03-01'), lte: new Date('2025-03-31') });
    expect(arg.where.OR).toEqual([
      { title: { contains: 'mercado', mode: 'insensitive' } },
      { description: { contains: 'mercado', mode: 'insensitive' } },
    ]);
    expect(arg.orderBy).toEqual({ date: 'desc' });
    expect(arg.take).toBe(5);
    expect(res[0]).toMatchObject({ id: 't1', value: 10, date: '2025-03-10' });
    expect(res[0]).not.toHaveProperty('userId');
  });

  it('sem filtros opcionais usa só userId', async () => {
    tx.findMany.mockResolvedValue([]);
    await repo.search({ userId: 'A' });
    const arg = tx.findMany.mock.calls[0][0];
    expect(arg.where).toEqual({ userId: 'A' });
    expect(arg.take).toBe(5);
  });
});
