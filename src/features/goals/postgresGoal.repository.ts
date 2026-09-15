import { IGoalRepository } from './IGoal.repository';
import { Goal, GoalInput } from './validations';
import { prisma } from '@/lib/prisma';

export class PostgresGoalRepository implements IGoalRepository {
  async getAll(userId: string): Promise<Goal[]> {
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { created_at: 'desc' },
    });

    return goals.map(({ userId: _u, created_at, updated_at, ...rest }) => ({
      ...rest,
      targetValue: Number(rest.targetValue),
      currentValue: Number(rest.currentValue),
      deadlineLabel: rest.deadlineLabel ?? undefined,
      createdAt: created_at,
      updatedAt: updated_at,
    }));
  }

  async getById(id: string, userId: string): Promise<Goal | null> {
    const goal = await prisma.goal.findFirst({ where: { id, userId } });
    if (!goal) return null;

    const { userId: _u, created_at, updated_at, ...rest } = goal;

    return {
      ...rest,
      targetValue: Number(rest.targetValue),
      currentValue: Number(rest.currentValue),
      deadlineLabel: rest.deadlineLabel ?? undefined,
      createdAt: created_at,
      updatedAt: updated_at,
    };
  }

  async create(data: GoalInput): Promise<Goal> {
    const { userId, ...goalData } = data;

    const goal = await prisma.goal.create({
      data: {
        ...goalData,
        user: {
          connect: { id: userId },
        },
      },
    });

    const { userId: _u, created_at, updated_at, ...rest } = goal;

    return {
      ...rest,
      targetValue: Number(rest.targetValue),
      currentValue: Number(rest.currentValue),
      deadlineLabel: rest.deadlineLabel ?? undefined,
      createdAt: created_at,
      updatedAt: updated_at,
    };
  }

  async update(id: string, data: Partial<GoalInput>): Promise<Goal | null> {
    try {
      const { userId: _u, ...updateData } = data;

      const goal = await prisma.goal.update({
        where: { id },
        data: updateData,
      });

      const { userId: _u2, created_at, updated_at, ...rest } = goal;

      return {
        ...rest,
        targetValue: Number(rest.targetValue),
        currentValue: Number(rest.currentValue),
        deadlineLabel: rest.deadlineLabel ?? undefined,
        createdAt: created_at,
        updatedAt: updated_at,
      };
    } catch (error) {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.goal.delete({ where: { id } });
      return true;
    } catch (error) {
      return false;
    }
  }
}
