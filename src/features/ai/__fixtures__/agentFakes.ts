import type {
  IPendingActionRepository,
  NewPendingAction,
  PendingActionRecord,
  PendingActionUpdate,
  PendingActionStatus,
} from '../agent/repositories/IPendingAction.repository';
import { OPEN_ACTION_STATUSES } from '../agent/repositories/IPendingAction.repository';
import type { TransactionAdapterService } from '../agent/entityAdapters/transaction';

export const NOW = new Date('2026-10-14T15:00:00.000Z');

/** Repositório de ações pendentes em memória, com a mesma semântica de claim/escopo por usuário do Postgres. */
export class InMemoryPendingRepo implements IPendingActionRepository {
  rows: PendingActionRecord[] = [];
  private seq = 0;

  constructor(private readonly clock: () => Date = () => NOW) {}

  async createMany(items: NewPendingAction[]): Promise<void> {
    for (const item of items) {
      this.seq += 1;
      this.rows.push({
        id: `act-${this.seq}`,
        userId: item.userId,
        sessionId: item.sessionId,
        queueId: item.queueId,
        position: item.position,
        entity: item.entity,
        op: item.op,
        payload: item.payload,
        targetId: item.targetId ?? null,
        candidates: item.candidates ?? null,
        before: item.before ?? null,
        status: item.status,
        expiresAt: item.expiresAt,
        createdAt: this.clock(),
        resolvedAt: null,
      });
    }
  }

  async getByIdForUser(id: string, userId: string): Promise<PendingActionRecord | null> {
    const row = this.rows.find((r) => r.id === id && r.userId === userId);
    return row ? { ...row } : null;
  }

  async listByQueue(queueId: string, userId: string): Promise<PendingActionRecord[]> {
    return this.rows
      .filter((r) => r.queueId === queueId && r.userId === userId)
      .sort((a, b) => a.position - b.position)
      .map((r) => ({ ...r }));
  }

  async claimForConfirm(id: string, userId: string, now: Date): Promise<boolean> {
    const row = this.rows.find((r) => r.id === id && r.userId === userId);
    if (!row || row.status !== 'ready' || row.expiresAt.getTime() <= now.getTime()) return false;
    row.status = 'confirming';
    return true;
  }

  async updatePayload(id: string, userId: string, update: PendingActionUpdate): Promise<boolean> {
    const row = this.rows.find((r) => r.id === id && r.userId === userId);
    if (!row) return false;
    if (update.payload !== undefined) row.payload = update.payload;
    if (update.targetId !== undefined) row.targetId = update.targetId;
    if (update.candidates !== undefined) row.candidates = update.candidates;
    if (update.before !== undefined) row.before = update.before;
    if (update.status !== undefined) row.status = update.status;
    return true;
  }

  async updateStatus(id: string, userId: string, status: PendingActionStatus, now: Date): Promise<boolean> {
    const row = this.rows.find((r) => r.id === id && r.userId === userId);
    if (!row) return false;
    row.status = status;
    row.resolvedAt = now;
    return true;
  }

  async cancelQueue(queueId: string, userId: string, now: Date): Promise<number> {
    let count = 0;
    for (const row of this.rows) {
      if (row.queueId === queueId && row.userId === userId && OPEN_ACTION_STATUSES.includes(row.status)) {
        row.status = 'cancelled';
        row.resolvedAt = now;
        count += 1;
      }
    }
    return count;
  }

  async countOpen(userId: string): Promise<number> {
    return this.rows.filter((r) => r.userId === userId && OPEN_ACTION_STATUSES.includes(r.status)).length;
  }

  async expireStale(userId: string, now: Date): Promise<number> {
    let count = 0;
    for (const row of this.rows) {
      if (
        row.userId === userId &&
        OPEN_ACTION_STATUSES.includes(row.status) &&
        row.expiresAt.getTime() <= now.getTime()
      ) {
        row.status = 'expired';
        row.resolvedAt = now;
        count += 1;
      }
    }
    return count;
  }
}

export interface TxRow {
  id: string;
  type: 'expense' | 'income';
  title: string;
  value: number;
  date: string;
  category: string;
  responsible: string;
  paid: boolean;
  is_recurring?: boolean;
  userId?: string;
}

export function txRow(overrides: Partial<TxRow> = {}): TxRow {
  return {
    id: 'tx-1',
    type: 'expense',
    title: 'Mercado',
    value: 120,
    date: '2026-10-10',
    category: 'Alimentação',
    responsible: 'Ana',
    paid: true,
    is_recurring: false,
    userId: 'user-1',
    ...overrides,
  };
}

export type MockedTxService = {
  [K in keyof TransactionAdapterService]: jest.Mock;
};

export function makeTxService(): MockedTxService {
  return {
    searchTransactions: jest.fn().mockResolvedValue([]),
    getTransactionById: jest.fn().mockResolvedValue(null),
    createTransaction: jest.fn().mockImplementation(async (data: Record<string, unknown>) => ({
      id: 'tx-new',
      ...data,
    })),
    updateTransaction: jest.fn().mockImplementation(async (id: string, data: Record<string, unknown>) => ({
      id,
      ...data,
    })),
    deleteTransaction: jest.fn().mockResolvedValue(undefined),
  };
}
