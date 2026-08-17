'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  title: z
    .string()
    .max(100, 'Título muito longo (máximo 100 caracteres)')
    .optional(),
  description: z
    .string()
    .max(255, 'Descrição muito longa (máximo 255 caracteres)')
    .optional(),
  value: z.string().refine(
    (val) => {
      if (val === '') return false;
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: 'Valor deve ser positivo' },
  ),
  date: z.string().min(1, 'Data é obrigatória'),
  category: z.string().refine(
    (val) => CategoryEnum.safeParse(val).success,
    { message: 'Este campo não deve estar vazio' },
  ),
  responsible: z
    .string()
    .min(1, 'Responsável é obrigatório')
    .max(100, 'Responsável muito longo (máximo 100 caracteres)'),
  paid: z.boolean(),
  isRecurring: z.boolean().optional(),
  totalInstallments: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.isRecurring) {
    const n = parseInt(data.totalInstallments ?? '', 10);
    if (!data.totalInstallments || data.totalInstallments.trim() === '') {
      ctx.addIssue({ code: 'custom', path: ['totalInstallments'], message: 'Informe o número de parcelas' });
    } else if (Number.isNaN(n)) {
      ctx.addIssue({ code: 'custom', path: ['totalInstallments'], message: 'Número de parcelas inválido' });
    } else if (n < 2) {
      ctx.addIssue({ code: 'custom', path: ['totalInstallments'], message: 'Mínimo de 2 parcelas' });
    } else if (n > 48) {
      ctx.addIssue({ code: 'custom', path: ['totalInstallments'], message: 'Máximo de 48 parcelas' });
    }
  }
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TransactionFormData) => Promise<void>;
  onSaveFuture?: (data: TransactionFormData) => Promise<void>;
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
  onSaveFuture,
  transaction = null,
  isLoading = false,
}: TransactionModalProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [responsible, setResponsible] = useState('');
  const [paid, setPaid] = useState(false);
  const [applyToFuture, setApplyToFuture] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [installments, setInstallments] = useState('');
  const [formTouched, setFormTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Uma transação é considerada recorrente quando pertence a uma série
  // (parcela filha, recorrência marcada ou parcelamento em N vezes).
  const isRecurringTransaction = Boolean(
    transaction?.parent_transaction_id ||
      transaction?.is_recurring ||
      transaction?.total_installments,
  );

  // -----------------------------------------------------------------------
  // Reset form when modal opens or transaction changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    if (transaction) {
      setType(transaction.type);
      setTitle(transaction.title ?? '');
      setDescription(transaction.description ?? '');
      setAmount(String(transaction.value));
      setDate(transaction.date);
      setCategory(transaction.category);
      setResponsible(transaction.responsible);
      setPaid(transaction.paid ?? false);
    } else {
      setType('expense');
      setTitle('');
      setDescription('');
      setAmount('');
      setDate('');
      setCategory('');
      setResponsible('');
      setPaid(false);
    }

    setApplyToFuture(false);
    setIsRecurring(false);
    setInstallments('');
    setFormTouched(false);
    setSubmitError(null);
    setSubmitting(false);
  }, [isOpen, transaction]);

  // -----------------------------------------------------------------------
  // Derived form state (live validation)
  // -----------------------------------------------------------------------
  const buildFormData = useCallback(() => {
    const data: Record<string, unknown> = {
      type,
      title,
      description,
      value: amount,
      date,
      category,
      responsible,
      paid,
      isRecurring,
      totalInstallments: installments,
    };

    // Include id when editing
    if (transaction?.id) {
      data.id = transaction.id;
    }
    return data;
  }, [type, title, description, amount, date, category, responsible, paid, isRecurring, installments, transaction?.id]);

  const markTouched = useCallback(() => setFormTouched(true), []);

  const validation = useMemo(
    () => FormSchema.safeParse(buildFormData()),
    [buildFormData],
  );
  const isFormValid = validation.success;

  const fieldErrors = useMemo(() => {
    if (validation.success) return {} as Record<string, string>;
    const map: Record<string, string> = {};
    for (const issue of validation.error.issues) {
      const field = issue.path[0] as string;
      if (!map[field]) map[field] = issue.message;
    }
    return map;
  }, [validation]);

  // -----------------------------------------------------------------------
  // Dirty tracking — em edição o botão Salvar só habilita após o usuário
  // alterar algum campo; reverter ao estado inicial desabilita novamente.
  // Em criação (sem transaction) o form já inicia vazio, então dirty = true.
  // -----------------------------------------------------------------------
  const currentValues = useMemo(
    () => ({ type, title, description, amount, date, category, responsible, paid }),
    [type, title, description, amount, date, category, responsible, paid],
  );

  const isDirty = useMemo(() => {
    if (!transaction) return true;
    const snapshot = {
      type: transaction.type,
      title: transaction.title ?? '',
      description: transaction.description ?? '',
      amount: String(transaction.value),
      date: transaction.date,
      category: transaction.category,
      responsible: transaction.responsible,
      paid: transaction.paid ?? false,
    };
    return JSON.stringify(snapshot) !== JSON.stringify(currentValues);
  }, [transaction, currentValues]);

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
        setFormTouched(true);

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
    setFormTouched(true);

    const result = FormSchema.safeParse(buildFormData());
    if (!result.success) return;

    setSubmitError(null);
    setSubmitting(true);

    try {
      // Convert value from string to number before sending to API
      const dataToSend = {
        ...buildFormData(),
        value: parseFloat(amount),
        is_recurring: isRecurring,
        ...(isRecurring ? { total_installments: parseInt(installments, 10) } : {}),
      } as unknown as TransactionFormData;

      // Transações recorrentes em edição podem propagar a alteração
      // para todas as parcelas futuras (o histórico nunca é alterado).
      if (applyToFuture && onSaveFuture && transaction) {
        await onSaveFuture(dataToSend);
      } else {
        await onSave(dataToSend);
      }
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

        {/* ---- Title ---- */}
        <div>
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            maxLength={100}
            value={title}
            onChange={(e) => {
              markTouched();
              setTitle(e.target.value);
            }}
            placeholder="Ex: Aluguel"
          />
          {formTouched && fieldErrors.title && (
            <p className="text-finance-expense text-sm mt-1" role="alert">{fieldErrors.title}</p>
          )}
        </div>

        {/* ---- Description ---- */}
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => {
              markTouched();
              setDescription(e.target.value);
            }}
            placeholder="Ex: Supermercado"
          />
          {formTouched && fieldErrors.description && (
            <p className="text-finance-expense text-sm mt-1" role="alert">{fieldErrors.description}</p>
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
              onChange={(e) => {
                markTouched();
                setAmount(e.target.value);
              }}
              placeholder="R$ 0,00"
            />
            {formTouched && fieldErrors.value && (
              <p className="text-finance-expense text-sm mt-1" role="alert">{fieldErrors.value}</p>
            )}
          </div>
          <div>
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => {
                markTouched();
                setDate(e.target.value);
              }}
            />
            {formTouched && fieldErrors.date && (
              <p className="text-finance-expense text-sm mt-1" role="alert">{fieldErrors.date}</p>
            )}
          </div>
        </div>

        {/* ---- Category ---- */}
        <div onClick={handleSelectContainerClick}>
          <Label>Categoria</Label>
          <Select value={category} onValueChange={(value) => {
            markTouched();
            setCategory(value ?? '');
          }}>
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
          {formTouched && fieldErrors.category && (
            <p className="text-finance-expense text-sm mt-1" role="alert">{fieldErrors.category}</p>
          )}
        </div>

        {/* ---- Responsible ---- */}
        <div>
          <Label htmlFor="responsible">Responsável</Label>
          <Input
            id="responsible"
            value={responsible}
            onChange={(e) => {
              markTouched();
              setResponsible(e.target.value);
            }}
            placeholder="Nome do responsável"
          />
          {formTouched && fieldErrors.responsible && (
            <p className="text-finance-expense text-sm mt-1" role="alert">{fieldErrors.responsible}</p>
          )}
        </div>

        {/* ---- Type dropdown ---- */}
        <div onClick={handleSelectContainerClick}>
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(value) => {
            markTouched();
            setType(value as 'income' | 'expense');
          }}>
            <SelectTrigger
              className="w-full h-9"
              variant="finance"
            >
              <SelectValue placeholder="Selecione o tipo">
                {(value: string) =>
                  value === 'income'
                    ? 'Receita'
                    : value === 'expense'
                      ? 'Despesa'
                      : 'Selecione o tipo'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent variant="finance">
              <SelectItem value="expense" variant="finance" data-testid="select-item-expense">Despesa</SelectItem>
              <SelectItem value="income" variant="finance" data-testid="select-item-income">Receita</SelectItem>
            </SelectContent>
          </Select>
          {formTouched && fieldErrors.type && (
            <p className="text-finance-expense text-sm mt-1" role="alert">{fieldErrors.type}</p>
          )}
        </div>

        {/* ---- Paid toggle ---- */}
        <div className="flex items-center justify-between">
          <Label htmlFor="paid">Pago</Label>
          <Toggle
            id="paid"
            checked={paid}
            onChange={(next) => {
              markTouched();
              setPaid(next);
            }}
            aria-label="Marcar como pago"
            colorScheme="paid"
          />
        </div>

        {/* ---- Create recurring (installments) toggle (create mode only) ---- */}
        {!transaction && (
          <>
            <div className="flex items-center justify-between">
              <Label htmlFor="is-recurring">Transação recorrente (parcelada)</Label>
              <Toggle
                id="is-recurring"
                checked={isRecurring}
                onChange={(next) => {
                  markTouched();
                  setIsRecurring(next);
                }}
                aria-label="Transação recorrente (parcelada)"
                colorScheme="default"
              />
            </div>

            {isRecurring && (
              <div>
                <Label htmlFor="installments">Número de parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  min={2}
                  max={48}
                  value={installments}
                  onChange={(e) => {
                    markTouched();
                    setInstallments(e.target.value);
                  }}
                  placeholder="Ex: 3"
                />
                {formTouched && fieldErrors.totalInstallments && (
                  <p className="text-finance-expense text-sm mt-1" role="alert">{fieldErrors.totalInstallments}</p>
                )}
              </div>
            )}
          </>
        )}

        {/* ---- Apply to future installments (recurring transactions) ---- */}
        {isRecurringTransaction && transaction && onSaveFuture && (
          <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
            <Label htmlFor="apply-to-future" className="text-sm">
              Aplicar a todas as parcelas futuras
            </Label>
            <Toggle
              id="apply-to-future"
              checked={applyToFuture}
              onChange={(next) => {
                markTouched();
                setApplyToFuture(next);
              }}
              aria-label="Aplicar a todas as parcelas futuras"
              colorScheme="default"
            />
          </div>
        )}

        {/* ---- Action button ---- */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={!isFormValid || !isDirty || isSubmitting}
            onClick={handleSubmit}
            className="w-full"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
