import { PostgresInvestmentRepository } from '../postgresInvestment.repository';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    investment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('PostgresInvestmentRepository', () => {
  const repository = new PostgresInvestmentRepository();
  const userId = 'user-1';

  const dbRow = {
    id: 'inv-1',
    name: 'Tesouro Selic',
    type: 'Renda Fixa',
    value: { toString: () => '1000.50' } as any,
    quantity: '10 cotas',
    term: '2 anos',
    userId,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-02'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('returns investments for the given user, converting Decimal to number and dates to camelCase', async () => {
      (prisma.investment.findMany as jest.Mock).mockResolvedValue([dbRow]);

      const result = await repository.getAll(userId);

      expect(prisma.investment.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { created_at: 'desc' },
      });
      expect(result).toEqual([
        {
          id: 'inv-1',
          name: 'Tesouro Selic',
          type: 'Renda Fixa',
          value: 1000.5,
          quantity: '10 cotas',
          term: '2 anos',
          createdAt: dbRow.created_at,
          updatedAt: dbRow.updated_at,
        },
      ]);
    });

    it('returns empty array when user has no investments', async () => {
      (prisma.investment.findMany as jest.Mock).mockResolvedValue([]);
      const result = await repository.getAll(userId);
      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns the investment scoped to the user', async () => {
      (prisma.investment.findFirst as jest.Mock).mockResolvedValue(dbRow);

      const result = await repository.getById('inv-1', userId);

      expect(prisma.investment.findFirst).toHaveBeenCalledWith({
        where: { id: 'inv-1', userId },
      });
      expect(result?.id).toBe('inv-1');
      expect(result?.value).toBe(1000.5);
    });

    it('returns null when not found', async () => {
      (prisma.investment.findFirst as jest.Mock).mockResolvedValue(null);
      const result = await repository.getById('missing', userId);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates an investment connecting to the user', async () => {
      (prisma.investment.create as jest.Mock).mockResolvedValue(dbRow);

      const result = await repository.create({
        name: 'Tesouro Selic',
        type: 'Renda Fixa',
        value: 1000.5,
        quantity: '10 cotas',
        term: '2 anos',
        userId,
      });

      expect(prisma.investment.create).toHaveBeenCalledWith({
        data: {
          name: 'Tesouro Selic',
          type: 'Renda Fixa',
          value: 1000.5,
          quantity: '10 cotas',
          term: '2 anos',
          user: { connect: { id: userId } },
        },
      });
      expect(result.id).toBe('inv-1');
    });
  });

  describe('update', () => {
    it('updates an investment', async () => {
      (prisma.investment.update as jest.Mock).mockResolvedValue({ ...dbRow, name: 'Novo nome' });

      const result = await repository.update('inv-1', { name: 'Novo nome' });

      expect(prisma.investment.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { name: 'Novo nome' },
      });
      expect(result?.name).toBe('Novo nome');
    });

    it('returns null when update fails (not found)', async () => {
      (prisma.investment.update as jest.Mock).mockRejectedValue(new Error('Record not found'));
      const result = await repository.update('missing', { name: 'x' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('returns true on successful delete', async () => {
      (prisma.investment.delete as jest.Mock).mockResolvedValue(dbRow);
      const result = await repository.delete('inv-1');
      expect(result).toBe(true);
      expect(prisma.investment.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
    });

    it('returns false when delete fails (not found)', async () => {
      (prisma.investment.delete as jest.Mock).mockRejectedValue(new Error('Record not found'));
      const result = await repository.delete('missing');
      expect(result).toBe(false);
    });
  });
});
