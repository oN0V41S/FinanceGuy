import type { Category, CategoryScopeValue, CreateCategoryInput } from './validations';

export interface NewCategoryRecord {
  name: string;
  nameKey: string;
  type: CreateCategoryInput['type'];
  color: string | null;
  icon: string | null;
  isDefault: boolean;
  scope: CategoryScopeValue;
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
  /** Ordenadas: defaults primeiro, depois alfabético; inclui `transactionCount` (escopo transaction) ou `investmentCount` (investment). */
  findAll(userId: string, scope: CategoryScopeValue): Promise<Category[]>;
  /** Sem filtro de escopo: o escopo vem no registro (`Category.scope`). */
  findById(id: string, userId: string): Promise<Category | null>;
  findByKey(userId: string, nameKey: string, scope: CategoryScopeValue): Promise<Category | null>;
  count(userId: string, scope: CategoryScopeValue): Promise<number>;
  /** Ativos de investimento do usuário vinculados à categoria. */
  countInvestments(userId: string, categoryId: string): Promise<number>;
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
  /**
   * Categoria de investimento: migra os ativos para `fallbackId` e exclui, na mesma transação.
   * Retorna a quantidade de ativos movidos, ou null se a categoria não existir.
   */
  removeInvestmentCategory(id: string, userId: string, fallbackId: string): Promise<number | null>;
}
