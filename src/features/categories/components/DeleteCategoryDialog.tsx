'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FALLBACK_CATEGORY_KEY } from '../defaults';
import { normalizeCategoryName } from '../normalizeCategoryName';
import type { Category } from '../validations';

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  /** Demais categorias do usuário (candidatas a receber as transações). */
  otherCategories: Category[];
  onConfirm: (reassignTo?: string) => Promise<void>;
}

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  otherCategories,
  onConfirm,
}: DeleteCategoryDialogProps) {
  const transactionCount = category?.transactionCount ?? 0;
  const needsReassign = transactionCount > 0;

  const targets = useMemo(
    () => otherCategories.filter((c) => c.id !== category?.id),
    [otherCategories, category?.id]
  );

  const [reassignTo, setReassignTo] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Sugere "Outros" como destino (sempre existe e aceita receitas e despesas).
    const fallback = targets.find((c) => normalizeCategoryName(c.name) === FALLBACK_CATEGORY_KEY);
    setReassignTo(fallback?.id ?? targets[0]?.id ?? '');
    setError(null);
  }, [open, targets]);

  const labelFor = (id: string) => targets.find((c) => c.id === id)?.name ?? '';

  async function handleConfirm() {
    setError(null);
    setIsDeleting(true);
    try {
      await onConfirm(needsReassign ? reassignTo : undefined);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir a categoria.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir categoria &quot;{category?.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            {needsReassign
              ? `Há ${transactionCount} ${transactionCount === 1 ? 'transação' : 'transações'} nesta categoria. Escolha para qual categoria movê-${transactionCount === 1 ? 'la' : 'las'} antes de excluir.`
              : 'Esta ação não pode ser desfeita.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {needsReassign && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="reassign-to">Mover transações para</Label>
            <Select value={reassignTo} onValueChange={(value) => setReassignTo(value ?? '')}>
              <SelectTrigger id="reassign-to" className="w-full h-10" aria-label="Mover transações para">
                <SelectValue placeholder="Selecione uma categoria">{labelFor(reassignTo)}</SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-surface-container">
                {targets.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {error && (
          <p className="text-sm text-finance-expense" role="alert">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting || (needsReassign && !reassignTo)}
          >
            {isDeleting ? 'Excluindo...' : needsReassign ? 'Mover e excluir' : 'Excluir'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
