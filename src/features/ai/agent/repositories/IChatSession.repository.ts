import type { JsonValue } from './IPendingAction.repository';

export type ChatMessageRole = 'user' | 'assistant';
export type ChatMessageKind = 'text' | 'actions' | 'pick' | 'compacted';

export interface ChatSessionRecord {
  id: string;
  userId: string;
  title: string | null;
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
  /** Força a posição na linha do tempo (ex.: divisor de compactação). Padrão: agora. */
  createdAt?: Date;
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
  /** Todas as conversas do usuário (ativa e arquivadas), mais recentes primeiro. */
  listSessions(userId: string): Promise<ChatSessionRecord[]>;
  getById(sessionId: string, userId: string): Promise<ChatSessionRecord | null>;
  /** Torna `sessionId` a única ativa. Retorna false se não for do usuário. */
  activate(sessionId: string, userId: string): Promise<boolean>;
  /** Define o título; com `onlyIfEmpty` não sobrescreve um título existente (renomeado pelo usuário). */
  setTitle(sessionId: string, userId: string, title: string, onlyIfEmpty?: boolean): Promise<boolean>;
  /** Exclui a conversa (mensagens e ações em cascata). Retorna false se não for do usuário. */
  remove(sessionId: string, userId: string): Promise<boolean>;
  getProfile(userId: string): Promise<string | null>;
  setProfile(userId: string, profile: string | null): Promise<void>;
  setSummary(
    sessionId: string,
    userId: string,
    summary: string,
    tokenCount: number,
  ): Promise<void>;
}
