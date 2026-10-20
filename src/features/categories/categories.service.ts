import { ICategoryRepository, NewCategoryRecord, CategoryChanges } from './ICategory.repository';
import { ICacheRepository } from '@/shared/interfaces/ICacheRepository';
import { normalizeCategoryName } from './normalizeCategoryName';
import {
  DEFAULT_CATEGORIES,
  FALLBACK_CATEGORY_KEY,
  MAX_CATEGORIES_PER_USER,
} from './defaults';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  DeleteCategorySchema,
  type Category,
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

function toRecord(item: (typeof DEFAULT_CATEGORIES)[number]): NewCategoryRecord {
  return {
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

  /** Semeia os padrões de forma lazy/idempotente. Retorna o total de categorias do usuário. */
  private async ensureDefaults(userId: string): Promise<number> {
    const total = await this.repository.count(userId);
    if (total > 0) return total;

    await this.repository.createMany(userId, DEFAULT_CATEGORIES.map(toRecord));
    return DEFAULT_CATEGORIES.length;
  }

  private invalidateTransactions(userId: string): Promise<void> {
    return this.cacheRepository.delByPattern(`transactions:${escapeGlobChars(userId)}:*`);
  }

  async list(userId: string, type?: 'income' | 'expense'): Promise<Category[]> {
    let categories: Category[];

    try {
      await this.ensureDefaults(userId);
      categories = await this.repository.findAll(userId);
    } catch (error) {
      // Falha ao semear/ler não pode bloquear o fluxo: fallback somente leitura.
      console.error('Erro ao carregar categorias; usando padrões em memória:', error);
      categories = DEFAULT_CATEGORIES.map((c) => ({
        id: `default-${normalizeCategoryName(c.name)}`,
        name: c.name,
        type: c.type,
        color: c.color,
        icon: c.icon,
        isDefault: true,
        transactionCount: 0,
      }));
    }

    return type ? categories.filter((c) => isCompatible(c.type, type)) : categories;
  }

  async create(data: unknown, userId: string): Promise<Category> {
    const input = CreateCategorySchema.parse(data);
    const total = await this.ensureDefaults(userId);

    if (total >= MAX_CATEGORIES_PER_USER) {
      throw new CategoryError('LIMIT', `Você atingiu o limite de ${MAX_CATEGORIES_PER_USER} categorias.`);
    }

    const nameKey = normalizeCategoryName(input.name);
    if (await this.repository.findByKey(userId, nameKey)) {
      throw new CategoryError('DUPLICATE', 'Já existe uma categoria com esse nome.');
    }

    try {
      return await this.repository.create(userId, {
        name: input.name.trim().replace(/\s+/g, ' '),
        nameKey,
        type: input.type,
        color: input.color ?? null,
        icon: input.icon ?? null,
        isDefault: false,
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

    const isFallback = normalizeCategoryName(existing.name) === FALLBACK_CATEGORY_KEY && existing.isDefault;
    const changes: CategoryChanges = { ...input };
    let renameFrom: string | undefined;

    if (isFallback) {
      if (input.name !== undefined && input.name !== existing.name) {
        throw new CategoryError('FORBIDDEN', 'A categoria "Outros" não pode ser renomeada.');
      }
      if (input.type !== undefined && input.type !== 'both') {
        throw new CategoryError('FORBIDDEN', 'A categoria "Outros" precisa aceitar receitas e despesas.');
      }
    }

    if (input.name !== undefined) {
      const name = input.name.trim().replace(/\s+/g, ' ');
      const nameKey = normalizeCategoryName(name);
      const clash = await this.repository.findByKey(userId, nameKey);

      if (clash && clash.id !== existing.id) {
        throw new CategoryError('DUPLICATE', 'Já existe uma categoria com esse nome.');
      }

      changes.name = name;
      changes.nameKey = nameKey;
      if (name !== existing.name) renameFrom = existing.name;
    }

    if (input.type !== undefined && input.type !== 'both' && input.type !== existing.type) {
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

  /**
   * Usada pelo service de transações: garante que a categoria existe para o
   * usuário e é compatível com o tipo (receita/despesa).
   */
  async assertUsable(userId: string, categoryName: string, transactionType: 'income' | 'expense'): Promise<Category> {
    await this.ensureDefaults(userId);

    const category = await this.repository.findByKey(userId, normalizeCategoryName(categoryName));
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
