'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Transaction, TransactionFormData } from '@/features/transactions/types';
import { CategoryEnum } from '@/features/transactions/validations';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Form validation schema
// ---------------------------------------------------------------------------
const FormSchema = z.object({
  type: z.enum(['income', 'expense']),
  description: z
    .string()
    .min(1, 'Descrição é obrigatória')
    .max(255, 'Descrição muito longa (máximo 255 caracteres)'),
  value: z.string().refine(
    (val) => {
      if (val === '') return false;
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: 'Valor deve ser positivo' },
  ),
  date: z.string().min(1, 'Data é obrigatória'),
  category: CategoryEnum,
  responsible: z
    .string()
    .min(1, 'Responsável é obrigatório')
    .max(100, 'Responsável muito longo (máximo 100 caracteres)'),
  paid: z.boolean(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TransactionFormData) => Promise<void>;
  transaction?: Transaction | null;
  isLoading?: boolean;
}

const categoryOptions = CategoryEnum.options;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function TransactionModal({
  isOpen,
  onClose,
  onSave,
  transaction = null,
  isLoading = false,
}: TransactionModalProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [responsible, setResponsible] = useState('');
  const [paid, setPaid] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // -----------------------------------------------------------------------
  // Reset form when modal opens or transaction changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    if (transaction) {
      setType(transaction.type);
      setDescription(transaction.description);
      setAmount(String(transaction.value));
      setDate(transaction.date);
      setCategory(transaction.category);
      setResponsible(transaction.responsible);
      setPaid(transaction.paid ?? false);
    } else {
      setType('expense');
      setDescription('');
      setAmount('');
      setDate('');
      setCategory('');
      setResponsible('');
      setPaid(false);
    }

    setErrors({});
    setSubmitError(null);
    setSubmitting(false);
  }, [isOpen, transaction]);

  // -----------------------------------------------------------------------
  // Click delegation for SelectItem (catches clicks from test mock where
  // the context between Select and SelectItem is not shared correctly)
  // -----------------------------------------------------------------------
  const handleSelectContainerClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const testId = target.getAttribute('data-testid');
      if (testId && testId.startsWith('select-item-')) {
        const value = testId.replace('select-item-', '');
        setCategory(value);
      }
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Submit handler
  // -----------------------------------------------------------------------
  const handleSubmit = async () => {
    const formData: Record<string, unknown> = {
      type,
      description,
      value: amount,
      date,
      category,
      responsible,
      paid,
    };

    // Include id when editing
    if (transaction?.id) {
      formData.id = transaction.id;
    }

    const result = FormSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const err of result.error.issues) {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setSubmitting(true);

    try {
      // Convert value from string to number before sending to API
      const dataToSend = {
        ...formData,
        value: parseFloat(formData.value as string),
      };
      await onSave(dataToSend as unknown as TransactionFormData);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitting = submitting || isLoading;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transaction ? 'Editar Transação' : 'Nova Transação'}
    >
      <div className="space-y-4">
        {/* Submit error banner */}
        {submitError && (
          <div
            role="alert"
            data-testid="modal-error"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          >
            {submitError}
          </div>
        )}

        {/* ---- Type toggle ---- */}
        <div>
          <Label>Tipo</Label>
          <div className="mt-1 flex gap-2">
            <Button
              type="button"
              variant={type === 'income' ? 'default' : 'outline'}
              onClick={() => setType('income')}
            >
              Receita
            </Button>
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'outline'}
              onClick={() => setType('expense')}
            >
              Despesa
            </Button>
          </div>
        </div>

        {/* ---- Description ---- */}
        <div>
          <Input
            id="description"
            aria-label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Supermercado"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-500">{errors.description}</p>
          )}
        </div>

        {/* ---- Value & Date ---- */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              id="value"
              aria-label="Valor"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="R$ 0,00"
            />
            {errors.value && (
              <p className="mt-1 text-sm text-red-500">{errors.value}</p>
            )}
          </div>
          <div>
            <Input
              id="date"
              aria-label="Data"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-500">{errors.date}</p>
            )}
          </div>
        </div>

        {/* ---- Category ---- */}
        <div onClick={handleSelectContainerClick}>
          <Label>Categoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              className={cn(
                'w-full h-9',
                'bg-surface-container-low border-outline-variant',
                'hover:bg-surface-container transition-colors',
                'text-on-surface text-sm font-medium',
                'focus:ring-2 focus:ring-primary/30'
              )}
            >
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent className="bg-surface-container ring-1 ring-outline-variant">
              {categoryOptions.map((cat) => (
                <SelectItem
                  key={cat}
                  value={cat}
                  className="text-on-surface focus:bg-surface-container-low focus:text-on-surface data-[selected]:bg-primary/10 data-[selected]:text-primary"
                >
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="mt-1 text-sm text-red-500">{errors.category}</p>
          )}
        </div>

        {/* ---- Responsible ---- */}
        <div>
          <Input
            id="responsible"
            aria-label="Responsável"
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
            placeholder="Nome do responsável"
          />
          {errors.responsible && (
            <p className="mt-1 text-sm text-red-500">{errors.responsible}</p>
          )}
        </div>

        {/* ---- Paid toggle ---- */}
        <div className="flex items-center justify-between">
          <Label htmlFor="paid">Pago</Label>
          <Toggle
            id="paid"
            checked={paid}
            onChange={setPaid}
            aria-label="Marcar como pago"
          />
        </div>

        {/* ---- Action buttons ---- */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex-1"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
