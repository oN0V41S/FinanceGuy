import type { JsonValue } from './IPendingAction.repository';

export interface NewAuditLog {
  userId: string;
  entity: string;
  op: string;
  entityId: string;
  before?: JsonValue | null;
  after?: JsonValue | null;
  source?: string;
}

export interface IAuditLogRepository {
  create(entry: NewAuditLog): Promise<void>;
}
