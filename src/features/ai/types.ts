/**
 * Contrato do módulo de IA (FING-7).
 * Congelado na Fase 0: backend, frontend e docs implementam contra estes tipos.
 */

// ── Provider LLM (seam para trocar de provedor e para o chatbot do FING-18) ──

export type LlmRole = 'user' | 'assistant';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmRequest {
  system: string;
  /** Lista de mensagens: o MVP envia uma só; FING-18 enviará o histórico da sessão. */
  messages: LlmMessage[];
}

export type LlmStopReason = 'stop' | 'max_tokens';

export interface LlmResponse {
  text: string;
  stopReason: LlmStopReason;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface ILlmProvider {
  complete(request: LlmRequest): Promise<LlmResponse>;
}

// ── Contexto financeiro (seam para RAG do FING-16) ──

export interface MoneySplit {
  paid: number;
  pending: number;
  total: number;
}

export interface FinancialContextDto {
  today: string; // YYYY-MM-DD (America/Sao_Paulo)
  currency: 'BRL';
  currentMonth: {
    month: string; // YYYY-MM
    income: MoneySplit;
    expense: MoneySplit;
    balance: { realized: number; projected: number };
    byCategory: Array<{ category: string; type: 'income' | 'expense'; total: number }>;
  };
  last6Months: Array<{ month: string; income: number; expense: number; balance: number }>;
  /** Whitelist: sem description, responsible, ids, userId, e-mail. */
  recentTransactions: Array<{
    date: string;
    type: 'income' | 'expense';
    category: string;
    value: number;
    paid: boolean;
    title: string;
  }>;
  goals: Array<{
    name: string;
    target: number;
    current: number;
    progressPct: number;
    deadline: string | null;
  }>;
  investments: Array<{
    name: string;
    type: string;
    value: number;
    ticker: string | null;
    status: string;
  }>;
  omitted: { transactions: number; goals: number; investments: number };
}

/** Fonte de contexto plugável: hoje, o DTO financeiro; no FING-16, recuperação vetorial. */
export interface FinancialContextSource {
  getContext(userId: string, question: string): Promise<FinancialContextDto>;
}

// ── Serviço / API ──

export interface AskResult {
  answer: string;
  truncated: boolean;
}

export type AskResponseBody = AskResult;

export interface AskErrorBody {
  error: string;
}

export type RateLimitScope = 'minute' | 'day';

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; scope: RateLimitScope; retryAfterSeconds: number };

export interface IRateLimiter {
  consume(userId: string, now?: Date): Promise<RateLimitResult>;
}

// ── Frontend ──

export type AssistantStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Apenas em respostas do assistente cortadas por limite de tokens. */
  truncated?: boolean;
}

export interface UseAssistantResult {
  status: AssistantStatus;
  /** Histórico da conversa (apenas na sessão da página; a API do MVP recebe só a pergunta atual). */
  messages: ChatMessage[];
  error: string | null;
  ask: (question: string) => Promise<void>;
  reset: () => void;
}

// ── Configuração (nomes de env congelados) ──

export interface AiConfig {
  apiKey: string | null;
  model: string;
  /** Modelos tentados em ordem se o principal falhar por indisponibilidade. */
  fallbackModels?: string[];
  timeoutMs: number;
  maxOutputTokens: number;
  rateLimitPerMinute: number;
  rateLimitWindowSeconds: number;
  rateLimitPerDay: number;
}
