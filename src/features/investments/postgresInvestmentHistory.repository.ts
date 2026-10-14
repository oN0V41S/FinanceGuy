import type { InvestmentTransaction, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { IInvestmentHistoryRepository } from './IInvestmentHistory.repository';
import type {
  HistoryKind,
  InvestmentHistoryEntry,
  InvestmentHistoryInput,
  RedeemApplyUpdate,
} from './history.types';
import type { Market } from './quotes/types';

const num = (value: Prisma.Decimal | null): number | undefined => (value === null ? undefined : Number(value));

const toDomain = (row: InvestmentTransaction): InvestmentHistoryEntry => ({
  id: row.id,
  kind: row.kind as HistoryKind,
  date: row.date,
  quantity: Number(row.quantity),
  unitPrice: Number(row.unitPrice),
  grossValue: Number(row.grossValue),
  costBasis: num(row.costBasis),
  profit: num(row.profit),
  taxRate: num(row.taxRate),
  taxValue: num(row.taxValue),
  netValue: num(row.netValue),
  note: row.note ?? undefined,
  assetName: row.assetName,
  assetTicker: row.assetTicker ?? undefined,
  assetMarket: (row.assetMarket ?? undefined) as Market | undefined,
  currency: row.currency ?? undefined,
  investmentId: row.investmentId,
});

const toCreateData = ({ userId, investmentId, ...rest }: InvestmentHistoryInput): Prisma.InvestmentTransactionUncheckedCreateInput => ({
  ...rest,
  userId,
  investmentId,
});

export class PostgresInvestmentHistoryRepository implements IInvestmentHistoryRepository {
  async record(entry: InvestmentHistoryInput): Promise<InvestmentHistoryEntry> {
    const row = await prisma.investmentTransaction.create({ data: toCreateData(entry) });
    return toDomain(row);
  }

  async applyRedeem(
    investmentId: string,
    userId: string,
    update: RedeemApplyUpdate,
    entry: InvestmentHistoryInput
  ): Promise<InvestmentHistoryEntry> {
    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.investment.updateMany({
        where: { id: investmentId, userId },
        data: { shares: update.shares, value: update.value, status: update.status },
      });
      if (updated.count === 0) throw new Error('Investimento não encontrado.');

      return tx.investmentTransaction.create({ data: toCreateData(entry) });
    });

    return toDomain(row);
  }

  async listByUser(userId: string, investmentId?: string): Promise<InvestmentHistoryEntry[]> {
    const rows = await prisma.investmentTransaction.findMany({
      where: { userId, ...(investmentId ? { investmentId } : {}) },
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
    });
    return rows.map(toDomain);
  }
}
