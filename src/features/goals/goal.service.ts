import { IGoalRepository } from './IGoal.repository';
import { CreateGoalSchema, UpdateGoalSchema } from './validations';
import type { Goal } from './validations';

export class GoalService {
  constructor(private readonly goalRepository: IGoalRepository) {}

  async getAllGoals(userId: string): Promise<Goal[]> {
    return this.goalRepository.getAll(userId);
  }

  async getGoalById(id: string, userId: string): Promise<Goal> {
    const goal = await this.goalRepository.getById(id, userId);

    if (!goal) {
      throw new Error('Meta não encontrada.');
    }

    return goal;
  }

  async createGoal(data: unknown, userId: string): Promise<Goal> {
    const validatedData = CreateGoalSchema.parse(data);

    return this.goalRepository.create({ ...validatedData, userId });
  }

  async updateGoal(id: string, data: unknown, userId: string): Promise<Goal> {
    const existing = await this.goalRepository.getById(id, userId);

    if (!existing) {
      throw new Error('Meta não encontrada.');
    }

    const validatedData = UpdateGoalSchema.parse(data);

    const updated = await this.goalRepository.update(id, validatedData);

    if (!updated) {
      throw new Error('Meta não encontrada.');
    }

    return updated;
  }

  async deleteGoal(id: string, userId: string): Promise<boolean> {
    const existing = await this.goalRepository.getById(id, userId);

    if (!existing) {
      throw new Error('Meta não encontrada.');
    }

    const success = await this.goalRepository.delete(id);

    if (!success) {
      throw new Error('Meta não encontrada.');
    }

    return true;
  }
}
