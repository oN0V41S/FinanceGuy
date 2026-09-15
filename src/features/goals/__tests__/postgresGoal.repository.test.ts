import { PostgresGoalRepository } from '../postgresGoal.repository';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    goal: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('PostgresGoalRepository', () => {
  const repository = new PostgresGoalRepository();
  const userId = 'user-1';

  const dbRow = {
    id: 'goal-1',
    name: 'Viagem para o Japão',
    targetValue: { toString: () => '20000.00' } as any,
    currentValue: { toString: () => '5000.00' } as any,
    deadlineLabel: '6 meses restantes',
    userId,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-02'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('returns goals for the given user, converting Decimal to number and dates to camelCase', async () => {
      (prisma.goal.findMany as jest.Mock).mockResolvedValue([dbRow]);

      const result = await repository.getAll(userId);

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { created_at: 'desc' },
      });
      expect(result).toEqual([
        {
          id: 'goal-1',
          name: 'Viagem para o Japão',
          targetValue: 20000,
          currentValue: 5000,
          deadlineLabel: '6 meses restantes',
          createdAt: dbRow.created_at,
          updatedAt: dbRow.updated_at,
        },
      ]);
    });

    it('returns empty array when user has no goals', async () => {
      (prisma.goal.findMany as jest.Mock).mockResolvedValue([]);
      const result = await repository.getAll(userId);
      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns the goal scoped to the user', async () => {
      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(dbRow);

      const result = await repository.getById('goal-1', userId);

      expect(prisma.goal.findFirst).toHaveBeenCalledWith({
        where: { id: 'goal-1', userId },
      });
      expect(result?.id).toBe('goal-1');
      expect(result?.targetValue).toBe(20000);
    });

    it('returns null when not found', async () => {
      (prisma.goal.findFirst as jest.Mock).mockResolvedValue(null);
      const result = await repository.getById('missing', userId);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a goal connecting to the user', async () => {
      (prisma.goal.create as jest.Mock).mockResolvedValue(dbRow);

      const result = await repository.create({
        name: 'Viagem para o Japão',
        targetValue: 20000,
        currentValue: 5000,
        deadlineLabel: '6 meses restantes',
        userId,
      });

      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: {
          name: 'Viagem para o Japão',
          targetValue: 20000,
          currentValue: 5000,
          deadlineLabel: '6 meses restantes',
          user: { connect: { id: userId } },
        },
      });
      expect(result.id).toBe('goal-1');
    });
  });

  describe('update', () => {
    it('updates a goal', async () => {
      (prisma.goal.update as jest.Mock).mockResolvedValue({ ...dbRow, name: 'Novo nome' });

      const result = await repository.update('goal-1', { name: 'Novo nome' });

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal-1' },
        data: { name: 'Novo nome' },
      });
      expect(result?.name).toBe('Novo nome');
    });

    it('returns null when update fails (not found)', async () => {
      (prisma.goal.update as jest.Mock).mockRejectedValue(new Error('Record not found'));
      const result = await repository.update('missing', { name: 'x' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('returns true on successful delete', async () => {
      (prisma.goal.delete as jest.Mock).mockResolvedValue(dbRow);
      const result = await repository.delete('goal-1');
      expect(result).toBe(true);
      expect(prisma.goal.delete).toHaveBeenCalledWith({ where: { id: 'goal-1' } });
    });

    it('returns false when delete fails (not found)', async () => {
      (prisma.goal.delete as jest.Mock).mockRejectedValue(new Error('Record not found'));
      const result = await repository.delete('missing');
      expect(result).toBe(false);
    });
  });
});
