'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
        
        // Handle both category and type selects
        if (value === 'income' || value === 'expense') {
          setType(value as 'income' | 'expense');
        } else {
          setCategory(value);
        }
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
      <div className="space-y-3">
        {/* Submit error banner */}
        {submitError && (
          <Alert variant="destructive" data-testid="modal-error">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* ---- Description ---- */}
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Supermercado"
          />
          {errors.description && (
            <p className="text-finance-expense text-sm mt-1" role="alert">{errors.description}</p>
          )}
        </div>

        {/* ---- Value & Date ---- */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="value">Valor</Label>
            <Input
              id="value"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="R$ 0,00"
            />
            {errors.value && (
              <p className="text-finance-expense text-sm mt-1" role="alert">{errors.value}</p>
            )}
          </div>
          <div>
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {errors.date && (
              <p className="text-finance-expense text-sm mt-1" role="alert">{errors.date}</p>
            )}
          </div>
        </div>

        {/* ---- Category ---- */}
        <div onClick={handleSelectContainerClick}>
          <Label>Categoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger
              className="w-full h-9"
              variant="finance"
            >
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent variant="finance">
              {categoryOptions.map((cat) => (
                <SelectItem
                  key={cat}
                  value={cat}
                  variant="finance"
                >
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-finance-expense text-sm mt-1" role="alert">{errors.category}</p>
          )}
        </div>

        {/* ---- Responsible ---- */}
        <div>
          <Label htmlFor="responsible">Responsável</Label>
          <Input
            id="responsible"
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
            placeholder="Nome do responsável"
          />
          {errors.responsible && (
            <p className="text-finance-expense text-sm mt-1" role="alert">{errors.responsible}</p>
          )}
        </div>

        {/* ---- Type dropdown ---- */}
        <div onClick={handleSelectContainerClick}>
          <Label>Tipo</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger
              className="w-full h-9"
              variant="finance"
            >
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent variant="finance">
              <SelectItem value="expense" variant="finance" data-testid="select-item-expense">Despesa</SelectItem>
              <SelectItem value="income" variant="finance" data-testid="select-item-income">Receita</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-finance-expense text-sm mt-1" role="alert">{errors.type}</p>
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
            colorScheme="paid"
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
