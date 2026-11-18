import { PostgresCategoryRepository } from '../postgresCategory.repository';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => {
  const category = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    createMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  const transaction = {
    groupBy: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  };
  const investment = {
    groupBy: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  };
  const client = {
    category,
    transaction,
    investment,
    $transaction: jest.fn(),
  };
  client.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(client));
  return { prisma: client };
});

const db = prisma as unknown as {
  category: Record<string, jest.Mock>;
  transaction: Record<string, jest.Mock>;
  investment: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

describe('PostgresCategoryRepository', () => {
  const repository = new PostgresCategoryRepository();
  const userId = 'user-1';

  const row = {
    id: 'cat-1',
    name: 'Mercado',
    nameKey: 'mercado',
    type: 'expense',
    color: '#F97316',
    icon: 'tag',
    isDefault: false,
    scope: 'transaction',
    userId,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-02'),
  };

  const expected = {
    id: 'cat-1',
    name: 'Mercado',
    type: 'expense',
    color: '#F97316',
    icon: 'tag',
    isDefault: false,
    scope: 'transaction',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
  });

  describe('findAll', () => {
    it('scopes by userId, orders defaults first then by name, and attaches transactionCount', async () => {
      db.category.findMany.mockResolvedValue([row]);
      db.transaction.groupBy.mockResolvedValue([{ category: 'Mercado', _count: { _all: 3 } }]);

      const result = await repository.findAll(userId, 'transaction');

      expect(db.category.findMany).toHaveBeenCalledWith({
        where: { userId, scope: 'transaction' },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      });
      expect(db.transaction.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ by: ['category'], where: { userId } })
      );
      expect(result).toEqual([{ ...expected, transactionCount: 3 }]);
    });

    it('defaults transactionCount to 0 when there are no transactions', async () => {
      db.category.findMany.mockResolvedValue([row]);
      db.transaction.groupBy.mockResolvedValue([]);

      const [first] = await repository.findAll(userId, 'transaction');

      expect(first.transactionCount).toBe(0);
    });
  });

  describe('findById / findByKey', () => {
    it('findById is scoped by userId (IDOR)', async () => {
      db.category.findFirst.mockResolvedValue(row);

      const result = await repository.findById('cat-1', userId);

      expect(db.category.findFirst).toHaveBeenCalledWith({ where: { id: 'cat-1', userId } });
      expect(result).toEqual(expected);
    });

    it('findById returns null when not found', async () => {
      db.category.findFirst.mockResolvedValue(null);
      expect(await repository.findById('x', userId)).toBeNull();
    });

    it('findByKey searches by userId + nameKey', async () => {
      db.category.findFirst.mockResolvedValue(row);

      await repository.findByKey(userId, 'mercado', 'transaction');

      expect(db.category.findFirst).toHaveBeenCalledWith({ where: { userId, scope: 'transaction', nameKey: 'mercado' } });
    });
  });

  describe('count / countTransactions', () => {
    it('counts categories by user', async () => {
      db.category.count.mockResolvedValue(9);
      expect(await repository.count(userId, 'transaction')).toBe(9);
      expect(db.category.count).toHaveBeenCalledWith({ where: { userId, scope: 'transaction' } });
    });

    it('counts transactions by user + category name', async () => {
      db.transaction.count.mockResolvedValue(4);
      expect(await repository.countTransactions(userId, 'Mercado')).toBe(4);
      expect(db.transaction.count).toHaveBeenCalledWith({ where: { userId, category: 'Mercado' } });
    });
  });

  describe('countTransactionsByType', () => {
    it('counts scoped by user + category + type', async () => {
      db.transaction.count.mockResolvedValue(2);
      expect(await repository.countTransactionsByType(userId, 'Mercado', 'expense')).toBe(2);
      expect(db.transaction.count).toHaveBeenCalledWith({
        where: { userId, category: 'Mercado', type: 'expense' },
      });
    });
  });

  describe('createMany', () => {
    it('is idempotent via skipDuplicates and stamps the userId', async () => {
      db.category.createMany.mockResolvedValue({ count: 1 });

      await repository.createMany(userId, [
        { name: 'Casa', nameKey: 'casa', type: 'expense', color: null, icon: null, isDefault: true, scope: 'transaction' },
      ]);

      expect(db.category.createMany).toHaveBeenCalledWith({
        data: [
          { name: 'Casa', nameKey: 'casa', type: 'expense', color: null, icon: null, isDefault: true, scope: 'transaction', userId },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe('create', () => {
    it('creates with the userId and returns the mapped category', async () => {
      db.category.create.mockResolvedValue(row);

      const result = await repository.create(userId, {
        name: 'Mercado',
        nameKey: 'mercado',
        type: 'expense',
        color: '#F97316',
        icon: 'tag',
        isDefault: false,
        scope: 'transaction',
      });

      expect(db.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId, nameKey: 'mercado' }),
      });
      expect(result).toEqual(expected);
    });
  });

  describe('update', () => {
    it('returns null when the category does not belong to the user', async () => {
      db.category.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.update('cat-1', userId, { color: '#000000' });

      expect(result).toBeNull();
      expect(db.transaction.updateMany).not.toHaveBeenCalled();
    });

    it('updates without touching transactions when there is no rename', async () => {
      db.category.updateMany.mockResolvedValue({ count: 1 });
      db.category.findFirst.mockResolvedValue({ ...row, color: '#000000' });

      const result = await repository.update('cat-1', userId, { color: '#000000' });

      expect(db.category.updateMany).toHaveBeenCalledWith({
        where: { id: 'cat-1', userId },
        data: { color: '#000000' },
      });
      expect(db.transaction.updateMany).not.toHaveBeenCalled();
      expect(result?.color).toBe('#000000');
    });

    it('propagates a rename to the user transactions inside one DB transaction', async () => {
      db.category.updateMany.mockResolvedValue({ count: 1 });
      db.transaction.updateMany.mockResolvedValue({ count: 2 });
      db.category.findFirst.mockResolvedValue({ ...row, name: 'Supermercado', nameKey: 'supermercado' });

      await repository.update('cat-1', userId, { name: 'Supermercado', nameKey: 'supermercado' }, 'Mercado');

      expect(db.$transaction).toHaveBeenCalledTimes(1);
      expect(db.transaction.updateMany).toHaveBeenCalledWith({
        where: { userId, category: 'Mercado' },
        data: { category: 'Supermercado' },
      });
    });
  });

  describe('remove', () => {
    it('deletes scoped by userId and returns true', async () => {
      db.transaction.count.mockResolvedValue(0);
      db.category.deleteMany.mockResolvedValue({ count: 1 });

      const ok = await repository.remove('cat-1', userId, 'Mercado');

      expect(db.category.deleteMany).toHaveBeenCalledWith({ where: { id: 'cat-1', userId } });
      expect(db.transaction.updateMany).not.toHaveBeenCalled();
      expect(ok).toBe(true);
    });

    it('moves transactions to the target before deleting, atomically', async () => {
      db.transaction.updateMany.mockResolvedValue({ count: 5 });
      db.category.deleteMany.mockResolvedValue({ count: 1 });

      await repository.remove('cat-1', userId, 'Mercado', 'Outros');

      expect(db.$transaction).toHaveBeenCalledTimes(1);
      expect(db.transaction.updateMany).toHaveBeenCalledWith({
        where: { userId, category: 'Mercado' },
        data: { category: 'Outros' },
      });
    });

    it('aborts with REASSIGN_REQUIRED when transactions appeared and no target was given', async () => {
      db.transaction.count.mockResolvedValue(2);

      await expect(repository.remove('cat-1', userId, 'Mercado')).rejects.toMatchObject({
        code: 'REASSIGN_REQUIRED',
      });
      expect(db.transaction.count).toHaveBeenCalledWith({ where: { userId, category: 'Mercado' } });
      expect(db.category.deleteMany).not.toHaveBeenCalled();
    });

    it('returns false when nothing was deleted', async () => {
      db.transaction.count.mockResolvedValue(0);
      db.category.deleteMany.mockResolvedValue({ count: 0 });
      expect(await repository.remove('cat-1', userId, 'Mercado')).toBe(false);
    });
  });

  describe('escopo investment', () => {
    const invRow = { ...row, id: 'inv-cat-1', name: 'Cripto', nameKey: 'cripto', type: 'both', scope: 'investment' };

    it('findAll filtra por scope e anexa investmentCount (por categoryId)', async () => {
      db.category.findMany.mockResolvedValue([invRow]);
      db.investment.groupBy.mockResolvedValue([{ categoryId: 'inv-cat-1', _count: { _all: 2 } }]);

      const [first] = await repository.findAll(userId, 'investment');

      expect(db.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId, scope: 'investment' } })
      );
      expect(db.transaction.groupBy).not.toHaveBeenCalled();
      expect(first.investmentCount).toBe(2);
      expect(first.scope).toBe('investment');
    });

    it('findByKey e count respeitam o scope', async () => {
      db.category.findFirst.mockResolvedValue(invRow);
      db.category.count.mockResolvedValue(7);

      await repository.findByKey(userId, 'cripto', 'investment');
      expect(await repository.count(userId, 'investment')).toBe(7);

      expect(db.category.findFirst).toHaveBeenCalledWith({ where: { userId, scope: 'investment', nameKey: 'cripto' } });
      expect(db.category.count).toHaveBeenCalledWith({ where: { userId, scope: 'investment' } });
    });

    it('countInvestments é escopado por usuário + categoria', async () => {
      db.investment.count.mockResolvedValue(3);
      expect(await repository.countInvestments(userId, 'inv-cat-1')).toBe(3);
      expect(db.investment.count).toHaveBeenCalledWith({ where: { userId, categoryId: 'inv-cat-1' } });
    });

    it('removeInvestmentCategory migra ativos para o fallback e exclui na mesma transação', async () => {
      db.category.findFirst.mockResolvedValue(invRow);
      db.investment.updateMany.mockResolvedValue({ count: 4 });
      db.category.deleteMany.mockResolvedValue({ count: 1 });

      const moved = await repository.removeInvestmentCategory('inv-cat-1', userId, 'fallback-id');

      expect(moved).toBe(4);
      expect(db.$transaction).toHaveBeenCalledTimes(1);
      expect(db.investment.updateMany).toHaveBeenCalledWith({
        where: { userId, categoryId: 'inv-cat-1' },
        data: { categoryId: 'fallback-id' },
      });
      expect(db.category.deleteMany).toHaveBeenCalledWith({ where: { id: 'inv-cat-1', userId } });
    });

    it('removeInvestmentCategory retorna null se a categoria não for do usuário/escopo', async () => {
      db.category.findFirst.mockResolvedValue(null);
      expect(await repository.removeInvestmentCategory('x', userId, 'fb')).toBeNull();
      expect(db.investment.updateMany).not.toHaveBeenCalled();
    });
  });
});
