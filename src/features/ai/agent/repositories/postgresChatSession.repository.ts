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
