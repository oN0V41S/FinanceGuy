import { IInvestmentRepository } from './IInvestment.repository';
import { Investment, InvestmentInput } from './validations';
import { prisma } from '@/lib/prisma';

export class PostgresInvestmentRepository implements IInvestmentRepository {
  async getAll(userId: string): Promise<Investment[]> {
    const investments = await prisma.investment.findMany({
      where: { userId },
      orderBy: { created_at: 'desc' },
    });

    return investments.map(({ userId: _u, created_at, updated_at, ...rest }) => ({
      ...rest,
      type: rest.type as Investment['type'],
      value: Number(rest.value),
      quantity: rest.quantity ?? undefined,
      term: rest.term ?? undefined,
      createdAt: created_at,
      updatedAt: updated_at,
    }));
  }

  async getById(id: string, userId: string): Promise<Investment | null> {
    const investment = await prisma.investment.findFirst({ where: { id, userId } });
    if (!investment) return null;

    const { userId: _u, created_at, updated_at, ...rest } = investment;

    return {
      ...rest,
      type: rest.type as Investment['type'],
      value: Number(rest.value),
      quantity: rest.quantity ?? undefined,
      term: rest.term ?? undefined,
      createdAt: created_at,
      updatedAt: updated_at,
    };
  }

  async create(data: InvestmentInput): Promise<Investment> {
    const { userId, ...investmentData } = data;

    const investment = await prisma.investment.create({
      data: {
        ...investmentData,
        user: {
          connect: { id: userId },
        },
      },
    });

    const { userId: _u, created_at, updated_at, ...rest } = investment;

    return {
      ...rest,
      type: rest.type as Investment['type'],
      value: Number(rest.value),
      quantity: rest.quantity ?? undefined,
      term: rest.term ?? undefined,
      createdAt: created_at,
      updatedAt: updated_at,
    };
  }

  async update(id: string, data: Partial<InvestmentInput>): Promise<Investment | null> {
    try {
      const { userId: _u, ...updateData } = data;

      const investment = await prisma.investment.update({
        where: { id },
        data: updateData,
      });

      const { userId: _u2, created_at, updated_at, ...rest } = investment;

      return {
        ...rest,
        type: rest.type as Investment['type'],
        value: Number(rest.value),
        quantity: rest.quantity ?? undefined,
        term: rest.term ?? undefined,
        createdAt: created_at,
        updatedAt: updated_at,
      };
    } catch (error) {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.investment.delete({ where: { id } });
      return true;
    } catch (error) {
      return false;
    }
  }
}
