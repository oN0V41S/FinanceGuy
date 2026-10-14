import { z } from 'zod';
import type { TransactionService } from '@/features/transactions/transactions.service';
import {
  CreateTransactionSchema,
  UpdateTransactionSchema,
} from '@/features/transactions/validations';
import type { ActionFieldDto, AgentOp } from '../../types';
import { parseMoney } from '../extract';
import { formatBRL, formatDateBR } from '../format';
import { computeMissing } from '../missingFields';
import type {
  EntityAdapter,
  EvaluateOptions,
  Evaluation,
  FieldMap,
  TargetCandidate,
  TargetHints,
} from './types';

export const TRANSACTION_FIELD_KEYS = [
  'type',
  'title',
  'value',
  'date',
  'category',
  'responsible',
  'paid',
] as const;
type FieldKey = (typeof TRANSACTION_FIELD_KEYS)[number];

const LABELS: Record<FieldKey, string> = {
  type: 'Tipo',
  title: 'Título',
  value: 'Valor',
  date: 'Data',
  category: 'Categoria',
  responsible: 'Responsável',
  paid: 'Pago',
};

const FIELD_ERRORS: Record<FieldKey, string> = {
  type: 'Escolha despesa ou receita.',
  title: 'Título muito longo (máximo 100 caracteres).',
  value: 'Informe um valor maior que zero.',
  date: 'Informe uma data válida (DD/MM/AAAA).',
  category: 'Escolha uma categoria da lista.',
  responsible: 'Informe o responsável.',
  paid: 'Informe se está pago ou pendente.',
};

const SNAPSHOT_KEYS = [
  ...TRANSACTION_FIELD_KEYS,
  'description',
  'is_recurring',
  'installment_number',
  'total_installments',
] as const;

/** Campos que o LLM pode propor (todos opcionais: o que faltar vira "needs_input"). */
const TOOL_FIELDS = CreateTransactionSchema.pick({
  type: true,
  title: true,
  value: true,
  date: true,
  category: true,
  responsible: true,
  paid: true,
}).partial();

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const BR_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function isValidYmd(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = YMD.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function isRecord(v: unknown): v is FieldMap {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeDate(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  const s = v.trim();
  const br = BR_DATE.exec(s);
  if (br) return `${br[3]}-${pad(Number(br[2]))}-${pad(Number(br[1]))}`;
  return s.slice(0, 10) === s || YMD.test(s.slice(0, 10)) ? s.slice(0, 10) : s;
}

function normalizeValue(key: FieldKey, v: unknown): unknown {
  switch (key) {
    case 'value': {
      if (typeof v === 'string') {
        const n = parseMoney(v.replace(/^R\$\s*/i, ''));
        return Number.isNaN(n) ? v : n;
      }
      return v;
    }
    case 'date':
      return normalizeDate(v);
    case 'paid': {
      if (v === 'true') return true;
      if (v === 'false') return false;
      return v;
    }
    case 'type': {
      if (typeof v !== 'string') return v;
      const t = v.trim().toLowerCase();
      if (t === 'despesa' || t === 'gasto') return 'expense';
      if (t === 'receita') return 'income';
      return t;
    }
    case 'title':
    case 'category':
    case 'responsible':
      return typeof v === 'string' ? v.trim() : v;
  }
}

function sanitize(raw: Record<string, unknown>): FieldMap {
  const out: FieldMap = {};
  for (const key of TRANSACTION_FIELD_KEYS) {
    const v = raw[key];
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    out[key] = normalizeValue(key, v);
  }
  return out;
}

function fieldErrors(fields: FieldMap): Record<string, string> {
  const errors: Record<string, string> = {};
  const shape = CreateTransactionSchema.shape as Record<string, z.ZodType>;
  for (const key of TRANSACTION_FIELD_KEYS) {
    const v = fields[key];
    if (v === undefined) continue;
    const ok = shape[key].safeParse(v).success && (key !== 'date' || isValidYmd(v));
    if (!ok) errors[key] = FIELD_ERRORS[key];
  }
  return errors;
}

function display(key: FieldKey, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  switch (key) {
    case 'type':
      return value === 'income' ? 'Receita' : 'Despesa';
    case 'value':
      return typeof value === 'number' ? formatBRL(value) : String(value);
    case 'date':
      return typeof value === 'string' ? formatDateBR(value) : String(value);
    case 'paid':
      return value === true ? 'Pago' : 'Não pago';
    default:
      return String(value);
  }
}

function snapshot(t: unknown): FieldMap {
  const src = isRecord(t) ? t : {};
  const out: FieldMap = {};
  for (const key of SNAPSHOT_KEYS) {
    const v = src[key];
    if (v !== undefined) out[key] = v instanceof Date ? v.toISOString().slice(0, 10) : v;
  }
  return out;
}

function kindWord(type: unknown): string {
  return type === 'income' ? 'receita' : 'despesa';
}

function targetLabel(record: FieldMap): string {
  const title = typeof record.title === 'string' && record.title ? record.title : (record.category as string | undefined);
  const parts = [kindWord(record.type)];
  if (title) parts.push(`"${title}"`);
  if (typeof record.value === 'number') parts.push(`de ${formatBRL(record.value)}`);
  if (typeof record.date === 'string') parts.push(`em ${formatDateBR(record.date)}`);
  return parts.join(' ');
}

function candidateLabel(record: FieldMap): string {
  const name = (typeof record.title === 'string' && record.title) || String(record.category ?? 'Transação');
  const value = typeof record.value === 'number' ? formatBRL(record.value) : '';
  const date = typeof record.date === 'string' ? formatDateBR(record.date) : '';
  return [date, name, value, `(${kindWord(record.type)})`].filter(Boolean).join(' · ');
}

const CHANGE_PHRASES: Record<FieldKey, (v: unknown) => string> = {
  type: (v) => `tipo para ${kindWord(v)}`,
  title: (v) => `título para "${String(v)}"`,
  value: (v) => `valor para ${display('value', v)}`,
  date: (v) => `data para ${display('date', v)}`,
  category: (v) => `categoria para ${String(v)}`,
  responsible: (v) => `responsável para ${String(v)}`,
  paid: (v) => (v === true ? 'situação para pago' : 'situação para pendente'),
};

function notFound(error: unknown): boolean {
  return error instanceof Error && error.message.includes('não encontrada');
}

export type TransactionAdapterService = Pick<
  TransactionService,
  'searchTransactions' | 'getTransactionById' | 'createTransaction' | 'updateTransaction' | 'deleteTransaction'
>;

export function createTransactionAdapter(service: TransactionAdapterService): EntityAdapter {
  return {
    entity: 'transaction',
    toolSchemas: { create: TOOL_FIELDS, update: TOOL_FIELDS },

    sanitize,

    evaluate(op: AgentOp, payload: FieldMap, opts: EvaluateOptions): Evaluation {
      if (op === 'delete') {
        return { fields: {}, missing: [], errors: {}, valid: opts.hasTarget };
      }
      const clean = sanitize(payload);
      const { fields, missing } = computeMissing('transaction', op, clean, {
        today: opts.today,
        defaultResponsible: opts.defaultResponsible,
      });
      const errors = fieldErrors(fields);
      let schemaOk: boolean;
      if (op === 'create') {
        schemaOk = CreateTransactionSchema.safeParse(fields).success && isValidYmd(fields.date);
      } else {
        schemaOk = UpdateTransactionSchema.safeParse(fields).success;
      }
      const valid =
        missing.length === 0 && Object.keys(errors).length === 0 && schemaOk && (op === 'create' || opts.hasTarget);
      return { fields, missing, errors, valid };
    },

    toFieldDtos(op, evaluation): ActionFieldDto[] {
      const missingKeys = new Set(evaluation.missing.map((m) => m.key));
      const keys = TRANSACTION_FIELD_KEYS.filter((k) => op === 'create' || evaluation.fields[k] !== undefined);
      if (op === 'delete') return [];
      return keys.map((key) => {
        const value = evaluation.fields[key];
        const dto: ActionFieldDto = {
          key,
          label: LABELS[key],
          value: value ?? null,
          display: display(key, value),
          editable: true,
          missing: missingKeys.has(key),
        };
        if (evaluation.errors[key]) dto.error = evaluation.errors[key];
        return dto;
      });
    },

    recordToFieldDtos(record): ActionFieldDto[] {
      return TRANSACTION_FIELD_KEYS.filter((k) => record[k] !== undefined && record[k] !== null).map((key) => ({
        key,
        label: LABELS[key],
        value: record[key],
        display: display(key, record[key]),
        editable: false,
        missing: false,
      }));
    },

    describe(op, payload, before): string {
      if (op === 'create') {
        const parts = [`Criar ${kindWord(payload.type)}`];
        if (typeof payload.value === 'number') parts.push(`de ${formatBRL(payload.value)}`);
        if (payload.category) parts.push(`em ${String(payload.category)}`);
        if (payload.title) parts.push(`(${String(payload.title)})`);
        return parts.join(' ');
      }
      const target = before ? targetLabel(before) : 'transação';
      if (op === 'delete') return `Remover ${target}`;
      const changes = TRANSACTION_FIELD_KEYS.filter((k) => payload[k] !== undefined).map((k) =>
        CHANGE_PHRASES[k](payload[k]),
      );
      return changes.length > 0 ? `Alterar ${target}: ${changes.join(', ')}` : `Alterar ${target}`;
    },

    async search(userId: string, hints: TargetHints): Promise<TargetCandidate[]> {
      const rows = await service.searchTransactions({
        userId,
        query: hints.query,
        amount: hints.amount,
        startDate: hints.date,
        endDate: hints.date,
        limit: 5,
      });
      return rows.slice(0, 5).map((row) => {
        const record = snapshot(row);
        return { id: String((row as { id: string }).id), label: candidateLabel(record), record };
      });
    },

    async getById(userId, id) {
      try {
        const row = await service.getTransactionById(id, userId);
        return row ? snapshot(row) : null;
      } catch (error) {
        if (notFound(error)) return null;
        throw error;
      }
    },

    async create(userId, fields) {
      const created = await service.createTransaction({ ...fields, userId });
      const after = snapshot(created);
      return { id: String((created as { id: string }).id), after };
    },

    async update(userId, id, changes, current) {
      // O schema de update aplica defaults (paid=false, is_recurring=false): reenvia os valores atuais
      // para que alterar só o valor não "despague" a transação.
      const data = {
        ...changes,
        paid: changes.paid ?? current.paid ?? false,
        is_recurring: current.is_recurring ?? false,
        userId,
      };
      const updated = await service.updateTransaction(id, data);
      return { after: snapshot(updated) };
    },

    async remove(userId, id) {
      await service.deleteTransaction(id, userId);
    },
  };
}
