'use client';

import { useMemo, useState } from 'react';
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
import { CategoryEnum, CreateTransactionSchema } from '@/features/transactions/validations';
import type { ActionCardDto } from '@/features/ai/types';
import { parseBRL } from '@/shared/utils';

interface ActionEditFormProps {
  card: ActionCardDto;
  saving?: boolean;
  /** Erro vindo do servidor/rede, mostrado inline. */
  error?: string | null;
  onSubmit: (fields: Record<string, unknown>) => void | Promise<void>;
  onCancel: () => void;
}

type FormValues = Record<string, unknown>;

const TYPE_LABELS: Record<string, string> = { expense: 'Despesa', income: 'Receita' };
const TYPE_OPTIONS = ['expense', 'income'] as const;
const CATEGORY_OPTIONS: readonly string[] = CategoryEnum.options;

const INVALID_VALUE_MESSAGE = 'Informe um valor válido, por exemplo 50,00';

function initialValue(key: string, raw: unknown): unknown {
  if (key === 'paid') return raw === true;
  if (key === 'value') return typeof raw === 'number' ? String(raw).replace('.', ',') : '';
  return typeof raw === 'string' ? raw : '';
}

function toFieldValue(key: string, value: unknown): unknown {
  if (key === 'value') return typeof value === 'string' ? parseBRL(value) : null;
  if (typeof value === 'string') return value.trim();
  return value;
}

function validate(card: ActionCardDto, values: FormValues): Record<string, string> {
  if (card.entity !== 'transaction') return {};

  const errors: Record<string, string> = {};
  const candidate: Record<string, unknown> = {};
  for (const field of card.fields) {
    const converted = toFieldValue(field.key, field.key in values ? values[field.key] : field.value);
    if (field.key === 'value' && converted === null) {
      errors.value = INVALID_VALUE_MESSAGE;
      candidate.value = Number.NaN;
    } else if ((field.key === 'title' || field.key === 'description') && converted === '') {
      candidate[field.key] = undefined;
    } else {
      candidate[field.key] = converted;
    }
  }

  const result = CreateTransactionSchema.safeParse(candidate);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (!key || errors[key]) continue;
      if (key === 'category') errors[key] = 'Escolha uma categoria';
      else if (key === 'type') errors[key] = 'Escolha o tipo';
      else if (key === 'value') errors[key] = 'Valor deve ser positivo';
      else errors[key] = issue.message;
    }
  }
  return errors;
}

function ErrorText({ children }: { children: string }) {
  return (
    <p className="mt-1 text-sm text-finance-expense" role="alert">
      {children}
    </p>
  );
}

export function ActionEditForm({ card, saving = false, error = null, onSubmit, onCancel }: ActionEditFormProps) {
  const editable = useMemo(() => card.fields.filter((f) => f.editable), [card.fields]);
  const initial = useMemo<FormValues>(() => {
    const map: FormValues = {};
    for (const field of card.fields) map[field.key] = initialValue(field.key, field.value);
    return map;
  }, [card.fields]);

  const [values, setValues] = useState<FormValues>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = useMemo(() => validate(card, values), [card, values]);
  const visibleKeys = new Set(editable.map((f) => f.key));

  const setField = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const errorFor = (key: string): string | undefined =>
    submitted || touched[key] ? errors[key] : undefined;

  const hiddenErrors = Object.entries(errors)
    .filter(([key]) => !visibleKeys.has(key))
    .map(([, message]) => message);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSubmitted(true);

    const changed: Record<string, unknown> = {};
    for (const field of editable) {
      if (values[field.key] !== initial[field.key]) {
        changed[field.key] = toFieldValue(field.key, values[field.key]);
      }
    }
    if (Object.keys(changed).length === 0) {
      onCancel();
      return;
    }
    if (Object.keys(errors).length > 0) return;
    void onSubmit(changed);
  };

  const id = (key: string) => `${card.id}-${key}`;

  const renderField = (key: string, label: string) => {
    const fieldError = errorFor(key);
    const text = (values[key] as string) ?? '';
    const errorNode = fieldError ? <ErrorText>{fieldError}</ErrorText> : null;

    if (key === 'paid') {
      return (
        <div key={key} className="flex min-h-12 items-center justify-between">
          <Label htmlFor={id(key)} className="mb-0">
            {label}
          </Label>
          <Toggle
            id={id(key)}
            checked={values[key] === true}
            onChange={(next) => setField(key, next)}
            aria-label={label}
            colorScheme="paid"
          />
        </div>
      );
    }

    if (key === 'type' || key === 'category') {
      const options: readonly string[] = key === 'type' ? TYPE_OPTIONS : CATEGORY_OPTIONS;
      const getLabelForValue = (value: string): string =>
        key === 'type' ? (TYPE_LABELS[value] ?? value) : value;
      const current = text;
      return (
        <div key={key}>
          <Label>{label}</Label>
          <Select value={current} onValueChange={(next) => setField(key, next ?? '')}>
            <SelectTrigger className="h-12 w-full" aria-label={label}>
              <SelectValue placeholder={`Selecione: ${label.toLowerCase()}`}>
                {current ? getLabelForValue(current) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-surface-container">
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {getLabelForValue(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errorNode}
        </div>
      );
    }

    return (
      <div key={key}>
        <Label htmlFor={id(key)}>{label}</Label>
        <Input
          id={id(key)}
          type={key === 'date' ? 'date' : 'text'}
          inputMode={key === 'value' ? 'decimal' : undefined}
          maxLength={key === 'title' ? 100 : undefined}
          value={text}
          onChange={(e) => setField(key, e.target.value)}
          placeholder={key === 'value' ? 'R$ 0,00' : undefined}
          aria-invalid={fieldError ? true : undefined}
        />
        {errorNode}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      {editable.map((field) => renderField(field.key, field.label))}

      {hiddenErrors.length > 0 && submitted && <ErrorText>{hiddenErrors[0]}</ErrorText>}
      {error && <ErrorText>{error}</ErrorText>}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar edição
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
