'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedToggle } from '@/components/ui/segmented-toggle';
import { cn } from '@/lib/utils';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  FALLBACK_CATEGORY_KEY,
  FALLBACK_CATEGORY_NAME,
  FALLBACK_INVESTMENT_CATEGORY_KEY,
  FALLBACK_INVESTMENT_CATEGORY_NAME,
} from '../defaults';
import { normalizeCategoryName } from '../normalizeCategoryName';
import { CreateCategorySchema, type Category, type CategoryScopeValue, type CreateCategoryInput } from '../validations';
import { CategoryIcon } from './CategoryIcon';

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Receita' },
  { value: 'both', label: 'Ambas' },
] as const;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  /** Escopo das categorias: transações (padrão) ou investimentos. */
  scope?: CategoryScopeValue;
  onSubmit: (input: CreateCategoryInput) => Promise<void>;
}

export function CategoryFormDialog({ open, onOpenChange, category, scope = 'transaction', onSubmit }: CategoryFormDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CreateCategoryInput['type']>('expense');
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState<string>('tag');
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(category);
  const isInvestment = scope === 'investment';
  // O fallback do escopo ("Outros" / "Outros investimentos") não pode ser renomeado.
  const fallbackKey = isInvestment ? FALLBACK_INVESTMENT_CATEGORY_KEY : FALLBACK_CATEGORY_KEY;
  const fallbackName = isInvestment ? FALLBACK_INVESTMENT_CATEGORY_NAME : FALLBACK_CATEGORY_NAME;
  const isFallback = Boolean(category?.isDefault) && normalizeCategoryName(category?.name ?? '') === fallbackKey;

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setType(category?.type ?? 'expense');
    setColor(category?.color ?? CATEGORY_COLORS[0]);
    setIcon(category?.icon ?? 'tag');
    setNameError(null);
    setSubmitError(null);
  }, [open, category]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const parsed = CreateCategorySchema.safeParse({
      name,
      type: isInvestment ? 'both' : type,
      color,
      icon,
      scope,
    });
    if (!parsed.success) {
      setNameError(parsed.error.issues.find((i) => i.path[0] === 'name')?.message ?? 'Confira os campos.');
      return;
    }

    setNameError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data);
      onOpenChange(false);
    } catch (err) {
      // Mantém o formulário preenchido para o usuário corrigir sem perder nada.
      setSubmitError(err instanceof Error ? err.message : 'Não foi possível salvar a categoria.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? isInvestment
                ? 'Ao renomear, seus ativos continuam na mesma categoria.'
                : 'Ao renomear, suas transações são atualizadas automaticamente.'
              : isInvestment
                ? 'Crie uma categoria para classificar seus investimentos por objetivo.'
                : 'Crie uma categoria para organizar melhor seus gastos e ganhos.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="category-name">Nome</Label>
              <Input
                id="category-name"
                className="h-12 px-4 rounded-xl"
                value={name}
                maxLength={40}
                disabled={isFallback}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pets"
              />
              {isFallback && (
                <p className="text-xs text-on-surface-variant">
                  &quot;{fallbackName}&quot; é a categoria padrão de segurança e não pode ser renomeada.
                </p>
              )}
              {nameError && (
                <p className="text-sm text-finance-expense" role="alert">
                  {nameError}
                </p>
              )}
            </div>

            {!isInvestment && (
              <div className="flex flex-col gap-2">
                <Label>Tipo</Label>
                <SegmentedToggle
                  options={TYPE_OPTIONS}
                  value={type ?? 'expense'}
                  onChange={(value) => !isFallback && setType(value)}
                  className={cn('w-fit', isFallback && 'opacity-60 pointer-events-none')}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor da categoria">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={color === c}
                    aria-label={`Cor ${c}`}
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform',
                      color === c ? 'border-on-surface scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ícone da categoria">
                {CATEGORY_ICONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={icon === key}
                    aria-label={`Ícone ${key}`}
                    onClick={() => setIcon(key)}
                    className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center border transition-colors',
                      icon === key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-outline-variant text-on-surface-variant hover:text-on-surface'
                    )}
                  >
                    <CategoryIcon icon={key} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-finance-expense" role="alert">
                {submitError}
              </p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
