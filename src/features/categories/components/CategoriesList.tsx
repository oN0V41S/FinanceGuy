'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Category, CategoryScopeValue } from '../validations';
import { CategoryIcon } from './CategoryIcon';

const TYPE_LABEL: Record<Category['type'], string> = {
  expense: 'Despesa',
  income: 'Receita',
  both: 'Receita e despesa',
};

interface CategoriesListProps {
  categories: Category[];
  /** Escopo exibido: transações (padrão) ou investimentos. */
  scope?: CategoryScopeValue;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoriesList({ categories, scope = 'transaction', onEdit, onDelete }: CategoriesListProps) {
  const isInvestment = scope === 'investment';

  return (
    <ul className="flex flex-col gap-2" aria-label="Lista de categorias">
      {categories.map((category) => (
        <li
          key={category.id}
          className="flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container p-3"
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: category.color ?? '#64748B' }}
          >
            <CategoryIcon icon={category.icon} className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-on-surface">
              {category.name}
              {category.isDefault && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Padrão</span>
              )}
            </p>
            <p className="text-xs text-on-surface-variant">
              {isInvestment ? (
                category.investmentCount !== undefined &&
                `${category.investmentCount} ${category.investmentCount === 1 ? 'ativo' : 'ativos'}`
              ) : (
                <>
                  {TYPE_LABEL[category.type]}
                  {category.transactionCount !== undefined &&
                    ` · ${category.transactionCount} ${category.transactionCount === 1 ? 'transação' : 'transações'}`}
                </>
              )}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Editar categoria ${category.name}`}
            onClick={() => onEdit(category)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {!category.isDefault && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Excluir categoria ${category.name}`}
              onClick={() => onDelete(category)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
