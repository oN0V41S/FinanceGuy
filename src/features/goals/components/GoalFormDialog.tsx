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
import { CreateGoalSchema, type CreateGoalInput, type Goal } from '@/features/goals/validations';

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
  onSubmit: (input: CreateGoalInput) => Promise<void>;
}

const emptyForm = {
  name: '',
  targetValue: '',
  currentValue: '',
  deadlineLabel: '',
};

export function GoalFormDialog({ open, onOpenChange, goal, onSubmit }: GoalFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = Boolean(goal);

  useEffect(() => {
    if (open) {
      setForm(
        goal
          ? {
              name: goal.name,
              targetValue: String(goal.targetValue),
              currentValue: String(goal.currentValue ?? 0),
              deadlineLabel: goal.deadlineLabel ?? '',
            }
          : emptyForm
      );
      setErrors({});
      setSubmitError(null);
    }
  }, [open, goal]);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const parsed = CreateGoalSchema.safeParse({
      name: form.name,
      targetValue: Number(form.targetValue),
      currentValue: form.currentValue ? Number(form.currentValue) : 0,
      deadlineLabel: form.deadlineLabel || undefined,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data);
      onOpenChange(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao salvar meta');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar meta' : 'Nova meta'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações da sua meta financeira.'
              : 'Preencha os dados para cadastrar uma nova meta.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-name">Nome</Label>
              <Input
                id="goal-name"
                className="h-12 px-4 rounded-xl"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Viagem para o Japão"
              />
              {errors.name && <p className="text-sm text-finance-expense">{errors.name}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-target">Valor alvo</Label>
              <Input
                id="goal-target"
                type="number"
                step="0.01"
                min="0"
                className="h-12 px-4 rounded-xl"
                value={form.targetValue}
                onChange={(e) => handleChange('targetValue', e.target.value)}
                placeholder="0,00"
              />
              {errors.targetValue && <p className="text-sm text-finance-expense">{errors.targetValue}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-current">Valor atual</Label>
              <Input
                id="goal-current"
                type="number"
                step="0.01"
                min="0"
                className="h-12 px-4 rounded-xl"
                value={form.currentValue}
                onChange={(e) => handleChange('currentValue', e.target.value)}
                placeholder="0,00"
              />
              {errors.currentValue && <p className="text-sm text-finance-expense">{errors.currentValue}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="goal-deadline">Prazo (opcional)</Label>
              <Input
                id="goal-deadline"
                className="h-12 px-4 rounded-xl"
                value={form.deadlineLabel}
                onChange={(e) => handleChange('deadlineLabel', e.target.value)}
                placeholder="Ex: Dezembro 2026"
              />
            </div>

            {submitError && (
              <p role="alert" className="text-sm text-finance-expense">
                {submitError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar meta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
