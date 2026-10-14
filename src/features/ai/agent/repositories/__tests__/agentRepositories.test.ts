/**
 * @jest-environment node
 *
 * TDD — repositórios do agente de escrita (FING-18): PendingAction, ChatSession, AuditLog.
 * Toda query é escopada por userId.
 */
import { prisma } from '@/lib/prisma';
import { PostgresPendingActionRepository } from '../postgresPendingAction.repository';
import { PostgresChatSessionRepository } from '../postgresChatSession.repository';
import { PostgresAuditLogRepository } from '../postgresAuditLog.repository';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    pendingAction: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    chatSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

const db = prisma as unknown as Record<string, Record<string, jest.Mock>>;
const now = new Date('2026-10-14T12:00:00.000Z');

beforeEach(() => jest.clearAllMocks());

describe('PostgresPendingActionRepository', () => {
  const repo = new PostgresPendingActionRepository();

  it('createMany grava todas com userId', async () => {
    db.pendingAction.createMany.mockResolvedValue({ count: 1 });
    await repo.createMany([
      {
        userId: 'u1',
        sessionId: 's1',
        queueId: 'q1',
        position: 0,
        entity: 'transaction',
        op: 'create',
        payload: { value: 50 },
        status: 'ready',
        expiresAt: now,
      },
    ]);
    const arg = db.pendingAction.createMany.mock.calls[0][0];
    expect(arg.data[0].userId).toBe('u1');
  });

  it('getByIdForUser filtra por id e userId', async () => {
    db.pendingAction.findFirst.mockResolvedValue(null);
    expect(await repo.getByIdForUser('a1', 'u1')).toBeNull();
    expect(db.pendingAction.findFirst).toHaveBeenCalledWith({ where: { id: 'a1', userId: 'u1' } });
  });

  it('listByQueue filtra por queueId e userId ordenado por position', async () => {
    db.pendingAction.findMany.mockResolvedValue([]);
    await repo.listByQueue('q1', 'u1');
    expect(db.pendingAction.findMany).toHaveBeenCalledWith({
      where: { queueId: 'q1', userId: 'u1' },
      orderBy: { position: 'asc' },
    });
  });

  it('claimForConfirm usa updateMany atômico e retorna true quando count===1', async () => {
    db.pendingAction.updateMany.mockResolvedValue({ count: 1 });
    expect(await repo.claimForConfirm('a1', 'u1', now)).toBe(true);
    expect(db.pendingAction.updateMany).toHaveBeenCalledWith({
      where: { id: 'a1', userId: 'u1', status: 'ready', expiresAt: { gt: now } },
      data: { status: 'confirming', resolvedAt: now },
    });
  });

  it('claimForConfirm retorna false quando count===0', async () => {
    db.pendingAction.updateMany.mockResolvedValue({ count: 0 });
    expect(await repo.claimForConfirm('a1', 'u1', now)).toBe(false);
  });

  it('updatePayload escopa por userId e retorna boolean', async () => {
    db.pendingAction.updateMany.mockResolvedValue({ count: 1 });
    const ok = await repo.updatePayload('a1', 'u1', { payload: { value: 10 }, status: 'ready' });
    expect(ok).toBe(true);
    const where = db.pendingAction.updateMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: 'a1', userId: 'u1' });
    expect(where.status.in).toEqual(['needs_input', 'ready', 'awaiting_pick']);
    expect(db.pendingAction.updateMany.mock.calls[0][0].data).toEqual({
      payload: { value: 10 },
      status: 'ready',
    });
  });

  it('updatePayload retorna false quando a ação não está mais aberta (count===0)', async () => {
    db.pendingAction.updateMany.mockResolvedValue({ count: 0 });
    expect(await repo.updatePayload('a1', 'u1', { payload: { value: 1 } })).toBe(false);
  });

  it('updateStatus define resolvedAt em estados finais (confirmed só a partir de confirming)', async () => {
    db.pendingAction.updateMany.mockResolvedValue({ count: 1 });
    await repo.updateStatus('a1', 'u1', 'confirmed', now);
    expect(db.pendingAction.updateMany).toHaveBeenCalledWith({
      where: { id: 'a1', userId: 'u1', status: { in: ['confirming'] } },
      data: { status: 'confirmed', resolvedAt: now },
    });
  });

  it('updateStatus failed só a partir de confirming', async () => {
    db.pendingAction.updateMany.mockResolvedValue({ count: 1 });
    await repo.updateStatus('a1', 'u1', 'failed', now);
    expect(db.pendingAction.updateMany.mock.calls[0][0].where.status).toEqual({ in: ['confirming'] });
  });

  it.each(['cancelled', 'expired'] as const)('updateStatus %s nunca atua em confirming/confirmed', async (status) => {
    db.pendingAction.updateMany.mockResolvedValue({ count: 0 });
    expect(await repo.updateStatus('a1', 'u1', status, now)).toBe(false);
    const where = db.pendingAction.updateMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: 'a1', userId: 'u1' });
    expect(where.status.in).toEqual(['needs_input', 'ready', 'awaiting_pick']);
  });

  it('updateStatus não define resolvedAt em estado não final', async () => {
    db.pendingAction.updateMany.mockResolvedValue({ count: 1 });
    await repo.updateStatus('a1', 'u1', 'ready', now);
    expect(db.pendingAction.updateMany.mock.calls[0][0].data).toEqual({ status: 'ready' });
  });

  it('cancelQueue cancela apenas ações abertas do usuário', async () => {
    db.pendingAction.updateMany.mockResolvedValue({ count: 3 });
    expect(await repo.cancelQueue('q1', 'u1', now)).toBe(3);
    const arg = db.pendingAction.updateMany.mock.calls[0][0];
    expect(arg.where.queueId).toBe('q1');
    expect(arg.where.userId).toBe('u1');
    expect(arg.where.status.in).toEqual(
      expect.arrayContaining(['needs_input', 'ready', 'awaiting_pick']),
    );
    expect(arg.data).toEqual({ status: 'cancelled', resolvedAt: now });
  });

  it('countOpen conta abertas do usuário', async () => {
    db.pendingAction.count.mockResolvedValue(4);
    expect(await repo.countOpen('u1')).toBe(4);
    expect(db.pendingAction.count.mock.calls[0][0].where.userId).toBe('u1');
  });

  it('expireStale expira abertas vencidas do usuário', async () => {
    db.pendingAction.updateMany.mockResolvedValue({ count: 2 });
    await repo.expireStale('u1', now);
    const arg = db.pendingAction.updateMany.mock.calls[0][0];
    expect(arg.where.userId).toBe('u1');
    expect(arg.where.expiresAt).toEqual({ lte: now });
    expect(arg.data).toEqual({ status: 'expired', resolvedAt: now });
  });

  it('expireStale devolve confirming preso (claim > 2 min) para failed e soma as contagens', async () => {
    db.pendingAction.updateMany.mockResolvedValueOnce({ count: 2 }).mockResolvedValueOnce({ count: 1 });
    expect(await repo.expireStale('u1', now)).toBe(3);
    const arg = db.pendingAction.updateMany.mock.calls[1][0];
    const cutoff = new Date(now.getTime() - 2 * 60_000);
    expect(arg.where).toMatchObject({ userId: 'u1', status: 'confirming' });
    expect(arg.where.OR).toEqual([{ resolvedAt: { lte: cutoff } }, { resolvedAt: null }]);
    expect(arg.data).toEqual({ status: 'failed', resolvedAt: now });
  });
});

describe('PostgresChatSessionRepository', () => {
  const repo = new PostgresChatSessionRepository();

  it('getActive busca sessão active do usuário', async () => {
    db.chatSession.findFirst.mockResolvedValue(null);
    await repo.getActive('u1');
    expect(db.chatSession.findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1', status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('create cria sessão com userId', async () => {
    db.chatSession.create.mockResolvedValue({ id: 's1' });
    await repo.create('u1');
    expect(db.chatSession.create).toHaveBeenCalledWith({ data: { userId: 'u1' } });
  });

  it('archive arquiva sessões ativas do usuário', async () => {
    db.chatSession.updateMany.mockResolvedValue({ count: 1 });
    await repo.archive('u1');
    expect(db.chatSession.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', status: 'active' },
      data: { status: 'archived' },
    });
  });

  it('addMessage grava com userId e sessionId', async () => {
    db.chatMessage.create.mockResolvedValue({ id: 'm1' });
    await repo.addMessage({
      sessionId: 's1',
      userId: 'u1',
      role: 'user',
      kind: 'text',
      content: 'oi',
    });
    expect(db.chatMessage.create.mock.calls[0][0].data).toMatchObject({
      sessionId: 's1',
      userId: 'u1',
      content: 'oi',
    });
  });

  it('listMessages escopa por sessão e usuário, ordem cronológica', async () => {
    db.chatMessage.findMany.mockResolvedValue([]);
    await repo.listMessages('s1', 'u1');
    expect(db.chatMessage.findMany).toHaveBeenCalledWith({
      where: { sessionId: 's1', userId: 'u1' },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('updateTokenCount incrementa escopado por usuário', async () => {
    db.chatSession.updateMany.mockResolvedValue({ count: 1 });
    await repo.updateTokenCount('s1', 'u1', 120);
    expect(db.chatSession.updateMany).toHaveBeenCalledWith({
      where: { id: 's1', userId: 'u1' },
      data: { tokenCount: { increment: 120 } },
    });
  });

  it('markCompacted marca mensagens do usuário', async () => {
    db.chatMessage.updateMany.mockResolvedValue({ count: 2 });
    await repo.markCompacted('s1', 'u1', ['m1', 'm2']);
    expect(db.chatMessage.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['m1', 'm2'] }, sessionId: 's1', userId: 'u1' },
      data: { compacted: true },
    });
  });

  it('markCompacted com lista vazia não consulta o banco', async () => {
    await repo.markCompacted('s1', 'u1', []);
    expect(db.chatMessage.updateMany).not.toHaveBeenCalled();
  });

  it('setSummary grava resumo e zera/ajusta tokenCount', async () => {
    db.chatSession.updateMany.mockResolvedValue({ count: 1 });
    await repo.setSummary('s1', 'u1', 'resumo', 500);
    expect(db.chatSession.updateMany).toHaveBeenCalledWith({
      where: { id: 's1', userId: 'u1' },
      data: { summary: 'resumo', tokenCount: 500 },
    });
  });
});

describe('PostgresAuditLogRepository', () => {
  it('create grava com userId e source padrão', async () => {
    db.auditLog.create.mockResolvedValue({ id: 'l1' });
    await new PostgresAuditLogRepository().create({
      userId: 'u1',
      entity: 'transaction',
      op: 'create',
      entityId: 't1',
      before: null,
      after: { value: 50 },
    });
    const data = db.auditLog.create.mock.calls[0][0].data;
    expect(data.userId).toBe('u1');
    expect(data.source).toBe('ai-agent');
    expect(data.after).toEqual({ value: 50 });
  });
});
