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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateInvestmentSchema, InvestmentTypeEnum, type CreateInvestmentInput, type Investment } from '@/features/investments/validations';

interface InvestmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment | null;
  onSubmit: (input: CreateInvestmentInput) => Promise<void>;
}

interface InvestmentFormState {
  name: string;
  type: Investment['type'];
  value: string;
  quantity: string;
  term: string;
}

const TYPE_LABELS: Record<string, string> = {
  'Renda Fixa': 'Renda Fixa',
  'Renda Variável': 'Renda Variável',
};

const emptyForm: InvestmentFormState = {
  name: '',
  type: 'Renda Fixa',
  value: '',
  quantity: '',
  term: '',
};

export function InvestmentFormDialog({ open, onOpenChange, investment, onSubmit }: InvestmentFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = Boolean(investment);

  useEffect(() => {
    if (open) {
      setForm(
        investment
          ? {
              name: investment.name,
              type: investment.type,
              value: String(investment.value),
              quantity: investment.quantity ?? '',
              term: investment.term ?? '',
            }
          : emptyForm
      );
      setErrors({});
      setSubmitError(null);
    }
  }, [open, investment]);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const parsed = CreateInvestmentSchema.safeParse({
      name: form.name,
      type: form.type,
      value: Number(form.value),
      quantity: form.quantity || undefined,
      term: form.term || undefined,
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
      setSubmitError(err instanceof Error ? err.message : 'Erro ao salvar investimento');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar investimento' : 'Novo investimento'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do seu investimento.'
              : 'Preencha os dados para cadastrar um novo investimento.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="investment-name">Nome</Label>
              <Input
                id="investment-name"
                className="h-12 px-4 rounded-xl"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Tesouro Selic"
              />
              {errors.name && <p className="text-sm text-finance-expense">{errors.name}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="investment-type">Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(value) => handleChange('type', value as string)}
              >
                <SelectTrigger id="investment-type" className="w-full h-12 px-4 rounded-xl">
                  <SelectValue>{TYPE_LABELS[form.type] ?? form.type}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-surface-container">
                  {InvestmentTypeEnum.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {TYPE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-sm text-finance-expense">{errors.type}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="investment-value">Valor</Label>
              <Input
                id="investment-value"
                type="number"
                step="0.01"
                min="0"
                className="h-12 px-4 rounded-xl"
                value={form.value}
                onChange={(e) => handleChange('value', e.target.value)}
                placeholder="0,00"
              />
              {errors.value && <p className="text-sm text-finance-expense">{errors.value}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="investment-quantity">Quantidade (opcional)</Label>
              <Input
                id="investment-quantity"
                className="h-12 px-4 rounded-xl"
                value={form.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                placeholder="Ex: 10 cotas"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="investment-term">Prazo (opcional)</Label>
              <Input
                id="investment-term"
                className="h-12 px-4 rounded-xl"
                value={form.term}
                onChange={(e) => handleChange('term', e.target.value)}
                placeholder="Ex: 12 meses"
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
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar investimento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
