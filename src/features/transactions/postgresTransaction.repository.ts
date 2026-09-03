import { ITransactionRepository } from './ITransaction.repository';
import { Transaction, FinancialSummary, TransactionInput } from '@/types/finance';
import { MonthlyPoint } from './types';
import { prisma } from '@/lib/prisma';

/** Mapa de número de mês (0-based) para abreviação pt-BR. */
const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

interface RawMonthlyRow {
  month: string;
  income: string | number;
  expense: string | number;
}

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

  async getMonthlySummary(userId: string, period: string): Promise<MonthlyPoint[]> {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;
    let months: string[];

    if (period === 'last6') {
      // Últimos 6 meses rolantes, mês atual inclusive.
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // último dia do mês atual
      startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1); // 1º dia de 5 meses atrás

      // Gera a lista de meses no intervalo (MM strings).
      months = [];
      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        months.push(String(cursor.getMonth() + 1).padStart(2, '0'));
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else if (/^\d{4}$/.test(period)) {
      const year = parseInt(period, 10);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
      months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    } else if (/^\d{4}-s1$/.test(period)) {
      const year = parseInt(period.slice(0, 4), 10);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 5, 30);
      months = ['01','02','03','04','05','06'];
    } else if (/^\d{4}-s2$/.test(period)) {
      const year = parseInt(period.slice(0, 4), 10);
      startDate = new Date(year, 6, 1);
      endDate = new Date(year, 11, 31);
      months = ['07','08','09','10','11','12'];
    } else {
      throw new Error(`Período inválido: ${period}`);
    }

    const rows = await prisma.$queryRaw<RawMonthlyRow[]>`
      SELECT
        TO_CHAR(date::date, 'MM') AS month,
        SUM(CASE WHEN type = 'income' THEN value ELSE 0 END) AS income,
        SUM(CASE WHEN type = 'expense' THEN value ELSE 0 END) AS expense
      FROM "transactions"
      WHERE "userId" = ${userId}
        AND date::date >= ${startDate}
        AND date::date <= ${endDate}
      GROUP BY TO_CHAR(date::date, 'MM')
      ORDER BY month ASC
    `;

    // Indexar por month para lookup O(1).
    const rowsByMonth = new Map<string, RawMonthlyRow>();
    for (const row of rows) {
      rowsByMonth.set(row.month, row);
    }

    // Preenche todos os meses do período, zerando os sem dados.
    return months.map((month): MonthlyPoint => {
      const row = rowsByMonth.get(month);
      const monthLabel = MONTH_LABELS[month] ?? month;
      return {
        month,
        monthLabel,
        income: row ? Number(row.income) : 0,
        expense: row ? Number(row.expense) : 0,
      };
    });
  }
}