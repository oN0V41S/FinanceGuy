import type { IContextCache } from '../session/ISession.service';
import type {
  ActionCardDto,
  ActionStatus,
  AgentEntity,
  AgentOp,
  ConfirmActionsResponse,
  ConfirmItemResult,
  NextStepsDto,
} from '../types';
import {
  computeNextSteps,
  effectiveStatus,
  evaluateRecord,
  readCandidates,
  readFields,
  toCard,
} from './cards';
import { ActionConflictError, ActionExpiredError, ActionInvalidError, ActionNotFoundError } from './errors';
import type { AdapterRegistry, EntityAdapter, FieldMap } from './entityAdapters/types';
import { todayBRT } from './extract';
import type { IAuditLogRepository } from './repositories/IAuditLog.repository';
import {
  OPEN_ACTION_STATUSES,
  type IPendingActionRepository,
  type JsonValue,
  type PendingActionRecord,
} from './repositories/IPendingAction.repository';

export const MAX_CONFIRM_BATCH = 5;
const AUDIT_SOURCE = 'ai-agent';

export interface ActionExecutorDeps {
  adapters: AdapterRegistry;
  pending: IPendingActionRepository;
  audit: IAuditLogRepository;
  contextCache?: Pick<IContextCache, 'invalidate'>;
  now?: () => Date;
}

export interface CancelQueueResponse {
  cancelled: number;
  cards: ActionCardDto[];
  nextSteps: NextStepsDto;
}

export interface QueueMutationResponse {
  card: ActionCardDto;
  nextSteps: NextStepsDto;
}

const MESSAGES = {
  failed: 'Não consegui concluir esta ação. Nada foi alterado; tente novamente.',
  invalid: 'Alguns dados são inválidos. Revise os campos e tente novamente.',
  targetGone: 'Não encontrei mais este item (ele pode ter sido alterado ou removido). Nada foi feito.',
  unavailable: 'Esta ação não está disponível.',
} as const;

function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

function isOpen(status: ActionStatus): boolean {
  return (OPEN_ACTION_STATUSES as ActionStatus[]).includes(status);
}

export class ActionExecutor {
  private readonly now: () => Date;

  constructor(private readonly deps: ActionExecutorDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  // ── Confirmação ──

  /** Confirma 1..5 ações em ordem. Sucesso parcial é permitido; cada item tem seu resultado. */
  async confirm(userId: string, ids: string[]): Promise<ConfirmActionsResponse> {
    if (ids.length < 1 || ids.length > MAX_CONFIRM_BATCH || new Set(ids).size !== ids.length) {
      throw new ActionInvalidError('Informe de 1 a 5 ações diferentes para confirmar.');
    }

    // Pré-checagem de pertencimento: qualquer id alheio ou inexistente derruba o lote inteiro, sem executar nada.
    const records: PendingActionRecord[] = [];
    for (const id of ids) {
      const record = await this.deps.pending.getByIdForUser(id, userId);
      if (!record) throw new ActionNotFoundError();
      records.push(record);
    }

    const results: ConfirmItemResult[] = [];
    for (const record of records) {
      results.push(await this.confirmOne(userId, record, ids.length === 1));
    }

    const queueId = records[0].queueId;
    const queue = await this.deps.pending.listByQueue(queueId, userId);
    return { results, nextSteps: computeNextSteps(queue, this.deps.adapters, this.now()) };
  }

  private async confirmOne(userId: string, record: PendingActionRecord, strict: boolean): Promise<ConfirmItemResult> {
    const { pending } = this.deps;
    const now = this.now();

    const claimed = await pending.claimForConfirm(record.id, userId, now);
    if (!claimed) {
      const fresh = await pending.getByIdForUser(record.id, userId);
      if (!fresh) throw new ActionNotFoundError();
      const expired = isOpen(fresh.status) && fresh.expiresAt.getTime() <= now.getTime();
      if (expired) await pending.updateStatus(fresh.id, userId, 'expired', now);
      if (strict) {
        if (expired || fresh.status === 'expired') throw new ActionExpiredError();
        throw new ActionConflictError();
      }
      const message = expired || fresh.status === 'expired' ? new ActionExpiredError().message : new ActionConflictError().message;
      return this.result(userId, fresh.id, expired ? 'expired' : fresh.status, message);
    }

    const outcome = await this.execute(userId, record);
    await pending.updateStatus(record.id, userId, outcome.status, this.now());
    if (outcome.status === 'confirmed') await this.invalidateContext(userId);
    return this.result(userId, record.id, outcome.status, outcome.message);
  }

  private async execute(
    userId: string,
    record: PendingActionRecord,
  ): Promise<{ status: 'confirmed' | 'failed'; message: string }> {
    const adapter = this.deps.adapters[record.entity as AgentEntity];
    if (!adapter) return { status: 'failed', message: MESSAGES.unavailable };
    const op = record.op as AgentOp;

    try {
      const evaluation = evaluateRecord(record, adapter, this.now());
      if (!evaluation.valid) return { status: 'failed', message: MESSAGES.invalid };

      if (op === 'create') {
        const { id, after } = await adapter.create(userId, evaluation.fields);
        await this.writeAudit(userId, record, id, null, after);
        return { status: 'confirmed', message: `Feito: ${adapter.describe(op, evaluation.fields)}.` };
      }

      const targetId = record.targetId;
      if (!targetId) return { status: 'failed', message: MESSAGES.targetGone };
      const current = await adapter.getById(userId, targetId);
      if (!current) return { status: 'failed', message: MESSAGES.targetGone };

      if (op === 'update') {
        const { after } = await adapter.update(userId, targetId, evaluation.fields, current);
        await this.writeAudit(userId, record, targetId, current, after);
        return { status: 'confirmed', message: `Feito: ${adapter.describe(op, evaluation.fields, current)}.` };
      }

      await adapter.remove(userId, targetId);
      await this.writeAudit(userId, record, targetId, current, null);
      return { status: 'confirmed', message: `Feito: ${adapter.describe(op, {}, current)}.` };
    } catch (error) {
      console.error('[ai.executor] Falha ao executar a ação', { name: errorName(error), op });
      return { status: 'failed', message: errorName(error) === 'ZodError' ? MESSAGES.invalid : MESSAGES.failed };
    }
  }

  /** Auditoria só no banco (nunca em console). Falha de auditoria não desfaz a escrita já aplicada. */
  private async writeAudit(
    userId: string,
    record: PendingActionRecord,
    entityId: string,
    before: FieldMap | null,
    after: FieldMap | null,
  ): Promise<void> {
    try {
      await this.deps.audit.create({
        userId,
        entity: record.entity,
        op: record.op,
        entityId,
        before: before ? toJson(before) : null,
        after: after ? toJson(after) : null,
        source: AUDIT_SOURCE,
      });
    } catch (error) {
      console.error('[ai.executor] Falha ao gravar auditoria', { name: errorName(error) });
    }
  }

  private async invalidateContext(userId: string): Promise<void> {
    try {
      await this.deps.contextCache?.invalidate(userId);
    } catch (error) {
      console.error('[ai.executor] Falha ao invalidar o cache de contexto', { name: errorName(error) });
    }
  }

  private async result(userId: string, id: string, status: ActionStatus, message: string): Promise<ConfirmItemResult> {
    const record = await this.deps.pending.getByIdForUser(id, userId);
    if (!record) throw new ActionNotFoundError();
    const card = toCard({ ...record, status }, { adapters: this.deps.adapters, now: this.now(), message });
    return { id, status: card.status, message, card };
  }

  // ── Edição ──

  /** PATCH: revalida com Zod, recalcula campos faltantes e o status (ready/needs_input). */
  async update(userId: string, id: string, fields: Record<string, unknown>): Promise<QueueMutationResponse> {
    const record = await this.requireOpen(userId, id);
    const op = record.op as AgentOp;
    const adapter = this.adapterFor(record);
    if (op === 'delete') throw new ActionInvalidError('Esta ação não tem campos editáveis.');
    if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) {
      throw new ActionInvalidError('Campos inválidos.');
    }

    const merged: FieldMap = { ...readFields(record.payload) };
    const incoming = adapter.sanitize(fields);
    for (const key of Object.keys(fields)) {
      const raw = fields[key];
      const cleared = raw === null || (typeof raw === 'string' && raw.trim() === '');
      if (cleared) delete merged[key];
    }
    Object.assign(merged, incoming);

    const evaluation = adapter.evaluate(op, merged, {
      today: todayBRT(this.now()),
      hasTarget: record.targetId !== null,
    });
    const status =
      record.status === 'awaiting_pick' ? 'awaiting_pick' : evaluation.valid ? 'ready' : 'needs_input';

    const saved = await this.deps.pending.updatePayload(id, userId, {
      payload: toJson({ fields: evaluation.fields }),
      status,
    });
    if (!saved) throw new ActionNotFoundError();
    return this.mutationResponse(userId, id);
  }

  // ── Escolha de candidata ──

  async select(userId: string, id: string, index: number): Promise<QueueMutationResponse> {
    const record = await this.requireOpen(userId, id);
    if (record.status !== 'awaiting_pick') throw new ActionConflictError('Esta ação não está aguardando escolha.');
    const adapter = this.adapterFor(record);

    const candidates = readCandidates(record.candidates);
    if (!Number.isInteger(index) || index < 0 || index >= candidates.length) {
      throw new ActionInvalidError('Opção inválida.');
    }
    const chosen = candidates[index];
    const evaluation = adapter.evaluate(record.op as AgentOp, readFields(record.payload), {
      today: todayBRT(this.now()),
      hasTarget: true,
    });

    const saved = await this.deps.pending.updatePayload(id, userId, {
      payload: toJson({ fields: evaluation.fields }),
      targetId: chosen.id,
      before: toJson(chosen.record),
      candidates: null,
      status: evaluation.valid ? 'ready' : 'needs_input',
    });
    if (!saved) throw new ActionNotFoundError();
    return this.mutationResponse(userId, id);
  }

  // ── Cancelamento ──

  async cancel(userId: string, id: string): Promise<QueueMutationResponse> {
    const record = await this.deps.pending.getByIdForUser(id, userId);
    if (!record) throw new ActionNotFoundError();
    if (!isOpen(record.status)) throw new ActionConflictError();
    const saved = await this.deps.pending.updateStatus(id, userId, 'cancelled', this.now());
    if (!saved) throw new ActionNotFoundError();
    return this.mutationResponse(userId, id);
  }

  async cancelQueue(userId: string, queueId: string): Promise<CancelQueueResponse> {
    const existing = await this.deps.pending.listByQueue(queueId, userId);
    if (existing.length === 0) throw new ActionNotFoundError();
    const cancelled = await this.deps.pending.cancelQueue(queueId, userId, this.now());
    const records = await this.deps.pending.listByQueue(queueId, userId);
    const now = this.now();
    return {
      cancelled,
      cards: records.map((r) => toCard(r, { adapters: this.deps.adapters, now })),
      nextSteps: computeNextSteps(records, this.deps.adapters, now),
    };
  }

  // ── Auxiliares ──

  /** Carrega a ação do próprio usuário e garante que ainda está aberta e dentro do prazo. */
  private async requireOpen(userId: string, id: string): Promise<PendingActionRecord> {
    const record = await this.deps.pending.getByIdForUser(id, userId);
    if (!record) throw new ActionNotFoundError();
    const status = effectiveStatus(record, this.now());
    if (status === 'expired') {
      if (record.status !== 'expired') await this.deps.pending.updateStatus(id, userId, 'expired', this.now());
      throw new ActionExpiredError();
    }
    if (!isOpen(record.status)) throw new ActionConflictError();
    return record;
  }

  private adapterFor(record: PendingActionRecord): EntityAdapter {
    const adapter = this.deps.adapters[record.entity as AgentEntity];
    if (!adapter) throw new ActionInvalidError(MESSAGES.unavailable);
    return adapter;
  }

  private async mutationResponse(userId: string, id: string): Promise<QueueMutationResponse> {
    const record = await this.deps.pending.getByIdForUser(id, userId);
    if (!record) throw new ActionNotFoundError();
    const queue = await this.deps.pending.listByQueue(record.queueId, userId);
    const now = this.now();
    return {
      card: toCard(record, { adapters: this.deps.adapters, now }),
      nextSteps: computeNextSteps(queue, this.deps.adapters, now),
    };
  }
}
