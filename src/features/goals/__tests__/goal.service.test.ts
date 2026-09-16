import { GoalService } from '../goal.service';
import { IGoalRepository } from '../IGoal.repository';
import { Goal } from '../validations';

describe('GoalService', () => {
  let repository: jest.Mocked<IGoalRepository>;
  let service: GoalService;

  const userId = 'user-1';
  const goal: Goal = {
    id: 'goal-1',
    name: 'Viagem para o Japão',
    targetValue: 20000,
    currentValue: 5000,
    deadlineLabel: '6 meses restantes',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    repository = {
      getAll: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new GoalService(repository);
  });

  describe('getAllGoals', () => {
    it('returns all goals for the user', async () => {
      repository.getAll.mockResolvedValue([goal]);
      const result = await service.getAllGoals(userId);
      expect(result).toEqual([goal]);
      expect(repository.getAll).toHaveBeenCalledWith(userId);
    });
  });

  describe('getGoalById', () => {
    it('returns goal when found', async () => {
      repository.getById.mockResolvedValue(goal);
      const result = await service.getGoalById('goal-1', userId);
      expect(result).toEqual(goal);
    });

    it('throws when not found', async () => {
      repository.getById.mockResolvedValue(null);
      await expect(service.getGoalById('missing', userId)).rejects.toThrow();
    });
  });

  describe('createGoal', () => {
    it('validates and creates the goal', async () => {
      repository.create.mockResolvedValue(goal);
      const result = await service.createGoal(
        { name: 'Viagem para o Japão', targetValue: 20000, currentValue: 5000, deadlineLabel: '6 meses restantes' },
        userId
      );
      expect(repository.create).toHaveBeenCalledWith({
        name: 'Viagem para o Japão',
        targetValue: 20000,
        currentValue: 5000,
        deadlineLabel: '6 meses restantes',
        userId,
      });
      expect(result).toEqual(goal);
    });

    it('defaults currentValue to 0 when omitted', async () => {
      repository.create.mockResolvedValue(goal);
      await service.createGoal({ name: 'Viagem', targetValue: 20000 }, userId);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ currentValue: 0 })
      );
    });

    it('throws ZodError on invalid data', async () => {
      await expect(service.createGoal({ name: '', targetValue: 20000 }, userId)).rejects.toThrow();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateGoal', () => {
    it('updates the goal when owned by user', async () => {
      repository.getById.mockResolvedValue(goal);
      repository.update.mockResolvedValue({ ...goal, currentValue: 10000 });

      const result = await service.updateGoal('goal-1', { currentValue: 10000 }, userId);

      expect(repository.getById).toHaveBeenCalledWith('goal-1', userId);
      expect(repository.update).toHaveBeenCalledWith('goal-1', { currentValue: 10000 });
      expect(result.currentValue).toBe(10000);
    });

    it('throws when goal not found or not owned by user', async () => {
      repository.getById.mockResolvedValue(null);
      await expect(service.updateGoal('goal-1', { currentValue: 1 }, userId)).rejects.toThrow();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws ZodError on invalid update data', async () => {
      repository.getById.mockResolvedValue(goal);
      await expect(service.updateGoal('goal-1', { targetValue: -1 }, userId)).rejects.toThrow();
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteGoal', () => {
    it('deletes the goal when owned by user', async () => {
      repository.getById.mockResolvedValue(goal);
      repository.delete.mockResolvedValue(true);

      await service.deleteGoal('goal-1', userId);

      expect(repository.getById).toHaveBeenCalledWith('goal-1', userId);
      expect(repository.delete).toHaveBeenCalledWith('goal-1');
    });

    it('throws when goal not found or not owned by user', async () => {
      repository.getById.mockResolvedValue(null);
      await expect(service.deleteGoal('goal-1', userId)).rejects.toThrow();
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
