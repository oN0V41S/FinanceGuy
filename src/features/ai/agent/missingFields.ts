import { CategoryEnum } from '@/features/transactions/validations';
import type { AgentEntity, AgentOp, MissingFieldDto } from '../types';
import { todayBRT } from './extract';

export interface ComputeMissingOptions {
  /** YYYY-MM-DD usado como data padrão; se ausente, calcula "hoje" em America/Sao_Paulo. */
  today?: string;
  /**
   * Responsável padrão. O TransactionModal não tem padrão (campo começa vazio),
   * então só é preenchido quando o chamador informar (ex.: nome do usuário).
   */
  defaultResponsible?: string;
  now?: Date;
}

export interface ComputeMissingResult {
  fields: Record<string, unknown>;
  missing: MissingFieldDto[];
}

const TRANSACTION_UPDATE_KEYS = ['type', 'value', 'date', 'title', 'category', 'responsible', 'paid'];

const MISSING_TYPE: MissingFieldDto = { key: 'type', label: 'tipo', example: 'despesa ou receita' };
const MISSING_VALUE: MissingFieldDto = { key: 'value', label: 'valor', example: 'R$ 50,00' };
const MISSING_CATEGORY: MissingFieldDto = {
  key: 'category',
  label: 'categoria',
  example: CategoryEnum.options.slice(0, 3).join(', '),
};
const MISSING_RESPONSIBLE: MissingFieldDto = { key: 'responsible', label: 'responsável', example: 'Maria' };
const MISSING_CHANGE: MissingFieldDto = {
  key: 'changes',
  label: 'o que alterar',
  example: 'valor R$ 80,00',
};

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

function validType(v: unknown): boolean {
  return v === 'income' || v === 'expense';
}

function validValue(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

function validCategory(v: unknown): boolean {
  return typeof v === 'string' && (CategoryEnum.options as readonly string[]).includes(v);
}

/**
 * Calcula campos obrigatórios faltantes e aplica padrões.
 * create/transaction: type, value>0, category, responsible obrigatórios; date padrão hoje; paid padrão false (só vira pago se o usuário disser).
 * update: ao menos um campo alterado. delete: nada.
 */
export function computeMissing(
  entity: AgentEntity,
  op: AgentOp,
  fields: Record<string, unknown>,
  opts: ComputeMissingOptions = {},
): ComputeMissingResult {
  const result: Record<string, unknown> = { ...fields };
  const missing: MissingFieldDto[] = [];

  if (entity !== 'transaction' || op === 'delete') return { fields: result, missing };

  if (op === 'update') {
    const changed = TRANSACTION_UPDATE_KEYS.some((k) => !isBlank(fields[k]));
    if (!changed) missing.push(MISSING_CHANGE);
    return { fields: result, missing };
  }

  if (isBlank(result.date)) result.date = opts.today ?? todayBRT(opts.now ?? new Date());
  if (result.paid === undefined || result.paid === null) result.paid = false;
  if (isBlank(result.responsible) && !isBlank(opts.defaultResponsible)) {
    result.responsible = opts.defaultResponsible!.trim();
  }

  if (!validType(result.type)) missing.push(MISSING_TYPE);
  if (!validValue(result.value)) missing.push(MISSING_VALUE);
  if (!validCategory(result.category)) missing.push(MISSING_CATEGORY);
  if (isBlank(result.responsible)) missing.push(MISSING_RESPONSIBLE);

  return { fields: result, missing };
}
