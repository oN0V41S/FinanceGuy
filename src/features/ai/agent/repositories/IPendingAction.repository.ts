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
  /** Claim atômico ready -> confirming (grava o instante em `resolvedAt`). true somente se 1 linha foi reivindicada. */
  claimForConfirm(id: string, userId: string, now: Date): Promise<boolean>;
  /** Só atua em ações abertas (needs_input/ready/awaiting_pick). false se não existe ou já está em confirmação/final. */
  updatePayload(id: string, userId: string, update: PendingActionUpdate): Promise<boolean>;
  /**
   * Transição guardada: confirmed/failed só a partir de confirming; demais só a partir de abertas.
   * false quando o estado de origem não permite (ex.: cancelar durante a confirmação).
   */
  updateStatus(
    id: string,
    userId: string,
    status: PendingActionStatus,
    now: Date,
  ): Promise<boolean>;
  /** Cancela as ações abertas da fila. Retorna quantas foram canceladas. */
  cancelQueue(queueId: string, userId: string, now: Date): Promise<number>;
  countOpen(userId: string): Promise<number>;
  /** Expira abertas vencidas e devolve `confirming` preso (claim > 2 min) a `failed`. Retorna o total afetado. */
  expireStale(userId: string, now: Date): Promise<number>;
}
