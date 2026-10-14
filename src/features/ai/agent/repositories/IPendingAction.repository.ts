export type PendingActionStatus =
  | 'needs_input'
  | 'ready'
  | 'awaiting_pick'
  | 'confirming'
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'expired';

/** Estados em que a ação ainda pode ser editada/confirmada/cancelada. */
export const OPEN_ACTION_STATUSES: PendingActionStatus[] = ['needs_input', 'ready', 'awaiting_pick'];

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface PendingActionRecord {
  id: string;
  userId: string;
  sessionId: string;
  queueId: string;
  position: number;
  entity: string;
  op: string;
  payload: unknown;
  targetId: string | null;
  candidates: unknown | null;
  before: unknown | null;
  status: PendingActionStatus;
  expiresAt: Date;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface NewPendingAction {
  userId: string;
  sessionId: string;
  queueId: string;
  position: number;
  entity: string;
  op: string;
  payload: JsonValue;
  targetId?: string | null;
  candidates?: JsonValue | null;
  before?: JsonValue | null;
  status: PendingActionStatus;
  expiresAt: Date;
}

export interface PendingActionUpdate {
  payload?: JsonValue;
  targetId?: string | null;
  candidates?: JsonValue | null;
  before?: JsonValue | null;
  status?: PendingActionStatus;
}

export interface IPendingActionRepository {
  createMany(items: NewPendingAction[]): Promise<void>;
  getByIdForUser(id: string, userId: string): Promise<PendingActionRecord | null>;
  listByQueue(queueId: string, userId: string): Promise<PendingActionRecord[]>;
  /** Claim atômico ready -> confirming. true somente se exatamente 1 linha foi reivindicada. */
  claimForConfirm(id: string, userId: string, now: Date): Promise<boolean>;
  updatePayload(id: string, userId: string, update: PendingActionUpdate): Promise<boolean>;
  updateStatus(
    id: string,
    userId: string,
    status: PendingActionStatus,
    now: Date,
  ): Promise<boolean>;
  /** Cancela as ações abertas da fila. Retorna quantas foram canceladas. */
  cancelQueue(queueId: string, userId: string, now: Date): Promise<number>;
  countOpen(userId: string): Promise<number>;
  /** Expira ações abertas vencidas. Retorna quantas foram expiradas. */
  expireStale(userId: string, now: Date): Promise<number>;
}
