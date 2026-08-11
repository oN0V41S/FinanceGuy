import { Transaction, FinancialSummary, TransactionInput } from '@/types/finance';

export interface ITransactionRepository {
  // CRUD básico
  getAll(filters?: Record<string, any>): Promise<Transaction[]>;
  getById(id: string, userId?: string): Promise<Transaction | null>;
  create(data: TransactionInput): Promise<Transaction>;
  update(id: string, data: Partial<TransactionInput>): Promise<Transaction | null>;
  delete(id: string): Promise<boolean>;

  // Operações em lote — "esta e futuras" (instalments/recurring)
  deleteFuture(parentId: string, userId: string, referenceDate: Date): Promise<number>;
  updateFuture(parentId: string, userId: string, referenceDate: Date, data: Partial<TransactionInput>): Promise<number>;

  // Analytics
  getSummary(filters?: Record<string, any>): Promise<FinancialSummary>;
}
