import { ICategoryRepository, NewCategoryRecord, CategoryChanges } from './ICategory.repository';
import { ICacheRepository } from '@/shared/interfaces/ICacheRepository';
import { normalizeCategoryName } from './normalizeCategoryName';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_INVESTMENT_CATEGORIES,
  FALLBACK_CATEGORY_KEY,
  FALLBACK_CATEGORY_NAME,
  FALLBACK_INVESTMENT_CATEGORY_KEY,
  FALLBACK_INVESTMENT_CATEGORY_NAME,
  MAX_CATEGORIES_PER_USER,
  type DefaultCategory,
} from './defaults';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  DeleteCategorySchema,
  type Category,
  type CategoryScopeValue,
} from './validations';

export type CategoryErrorCode =
  | 'NOT_FOUND'
  | 'DUPLICATE'
  | 'LIMIT'
  | 'FORBIDDEN'
  | 'REASSIGN_REQUIRED'
  | 'INVALID_REASSIGN'
  | 'INCOMPATIBLE_TYPE';

/** Erro de domínio com mensagem já amigável (PT-BR) para exibir ao usuário. */
export class CategoryError extends Error {
  constructor(
    public readonly code: CategoryErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CategoryError';
  }
}

/** Escapa glob no userId para nunca ampliar o padrão de invalidação (A03). */
function escapeGlobChars(value: string): string {
  return value.replace(/[*?\[\]]/g, '\\$&');
}

function isCompatible(categoryType: Category['type'], transactionType: 'income' | 'expense'): boolean {
  return categoryType === 'both' || categoryType === transactionType;
}

function defaultsFor(scope: CategoryScopeValue): readonly DefaultCategory[] {
  return scope === 'investment' ? DEFAULT_INVESTMENT_CATEGORIES : DEFAULT_CATEGORIES;
}

function fallbackFor(scope: CategoryScopeValue): { name: string; key: string } {
  return scope === 'investment'
    ? { name: FALLBACK_INVESTMENT_CATEGORY_NAME, key: FALLBACK_INVESTMENT_CATEGORY_KEY }
    : { name: FALLBACK_CATEGORY_NAME, key: FALLBACK_CATEGORY_KEY };
}

function toRecord(item: DefaultCategory, scope: CategoryScopeValue): NewCategoryRecord {
  return {
    scope,
    name: item.name,
    nameKey: normalizeCategoryName(item.name),
    type: item.type,
    color: item.color,
    icon: item.icon,
    isDefault: true,
  };
}

export class CategoriesService {
  constructor(
    private readonly repository: ICategoryRepository,
    private readonly cacheRepository: ICacheRepository
  ) {}

  /** Semeia os padrões do escopo de forma lazy/idempotente. Retorna o total de categorias do usuário no escopo. */
  private async ensureDefaults(userId: string, scope: CategoryScopeValue = 'transaction'): Promise<number> {
    const total = await this.repository.count(userId, scope);
    if (total > 0) return total;

    const defaults = defaultsFor(scope);
    await this.repository.createMany(userId, defaults.map((d) => toRecord(d, scope)));
    return defaults.length;
  }

  private invalidateTransactions(userId: string): Promise<void> {
    return this.cacheRepository.delByPattern(`transactions:${escapeGlobChars(userId)}:*`);
  }

  async list(
    userId: string,
    type?: 'income' | 'expense',
    scope: CategoryScopeValue = 'transaction'
  ): Promise<Category[]> {
    let categories: Category[];

    try {
      await this.ensureDefaults(userId, scope);
      categories = await this.repository.findAll(userId, scope);
    } catch (error) {
      // Falha ao semear/ler não pode bloquear o fluxo: fallback somente leitura.
      console.error('Erro ao carregar categorias; usando padrões em memória:', error);
      categories = defaultsFor(scope).map((c) => ({
        id: `default-${scope === 'investment' ? 'investment-' : ''}${normalizeCategoryName(c.name)}`,
        name: c.name,
        type: c.type,
        color: c.color,
        icon: c.icon,
        isDefault: true,
        scope,
        ...(scope === 'investment' ? { investmentCount: 0 } : { transactionCount: 0 }),
      }));
    }

    return type && scope === 'transaction' ? categories.filter((c) => isCompatible(c.type, type)) : categories;
  }

  async create(data: unknown, userId: string): Promise<Category> {
    const input = CreateCategorySchema.parse(data);
    const scope = input.scope;
    const total = await this.ensureDefaults(userId, scope);

    if (total >= MAX_CATEGORIES_PER_USER) {
      throw new CategoryError('LIMIT', `Você atingiu o limite de ${MAX_CATEGORIES_PER_USER} categorias.`);
    }

    const nameKey = normalizeCategoryName(input.name);
    if (await this.repository.findByKey(userId, nameKey, scope)) {
      throw new CategoryError('DUPLICATE', 'Já existe uma categoria com esse nome.');
    }

    try {
      return await this.repository.create(userId, {
        name: input.name.trim().replace(/\s+/g, ' '),
        nameKey,
        type: scope === 'investment' ? 'both' : input.type,
        color: input.color ?? null,
        icon: input.icon ?? null,
        isDefault: false,
        scope,
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new CategoryError('DUPLICATE', 'Já existe uma categoria com esse nome.');
      }
      throw error;
    }
  }

  async update(id: string, data: unknown, userId: string): Promise<Category> {
    const input = UpdateCategorySchema.parse(data);
    const existing = await this.repository.findById(id, userId);

    if (!existing) {
      throw new CategoryError('NOT_FOUND', 'Categoria não encontrada.');
    }

    const scope: CategoryScopeValue = existing.scope ?? 'transaction';
    const fallback = fallbackFor(scope);
    const isFallback = normalizeCategoryName(existing.name) === fallback.key && existing.isDefault;
    const changes: CategoryChanges = { ...input };
    let renameFrom: string | undefined;

    // Categorias de investimento sempre aceitam "both": o tipo não se aplica.
    if (scope === 'investment') delete changes.type;

    if (isFallback) {
      if (input.name !== undefined && input.name !== existing.name) {
        throw new CategoryError('FORBIDDEN', `A categoria "${fallback.name}" não pode ser renomeada.`);
      }
      if (scope === 'transaction' && input.type !== undefined && input.type !== 'both') {
        throw new CategoryError('FORBIDDEN', `A categoria "${fallback.name}" precisa aceitar receitas e despesas.`);
      }
    }

    if (input.name !== undefined) {
      const name = input.name.trim().replace(/\s+/g, ' ');
      const nameKey = normalizeCategoryName(name);
      const clash = await this.repository.findByKey(userId, nameKey, scope);

      if (clash && clash.id !== existing.id) {
        throw new CategoryError('DUPLICATE', 'Já existe uma categoria com esse nome.');
      }

      changes.name = name;
      changes.nameKey = nameKey;
      // Só transações referenciam a categoria pelo nome; investimentos usam o id.
      if (name !== existing.name && scope === 'transaction') renameFrom = existing.name;
    }

    if (scope === 'transaction' && input.type !== undefined && input.type !== 'both' && input.type !== existing.type) {
      const opposite = input.type === 'income' ? 'expense' : 'income';
      const conflicting = await this.repository.countTransactionsByType(userId, existing.name, opposite);
      if (conflicting > 0) {
        throw new CategoryError(
          'INCOMPATIBLE_TYPE',
          `Esta categoria tem ${conflicting} ${opposite === 'income' ? 'receitas' : 'despesas'}. Mova-as para outra categoria antes de mudar o tipo.`,
          { conflicting }
        );
      }
    }

    let updated: Category | null;
    try {
      updated = await this.repository.update(id, userId, changes, renameFrom);
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new CategoryError('DUPLICATE', 'Já existe uma categoria com esse nome.');
      }
      throw error;
    }

    if (!updated) {
      throw new CategoryError('NOT_FOUND', 'Categoria não encontrada.');
    }

    if (renameFrom) {
      await this.invalidateTransactions(userId);
    }

    return updated;
  }

  async remove(id: string, data: unknown, userId: string): Promise<{ moved: number }> {
    const { reassignTo } = DeleteCategorySchema.parse(data ?? {});
    const existing = await this.repository.findById(id, userId);

    if (!existing) {
      throw new CategoryError('NOT_FOUND', 'Categoria não encontrada.');
    }

    if (existing.isDefault) {
      throw new CategoryError('FORBIDDEN', 'Categorias padrão não podem ser excluídas.');
    }

    if ((existing.scope ?? 'transaction') === 'investment') {
      return this.removeInvestmentCategory(existing, userId);
    }

    const transactionCount = await this.repository.countTransactions(userId, existing.name);

    if (transactionCount === 0) {
      await this.repository.remove(id, userId, existing.name, undefined);
      return { moved: 0 };
    }

    if (!reassignTo) {
      throw new CategoryError(
        'REASSIGN_REQUIRED',
        `Escolha para onde mover as ${transactionCount} transações antes de excluir.`,
        { transactionCount }
      );
    }

    if (reassignTo === id) {
      throw new CategoryError('INVALID_REASSIGN', 'Escolha outra categoria como destino.');
    }

    // Escopado por userId: destino de outro usuário/inexistente é rejeitado (IDOR).
    const target = await this.repository.findById(reassignTo, userId);
    if (!target) {
      throw new CategoryError('INVALID_REASSIGN', 'A categoria de destino não foi encontrada.');
    }

    if (target.type !== 'both') {
      const opposite = target.type === 'income' ? 'expense' : 'income';
      const conflicting = await this.repository.countTransactionsByType(userId, existing.name, opposite);
      if (conflicting > 0) {
        throw new CategoryError(
          'INCOMPATIBLE_TYPE',
          `A categoria "${target.name}" não aceita ${opposite === 'income' ? 'receitas' : 'despesas'}, e há transações desse tipo para mover. Escolha outro destino.`
        );
      }
    }

    await this.repository.remove(id, userId, existing.name, target.name);
    await this.invalidateTransactions(userId);

    return { moved: transactionCount };
  }

  /** Exclui categoria de investimento migrando os ativos para o fallback protegido (mesma transação). */
  private async removeInvestmentCategory(existing: Category, userId: string): Promise<{ moved: number }> {
    await this.ensureDefaults(userId, 'investment');
    const fallback = await this.repository.findByKey(userId, FALLBACK_INVESTMENT_CATEGORY_KEY, 'investment');

    if (!fallback || fallback.id === existing.id) {
      throw new CategoryError(
        'INVALID_REASSIGN',
        `Não encontramos a categoria "${FALLBACK_INVESTMENT_CATEGORY_NAME}" para receber os ativos. Tente novamente em instantes.`
      );
    }

    const moved = await this.repository.removeInvestmentCategory(existing.id, userId, fallback.id);
    if (moved === null) {
      throw new CategoryError('NOT_FOUND', 'Categoria não encontrada.');
    }
    return { moved };
  }

  /**
   * Usada pelo service de transações: garante que a categoria existe para o
   * usuário e é compatível com o tipo (receita/despesa).
   */
  async assertUsable(userId: string, categoryName: string, transactionType: 'income' | 'expense'): Promise<Category> {
    await this.ensureDefaults(userId, 'transaction');

    const category = await this.repository.findByKey(userId, normalizeCategoryName(categoryName), 'transaction');
    if (!category) {
      throw new CategoryError('NOT_FOUND', `Categoria "${categoryName}" não encontrada.`);
    }

    if (!isCompatible(category.type, transactionType)) {
      throw new CategoryError(
        'INCOMPATIBLE_TYPE',
        `A categoria "${category.name}" não pode ser usada em ${transactionType === 'income' ? 'receitas' : 'despesas'}.`
      );
    }

    return category;
  }
}
