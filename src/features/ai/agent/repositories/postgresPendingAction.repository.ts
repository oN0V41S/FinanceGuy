import { prisma } from '@/lib/prisma';
import {
  OPEN_ACTION_STATUSES,
  type IPendingActionRepository,
  type NewPendingAction,
  type PendingActionRecord,
  type PendingActionStatus,
  type PendingActionUpdate,
} from './IPendingAction.repository';
import { toJson, toNullableJson } from './prismaJson';

const FINAL_STATUSES: PendingActionStatus[] = ['confirmed', 'failed', 'cancelled', 'expired'];

/** Confirmação presa (crash entre o claim e o resultado) é devolvida após este prazo. */
export const CONFIRMING_STALE_MS = 2 * 60_000;

/** Estados de origem permitidos por transição: evita corrida com a confirmação em andamento. */
function allowedFrom(status: PendingActionStatus): PendingActionStatus[] {
  return status === 'confirmed' || status === 'failed' ? ['confirming'] : OPEN_ACTION_STATUSES;
}

export class PostgresPendingActionRepository implements IPendingActionRepository {
  async createMany(items: NewPendingAction[]): Promise<void> {
    if (items.length === 0) return;
    await prisma.pendingAction.createMany({
      data: items.map((item) => ({
        userId: item.userId,
        sessionId: item.sessionId,
        queueId: item.queueId,
        position: item.position,
        entity: item.entity,
        op: item.op,
        payload: toJson(item.payload),
        targetId: item.targetId ?? null,
        candidates: toNullableJson(item.candidates),
        before: toNullableJson(item.before),
        status: item.status,
        expiresAt: item.expiresAt,
      })),
    });
  }

  async getByIdForUser(id: string, userId: string): Promise<PendingActionRecord | null> {
    const row = await prisma.pendingAction.findFirst({ where: { id, userId } });
    return row as PendingActionRecord | null;
  }

  async listByQueue(queueId: string, userId: string): Promise<PendingActionRecord[]> {
    const rows = await prisma.pendingAction.findMany({
      where: { queueId, userId },
      orderBy: { position: 'asc' },
    });
    return rows as PendingActionRecord[];
  }

  async claimForConfirm(id: string, userId: string, now: Date): Promise<boolean> {
    const result = await prisma.pendingAction.updateMany({
      where: { id, userId, status: 'ready', expiresAt: { gt: now } },
      // `resolvedAt` guarda o instante do claim enquanto confirma (usado por expireStale).
      data: { status: 'confirming', resolvedAt: now },
    });
    return result.count === 1;
  }

  async updatePayload(id: string, userId: string, update: PendingActionUpdate): Promise<boolean> {
    const data: Record<string, unknown> = {};
    if (update.payload !== undefined) data.payload = toJson(update.payload);
    if (update.targetId !== undefined) data.targetId = update.targetId;
    if (update.candidates !== undefined) data.candidates = toNullableJson(update.candidates);
    if (update.before !== undefined) data.before = toNullableJson(update.before);
    if (update.status !== undefined) data.status = update.status;
    const result = await prisma.pendingAction.updateMany({
      where: { id, userId, status: { in: OPEN_ACTION_STATUSES } },
      data,
    });
    return result.count === 1;
  }

  async updateStatus(
    id: string,
    userId: string,
    status: PendingActionStatus,
    now: Date,
  ): Promise<boolean> {
    const data = FINAL_STATUSES.includes(status) ? { status, resolvedAt: now } : { status };
    const result = await prisma.pendingAction.updateMany({
      where: { id, userId, status: { in: allowedFrom(status) } },
      data,
    });
    return result.count === 1;
  }

  async cancelQueue(queueId: string, userId: string, now: Date): Promise<number> {
    const result = await prisma.pendingAction.updateMany({
      where: { queueId, userId, status: { in: OPEN_ACTION_STATUSES } },
      data: { status: 'cancelled', resolvedAt: now },
    });
    return result.count;
  }

  async countOpen(userId: string): Promise<number> {
    return prisma.pendingAction.count({
      where: { userId, status: { in: OPEN_ACTION_STATUSES } },
    });
  }

  async expireStale(userId: string, now: Date): Promise<number> {
    const result = await prisma.pendingAction.updateMany({
      where: { userId, status: { in: OPEN_ACTION_STATUSES }, expiresAt: { lte: now } },
      data: { status: 'expired', resolvedAt: now },
    });
    const cutoff = new Date(now.getTime() - CONFIRMING_STALE_MS);
    const stuck = await prisma.pendingAction.updateMany({
      where: {
        userId,
        status: 'confirming',
        OR: [{ resolvedAt: { lte: cutoff } }, { resolvedAt: null }],
      },
      data: { status: 'failed', resolvedAt: now },
    });
    return result.count + stuck.count;
  }
}
