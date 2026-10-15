import { prisma } from '@/lib/prisma';
import type { IAuditLogRepository, NewAuditLog } from './IAuditLog.repository';
import { toNullableJson } from './prismaJson';

export class PostgresAuditLogRepository implements IAuditLogRepository {
  async create(entry: NewAuditLog): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        entity: entry.entity,
        op: entry.op,
        entityId: entry.entityId,
        before: toNullableJson(entry.before),
        after: toNullableJson(entry.after),
        source: entry.source ?? 'ai-agent',
      },
    });
  }
}
