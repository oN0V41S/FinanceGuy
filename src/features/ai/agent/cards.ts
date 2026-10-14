import type { ActionCardDto, ActionStatus, AgentEntity, AgentOp, NextStepsDto } from '../types';
import type { AdapterRegistry, EntityAdapter, Evaluation, FieldMap } from './entityAdapters/types';
import { todayBRT } from './extract';
import type { PendingActionRecord } from './repositories/IPendingAction.repository';

/** Item da lista de candidatas guardada no servidor (com id). Só `index` e `label` saem na API. */
export interface StoredCandidate {
  id: string;
  label: string;
  record: FieldMap;
}

const OPEN: ActionStatus[] = ['needs_input', 'ready', 'awaiting_pick'];

function isRecord(v: unknown): v is FieldMap {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function readFields(payload: unknown): FieldMap {
  return isRecord(payload) && isRecord(payload.fields) ? payload.fields : {};
}

export function readBefore(before: unknown): FieldMap | null {
  return isRecord(before) ? before : null;
}

export function readCandidates(candidates: unknown): StoredCandidate[] {
  if (!Array.isArray(candidates)) return [];
  const out: StoredCandidate[] = [];
  for (const c of candidates) {
    if (isRecord(c) && typeof c.id === 'string' && typeof c.label === 'string') {
      out.push({ id: c.id, label: c.label, record: isRecord(c.record) ? c.record : {} });
    }
  }
  return out;
}

/** Estado efetivo: ação aberta e vencida é tratada como expirada mesmo antes do `expireStale`. */
export function effectiveStatus(record: PendingActionRecord, now: Date): ActionStatus {
  if (OPEN.includes(record.status) && record.expiresAt.getTime() <= now.getTime()) return 'expired';
  return record.status;
}

export function evaluateRecord(record: PendingActionRecord, adapter: EntityAdapter, now: Date): Evaluation {
  return adapter.evaluate(record.op as AgentOp, readFields(record.payload), {
    today: todayBRT(now),
    hasTarget: record.targetId !== null,
  });
}

function missingMessage(evaluation: Evaluation): string {
  const labels = evaluation.missing.map((m) => m.label);
  return labels.length > 0 ? `Falta informar: ${labels.join(', ')}.` : 'Revise os campos destacados.';
}

export interface CardOptions {
  adapters: AdapterRegistry;
  now: Date;
  message?: string;
}

/** Constrói o DTO do card. Nunca inclui `targetId`, `candidates[].id` nem `userId`. */
export function toCard(record: PendingActionRecord, options: CardOptions): ActionCardDto {
  const { adapters, now } = options;
  const adapter = adapters[record.entity as AgentEntity];
  const status = effectiveStatus(record, now);
  const op = record.op as AgentOp;
  const base = {
    id: record.id,
    queueId: record.queueId,
    position: record.position,
    entity: record.entity as AgentEntity,
    op,
    status,
    destructive: op === 'delete',
    expiresAt: record.expiresAt.toISOString(),
  };
  if (!adapter) return { ...base, fields: [], missingFields: [], message: options.message };

  const evaluation = evaluateRecord(record, adapter, now);
  const before = readBefore(record.before);
  const card: ActionCardDto = {
    ...base,
    fields: adapter.toFieldDtos(op, evaluation),
    missingFields: evaluation.missing,
  };
  if (before) card.before = adapter.recordToFieldDtos(before);
  if (status === 'awaiting_pick') {
    card.candidates = readCandidates(record.candidates).map((c, index) => ({ index, label: c.label }));
  }

  if (options.message) card.message = options.message;
  else if (status === 'needs_input') card.message = missingMessage(evaluation);
  else if (status === 'ready') card.message = adapter.describe(op, evaluation.fields, before ?? undefined);
  else if (status === 'awaiting_pick') card.message = 'Encontrei mais de um item. Escolha qual você quer.';
  else if (status === 'expired') card.message = 'Esta ação expirou. Peça novamente ao assistente.';
  else if (status === 'failed') card.message = 'Não consegui concluir esta ação. Confira suas transações antes de tentar novamente.';
  return card;
}

/** Resumo acessível (texto) de uma lista de cards, usado como `content` da mensagem do assistente. */
export function summarizeCards(cards: ActionCardDto[], adapters: AdapterRegistry, records: PendingActionRecord[]): string {
  const lines = cards.map((card, i) => {
    const record = records[i];
    const adapter = adapters[card.entity];
    const before = record ? readBefore(record.before) : null;
    const fields = record ? readFields(record.payload) : {};
    const text = adapter ? adapter.describe(card.op, fields, before ?? undefined) : card.op;
    const suffix =
      card.status === 'needs_input'
        ? ' (faltam dados)'
        : card.status === 'awaiting_pick'
          ? ' (escolha o item)'
          : ' (aguardando confirmação)';
    return `${card.position}. ${text}${suffix}`;
  });
  const head = cards.length === 1 ? 'Preparei 1 ação para você revisar:' : `Preparei ${cards.length} ações para você revisar:`;
  return [head, ...lines].join('\n');
}

export function computeNextSteps(records: PendingActionRecord[], adapters: AdapterRegistry, now: Date): NextStepsDto {
  const sorted = [...records].sort((a, b) => a.position - b.position);
  let done = 0;
  let failed = 0;
  let cancelled = 0;
  let next: string | undefined;
  let open = 0;
  let allReady = true;

  for (const record of sorted) {
    const status = effectiveStatus(record, now);
    if (status === 'confirmed') done++;
    else if (status === 'failed') failed++;
    else if (status === 'cancelled' || status === 'expired') cancelled++;
    else if (OPEN.includes(status)) {
      open++;
      if (status !== 'ready') allReady = false;
      if (next === undefined) {
        const adapter = adapters[record.entity as AgentEntity];
        if (status === 'awaiting_pick') next = 'Escolha qual item você quer usar.';
        else if (status === 'needs_input') {
          const evaluation = adapter ? evaluateRecord(record, adapter, now) : null;
          next = evaluation ? missingMessage(evaluation) : 'Complete os dados da ação.';
        } else if (adapter) {
          next = `Confirmar: ${adapter.describe(record.op as AgentOp, readFields(record.payload), readBefore(record.before) ?? undefined)}`;
        }
      }
    }
  }

  const dto: NextStepsDto = {
    total: sorted.length,
    done,
    failed,
    cancelled,
    canConfirmAll: open > 0 && allReady,
  };
  if (next !== undefined) dto.next = next;
  return dto;
}
