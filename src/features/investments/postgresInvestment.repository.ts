import type { Investment as PrismaInvestment, Prisma } from '@prisma/client';
import { IInvestmentRepository } from './IInvestment.repository';
import { Investment, InvestmentInput } from './validations';
import { prisma } from '@/lib/prisma';

const num = (value: Prisma.Decimal | null | undefined): number | undefined =>
  value === null || value === undefined ? undefined : Number(value);

const toDomain = (row: PrismaInvestment): Investment => ({
  id: row.id,
  name: row.name,
  type: row.type as Investment['type'],
  value: Number(row.value),
  quantity: row.quantity ?? undefined,
  term: row.term ?? undefined,
  ticker: row.ticker ?? undefined,
  market: (row.market ?? undefined) as Investment['market'],
  currency: row.currency ?? undefined,
  purchaseDate: row.purchaseDate ?? undefined,
  unitPrice: num(row.unitPrice),
  shares: num(row.shares),
  status: row.status as Investment['status'],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class PostgresInvestmentRepository implements IInvestmentRepository {
  async getAll(userId: string): Promise<Investment[]> {
    const investments = await prisma.investment.findMany({
      where: { userId },
      orderBy: { created_at: 'desc' },
    });

    return investments.map(toDomain);
  }

  async getById(id: string, userId: string): Promise<Investment | null> {
    const investment = await prisma.investment.findFirst({ where: { id, userId } });
    return investment ? toDomain(investment) : null;
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

    return toDomain(investment);
  }

  async update(id: string, data: Partial<InvestmentInput>): Promise<Investment | null> {
    try {
      const { userId: _u, ...updateData } = data;

      const investment = await prisma.investment.update({
        where: { id },
        data: updateData,
      });

      return toDomain(investment);
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
