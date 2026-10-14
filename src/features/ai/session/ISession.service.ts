import type { ChatMessage, FinancialContextDto, LlmMessage, SessionDto, SessionSummaryDto } from '../types';

/** Contrato da sessão de chat (FING-18). Implementado por SessionService; consumido pelo agente. */
export interface ISessionService {
  /** Sessão ativa do usuário (cria se não existir). */
  getOrCreateActive(userId: string): Promise<{ sessionId: string }>;
  /** Arquiva a ativa e cria uma nova conversa. */
  startNew(userId: string): Promise<{ sessionId: string }>;
  /** Persiste uma mensagem (texto, cards de ação ou divisor) e soma tokens (estimativa chars/4 se `tokens` ausente). */
  appendMessage(
    userId: string,
    sessionId: string,
    message: Omit<ChatMessage, 'id'> & { tokens?: number; payload?: unknown },
  ): Promise<ChatMessage>;
  /** Histórico para o LLM: [resumo?] + últimas N mensagens não compactadas (texto). */
  getLlmHistory(userId: string, sessionId: string): Promise<LlmMessage[]>;
  /** Hidratação da UI após reload. */
  getSessionDto(userId: string, sessionId?: string): Promise<SessionDto>;
  /** Barra lateral: todas as conversas do usuário, mais recentes primeiro. */
  listSessions(userId: string): Promise<SessionSummaryDto[]>;
  /** Troca para outra conversa (ela vira a ativa). Retorna null se não for do usuário. */
  activateSession(userId: string, sessionId: string): Promise<SessionDto | null>;
  renameSession(userId: string, sessionId: string, title: string): Promise<boolean>;
  deleteSession(userId: string, sessionId: string): Promise<boolean>;
  /** Gera (Gemini, com fallback local) o título curto a partir da 1ª mensagem. Nunca lança. */
  ensureTitle(userId: string, sessionId: string): Promise<void>;
  getProfile(userId: string): Promise<string>;
  setProfile(userId: string, profile: string): Promise<void>;
  /** Compacta se tokenCount >= AI_COMPACT_TOKENS; nunca lança (falha não derruba a conversa). */
  maybeCompact(userId: string, sessionId: string): Promise<{ compacted: boolean }>;
}

/** Cache do contexto financeiro (`ai:ctx:{userId}`, TTL 60 s; Upstash ou memória). */
export interface IContextCache {
  get(userId: string): Promise<FinancialContextDto | null>;
  set(userId: string, dto: FinancialContextDto): Promise<void>;
  invalidate(userId: string): Promise<void>;
}
