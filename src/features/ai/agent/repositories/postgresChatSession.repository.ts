import { prisma } from '@/lib/prisma';
import type {
  ChatMessageRecord,
  ChatSessionRecord,
  IChatSessionRepository,
  NewChatMessage,
} from './IChatSession.repository';
import { toNullableJson } from './prismaJson';

export class PostgresChatSessionRepository implements IChatSessionRepository {
  async getActive(userId: string): Promise<ChatSessionRecord | null> {
    return prisma.chatSession.findFirst({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string): Promise<ChatSessionRecord> {
    return prisma.chatSession.create({ data: { userId } });
  }

  async archive(userId: string): Promise<void> {
    await prisma.chatSession.updateMany({
      where: { userId, status: 'active' },
      data: { status: 'archived' },
    });
  }

  async addMessage(message: NewChatMessage): Promise<ChatMessageRecord> {
    return prisma.chatMessage.create({
      data: {
        sessionId: message.sessionId,
        userId: message.userId,
        role: message.role,
        kind: message.kind ?? 'text',
        content: message.content,
        payload: toNullableJson(message.payload),
        tokens: message.tokens ?? null,
        ...(message.createdAt ? { createdAt: message.createdAt } : {}),
      },
    });
  }

  async listMessages(sessionId: string, userId: string): Promise<ChatMessageRecord[]> {
    return prisma.chatMessage.findMany({
      where: { sessionId, userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateTokenCount(sessionId: string, userId: string, increment: number): Promise<void> {
    await prisma.chatSession.updateMany({
      where: { id: sessionId, userId },
      data: { tokenCount: { increment } },
    });
  }

  async markCompacted(sessionId: string, userId: string, messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;
    await prisma.chatMessage.updateMany({
      where: { id: { in: messageIds }, sessionId, userId },
      data: { compacted: true },
    });
  }

  async listSessions(userId: string): Promise<ChatSessionRecord[]> {
    return prisma.chatSession.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 100 });
  }

  async getById(sessionId: string, userId: string): Promise<ChatSessionRecord | null> {
    return prisma.chatSession.findFirst({ where: { id: sessionId, userId } });
  }

  async activate(sessionId: string, userId: string): Promise<boolean> {
    const target = await prisma.chatSession.findFirst({ where: { id: sessionId, userId }, select: { id: true } });
    if (!target) return false;
    await prisma.$transaction([
      prisma.chatSession.updateMany({ where: { userId, status: 'active', NOT: { id: sessionId } }, data: { status: 'archived' } }),
      prisma.chatSession.updateMany({ where: { id: sessionId, userId }, data: { status: 'active' } }),
    ]);
    return true;
  }

  async setTitle(sessionId: string, userId: string, title: string, onlyIfEmpty = false): Promise<boolean> {
    const result = await prisma.chatSession.updateMany({
      where: { id: sessionId, userId, ...(onlyIfEmpty ? { title: null } : {}) },
      data: { title },
    });
    return result.count > 0;
  }

  async remove(sessionId: string, userId: string): Promise<boolean> {
    const result = await prisma.chatSession.deleteMany({ where: { id: sessionId, userId } });
    return result.count > 0;
  }

  async getProfile(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { aiProfile: true } });
    return user?.aiProfile ?? null;
  }

  async setProfile(userId: string, profile: string | null): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { aiProfile: profile } });
  }

  async setSummary(
    sessionId: string,
    userId: string,
    summary: string,
    tokenCount: number,
  ): Promise<void> {
    await prisma.chatSession.updateMany({
      where: { id: sessionId, userId },
      data: { summary, tokenCount },
    });
  }
}
