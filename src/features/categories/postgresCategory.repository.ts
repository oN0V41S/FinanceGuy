import { prisma } from '@/lib/prisma';
import type { ICategoryRepository, NewCategoryRecord, CategoryChanges } from './ICategory.repository';
import { CategoryError } from './categories.service';
import type { Category } from './validations';

interface CategoryRow {
  id: string;
  name: string;
  type: string;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
}

function toCategory(row: CategoryRow, transactionCount?: number): Category {
  const category = {
    id: row.id,
    name: row.name,
    type: row.type as Category['type'],
    color: row.color,
    icon: row.icon as Category['icon'],
    isDefault: row.isDefault,
  };
  return transactionCount === undefined ? category : { ...category, transactionCount };
}

export class PostgresCategoryRepository implements ICategoryRepository {
  async findAll(userId: string): Promise<Category[]> {
    const [rows, counts] = await Promise.all([
      prisma.category.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }),
      prisma.transaction.groupBy({
        by: ['category'],
        where: { userId },
        _count: { _all: true },
      }),
    ]);

    const byName = new Map(counts.map((c) => [c.category, c._count._all]));
    return rows.map((row) => toCategory(row, byName.get(row.name) ?? 0));
  }

  async findById(id: string, userId: string): Promise<Category | null> {
    const row = await prisma.category.findFirst({ where: { id, userId } });
    return row ? toCategory(row) : null;
  }

  async findByKey(userId: string, nameKey: string): Promise<Category | null> {
    const row = await prisma.category.findFirst({ where: { userId, nameKey } });
    return row ? toCategory(row) : null;
  }

  count(userId: string): Promise<number> {
    return prisma.category.count({ where: { userId } });
  }

  countTransactions(userId: string, categoryName: string): Promise<number> {
    return prisma.transaction.count({ where: { userId, category: categoryName } });
  }

  countTransactionsByType(userId: string, categoryName: string, type: 'income' | 'expense'): Promise<number> {
    return prisma.transaction.count({ where: { userId, category: categoryName, type } });
  }

  async createMany(userId: string, items: NewCategoryRecord[]): Promise<void> {
    await prisma.category.createMany({
      data: items.map((item) => ({ ...item, userId })),
      skipDuplicates: true,
    });
  }

  async create(userId: string, data: NewCategoryRecord): Promise<Category> {
    const row = await prisma.category.create({ data: { ...data, userId } });
    return toCategory(row);
  }

  async update(
    id: string,
    userId: string,
    changes: CategoryChanges,
    renameFrom?: string
  ): Promise<Category | null> {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.category.updateMany({ where: { id, userId }, data: changes });
      if (result.count === 0) return false;

      if (renameFrom && changes.name) {
        await tx.transaction.updateMany({
          where: { userId, category: renameFrom },
          data: { category: changes.name },
        });
      }
      return true;
    });

    if (!updated) return null;
    return this.findById(id, userId);
  }

  async remove(id: string, userId: string, categoryName: string, reassignTo?: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      if (reassignTo) {
        await tx.transaction.updateMany({
          where: { userId, category: categoryName },
          data: { category: reassignTo },
        });
      } else {
        // Corrida: transações podem ter surgido após a checagem do service.
        const remaining = await tx.transaction.count({ where: { userId, category: categoryName } });
        if (remaining > 0) {
          throw new CategoryError(
            'REASSIGN_REQUIRED',
            `Escolha para onde mover as ${remaining} transações antes de excluir.`,
            { transactionCount: remaining }
          );
        }
      }
      const result = await tx.category.deleteMany({ where: { id, userId } });
      return result.count > 0;
    });
  }
}
