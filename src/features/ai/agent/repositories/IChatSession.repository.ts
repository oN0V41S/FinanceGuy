import type { JsonValue } from './IPendingAction.repository';

export type ChatMessageRole = 'user' | 'assistant';
export type ChatMessageKind = 'text' | 'actions' | 'pick' | 'compacted';

export interface ChatSessionRecord {
  id: string;
  userId: string;
  summary: string | null;
  tokenCount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  userId: string;
  role: string;
  kind: string;
  content: string;
  payload: unknown | null;
  tokens: number | null;
  compacted: boolean;
  createdAt: Date;
}

export interface NewChatMessage {
  sessionId: string;
  userId: string;
  role: ChatMessageRole;
  kind?: ChatMessageKind;
  content: string;
  payload?: JsonValue | null;
  tokens?: number | null;
}

export interface IChatSessionRepository {
  getActive(userId: string): Promise<ChatSessionRecord | null>;
  create(userId: string): Promise<ChatSessionRecord>;
  /** Arquiva as sessões ativas do usuário. */
  archive(userId: string): Promise<void>;
  addMessage(message: NewChatMessage): Promise<ChatMessageRecord>;
  listMessages(sessionId: string, userId: string): Promise<ChatMessageRecord[]>;
  updateTokenCount(sessionId: string, userId: string, increment: number): Promise<void>;
  markCompacted(sessionId: string, userId: string, messageIds: string[]): Promise<void>;
  setSummary(
    sessionId: string,
    userId: string,
    summary: string,
    tokenCount: number,
  ): Promise<void>;
}
