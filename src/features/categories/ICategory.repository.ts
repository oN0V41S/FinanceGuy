import type { Category, CreateCategoryInput } from './validations';

export interface NewCategoryRecord {
  name: string;
  nameKey: string;
  type: CreateCategoryInput['type'];
  color: string | null;
  icon: string | null;
  isDefault: boolean;
}

export interface CategoryChanges {
  name?: string;
  nameKey?: string;
  type?: Category['type'];
  color?: string | null;
  icon?: string | null;
}

/**
 * Todas as operações são escopadas por `userId`. Operações que tocam também
 * `transactions` (rename/remove) DEVEM ser atômicas (tudo ou nada).
 */
export interface ICategoryRepository {
  /** Ordenadas: defaults primeiro, depois alfabético; inclui `transactionCount`. */
  findAll(userId: string): Promise<Category[]>;
  findById(id: string, userId: string): Promise<Category | null>;
  findByKey(userId: string, nameKey: string): Promise<Category | null>;
  count(userId: string): Promise<number>;
  countTransactions(userId: string, categoryName: string): Promise<number>;
  /** Conta transações do usuário na categoria com um tipo específico (sempre por userId). */
  countTransactionsByType(userId: string, categoryName: string, type: 'income' | 'expense'): Promise<number>;
  /** Idempotente (skipDuplicates). */
  createMany(userId: string, items: NewCategoryRecord[]): Promise<void>;
  create(userId: string, data: NewCategoryRecord): Promise<Category>;
  /** Se `renameFrom` vier, atualiza também as transações daquele nome (atômico). */
  update(id: string, userId: string, changes: CategoryChanges, renameFrom?: string): Promise<Category | null>;
  /** Se `reassignTo` vier, move as transações antes de excluir (atômico). Sem destino e com transações restantes, lança REASSIGN_REQUIRED. */
  remove(id: string, userId: string, categoryName: string, reassignTo?: string): Promise<boolean>;
}
