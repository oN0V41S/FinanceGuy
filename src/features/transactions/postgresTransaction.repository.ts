import { ITransactionRepository } from './ITransaction.repository';
import { Transaction, FinancialSummary, TransactionInput } from '@/types/finance';
import { prisma } from '@/lib/prisma';

export class PostgresTransactionRepository implements ITransactionRepository {
  async getAll(filters?: Record<string, any>): Promise<Transaction[]> {
    const where: any = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.type) where.type = filters.type;
    if (filters?.category) where.category = filters.category;
    if (filters?.responsible) where.responsible = filters.responsible;
    if (filters?.paid !== undefined) where.paid = filters.paid;
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    // Converter Decimal para number, Date para string, null para undefined
    return transactions.map(({ userId: _u, ...rest }) => ({
      ...rest,
      value: Number(rest.value),
      date: rest.date.toISOString().split('T')[0], // YYYY-MM-DD
      type: rest.type as 'income' | 'expense',
      category: rest.category as Transaction['category'],
      title: rest.title ?? undefined,
      description: rest.description ?? undefined,
      installment_number: rest.installment_number ?? undefined,
      total_installments: rest.total_installments ?? undefined,
    }));
  }

  async getById(id: string, userId?: string): Promise<Transaction | null> {
    const where: any = { id };
    if (userId) where.userId = userId;

    const transaction = await prisma.transaction.findFirst({ where });
    if (!transaction) return null;
    const { userId: _u, ...rest } = transaction;

    return {
      ...rest,
      value: Number(rest.value),
      date: rest.date.toISOString().split('T')[0],
      type: rest.type as 'income' | 'expense',
      category: rest.category as Transaction['category'],
      title: rest.title ?? undefined,
      description: rest.description ?? undefined,
      installment_number: rest.installment_number ?? undefined,
      total_installments: rest.total_installments ?? undefined,
    };
  }

  async create(data: TransactionInput): Promise<Transaction> {
    const { userId, ...transactionData } = data; // Extrair userId
    const { parent_transaction_id, ...restData } = transactionData;
    const transaction = await prisma.transaction.create({
      data: {
        ...restData,
        date: new Date(transactionData.date),
        parent_transaction: parent_transaction_id
          ? { connect: { id: parent_transaction_id } }
          : undefined,
        user: {
          connect: { id: userId }, // Conectar a transação ao usuário
        },
      },
    });
    const { userId: _u, ...rest } = transaction;

    return {
      ...rest,
      value: Number(rest.value),
      date: rest.date.toISOString().split('T')[0],
      type: rest.type as 'income' | 'expense',
      category: rest.category as Transaction['category'],
      title: rest.title ?? undefined,
      description: rest.description ?? undefined,
      installment_number: rest.installment_number ?? undefined,
      total_installments: rest.total_installments ?? undefined,
    };
  }

  async update(id: string, data: Partial<TransactionInput>): Promise<Transaction | null> {
    try {
      const updateData: any = { ...data };
      if (data.date) updateData.date = new Date(data.date);

      const transaction = await prisma.transaction.update({
        where: { id },
        data: updateData,
      });
      const { userId: _u, ...rest } = transaction;

      return {
        ...rest,
        value: Number(rest.value),
        date: rest.date.toISOString().split('T')[0],
        type: rest.type as 'income' | 'expense',
        category: rest.category as Transaction['category'],
        title: rest.title ?? undefined,
        description: rest.description ?? undefined,
        installment_number: rest.installment_number ?? undefined,
        total_installments: rest.total_installments ?? undefined,
      };
    } catch (error) {
      return null; // Não encontrado ou erro
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.transaction.delete({ where: { id } });
      return true;
    } catch (error) {
      return false;
    }
  }

  async deleteFuture(
    parentId: string,
    userId: string,
    referenceDate: Date
  ): Promise<number> {
    const result = await prisma.transaction.deleteMany({
      where: {
        parent_transaction_id: parentId,
        userId,
        date: { gte: referenceDate },
      },
    });
    return result.count;
  }

  async updateFuture(
    parentId: string,
    userId: string,
    referenceDate: Date,
    data: Partial<TransactionInput>
  ): Promise<number> {
    const updateData: any = { ...data };
    if (data.date) updateData.date = new Date(data.date);

    const result = await prisma.transaction.updateMany({
      where: {
        parent_transaction_id: parentId,
        userId,
        date: { gte: referenceDate },
      },
      data: updateData,
    });
    return result.count;
  }

  async getSummary(filters?: Record<string, any>): Promise<FinancialSummary> {
    const transactions = await this.getAll(filters);
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.value, 0);
    const expense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.value, 0);
    return { income, expense, balance: income - expense };
  }
}