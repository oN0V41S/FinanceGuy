import { Goal, GoalInput } from './validations';

export interface IGoalRepository {
  getAll(userId: string): Promise<Goal[]>;
  getById(id: string, userId: string): Promise<Goal | null>;
  create(data: GoalInput): Promise<Goal>;
  update(id: string, data: Partial<GoalInput>): Promise<Goal | null>;
  delete(id: string): Promise<boolean>;
}
