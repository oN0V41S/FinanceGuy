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

/** Tool exposta ao LLM (FING-18). `parameters` é um JSON Schema (gerado via z.toJSONSchema). */
export interface LlmToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LlmToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** `any` força uma tool call dentre `allowedNames`; `none` desliga tools. */
export interface LlmToolChoice {
  mode: 'any' | 'none';
  allowedNames?: string[];
}

export interface LlmRequest {
  system: string;
  /** Lista de mensagens: o MVP envia uma só; FING-18 enviará o histórico da sessão. */
  messages: LlmMessage[];
  tools?: LlmToolDeclaration[];
  toolChoice?: LlmToolChoice;
  /** Modelo preferido nesta chamada (ex.: o menor, para tarefas triviais); depois vem a cadeia configurada. */
  model?: string;
  /** Teto de saída desta chamada; padrão: o configurado. */
  maxOutputTokens?: number;
}

export type LlmStopReason = 'stop' | 'max_tokens';

export interface LlmResponse {
  text: string;
  stopReason: LlmStopReason;
  usage?: { inputTokens?: number; outputTokens?: number };
  /** Single-turn: a tool call é o resultado final; nunca devolvemos functionResponse ao modelo. */
  toolCalls?: LlmToolCall[];
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
  /** Presente quando a pergunta recorta dias (ex.: "16 a 31 de dezembro"): todas as transações do recorte. */
  focus?: {
    startDate: string;
    endDate: string;
    income: MoneySplit;
    expense: MoneySplit;
    transactions: Array<{
      date: string;
      type: 'income' | 'expense';
      category: string;
      value: number;
      paid: boolean;
      title: string;
    }>;
  };
  /** Detalhe dos meses anteriores da janela (ascendente, sem o mês atual): permite responder sobre qualquer mês. */
  previousMonths: Array<{
    month: string; // YYYY-MM
    income: MoneySplit;
    expense: MoneySplit;
    balance: { realized: number; projected: number };
    byCategory: Array<{ category: string; type: 'income' | 'expense'; total: number }>;
    topTransactions: Array<{
      date: string;
      type: 'income' | 'expense';
      category: string;
      value: number;
      paid: boolean;
      title: string;
    }>;
  }>;
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
  /** FING-18 (opcionais; clientes antigos ignoram). */
  kind?: AskKind;
  sessionId?: string;
  queueId?: string;
  actions?: ActionCardDto[];
  nextSteps?: NextStepsDto;
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

interface ChatMessageBase {
  id: string;
  role: 'user' | 'assistant';
  /** Sempre presente (texto ou resumo acessível do conteúdo estruturado). */
  content: string;
}

export interface TextChatMessage extends ChatMessageBase {
  kind?: 'text';
  /** Apenas em respostas do assistente cortadas por limite de tokens. */
  truncated?: boolean;
}

export interface ActionCardsChatMessage extends ChatMessageBase {
  kind: 'action_cards';
  queueId: string;
  actions: ActionCardDto[];
  nextSteps: NextStepsDto;
}

export interface CompactedChatMessage extends ChatMessageBase {
  kind: 'compacted';
}

export type ChatMessage = TextChatMessage | ActionCardsChatMessage | CompactedChatMessage;

export interface UseAssistantResult {
  status: AssistantStatus;
  /** Histórico da conversa (apenas na sessão da página; a API do MVP recebe só a pergunta atual). */
  messages: ChatMessage[];
  error: string | null;
  ask: (question: string) => Promise<void>;
  reset: () => void;
  /** FING-18: hidrata a sessão ativa (GET /api/ai/session). */
  hydrate: () => Promise<void>;
  /** FING-18: arquiva a conversa ativa e inicia outra (POST /api/ai/session). */
  newConversation: () => Promise<void>;
  /** Troca para outra conversa da barra lateral. */
  openConversation: (id: string) => Promise<void>;
  /** Id da conversa ativa (null até hidratar). */
  sessionId: string | null;
  isHydrating: boolean;
  isStartingNew: boolean;
  /** API de ações dos cards (confirmar, editar, escolher, cancelar). */
  actions: import('@/features/ai/hooks/useAssistantActions').UseAssistantActionsResult;
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

// ── FING-18: agente de escrita (contratos congelados) ──

export type AgentEntity = 'transaction' | 'investment' | 'category';
export type AgentOp = 'create' | 'update' | 'delete';
export type ActionStatus =
  | 'needs_input'
  | 'ready'
  | 'awaiting_pick'
  | 'confirming'
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'expired';
export type AskKind = 'answer' | 'clarify' | 'actions' | 'not_found' | 'refused';

export interface ActionFieldDto {
  key: string;
  label: string;
  value: unknown;
  display: string;
  editable: boolean;
  missing: boolean;
  error?: string;
}

export interface MissingFieldDto {
  key: string;
  label: string;
  example: string;
}

export interface ActionCardDto {
  id: string;
  queueId: string;
  position: number;
  entity: AgentEntity;
  op: AgentOp;
  status: ActionStatus;
  destructive: boolean;
  fields: ActionFieldDto[];
  before?: ActionFieldDto[];
  missingFields: MissingFieldDto[];
  candidates?: Array<{ index: number; label: string }>;
  expiresAt: string;
  message?: string;
}

export interface NextStepsDto {
  total: number;
  done: number;
  failed: number;
  cancelled: number;
  next?: string;
  canConfirmAll: boolean;
}

export interface ConfirmActionsRequest {
  ids: string[];
}

export interface ConfirmItemResult {
  id: string;
  status: ActionStatus;
  message?: string;
  card: ActionCardDto;
}

export interface ConfirmActionsResponse {
  results: ConfirmItemResult[];
  nextSteps: NextStepsDto;
}

export interface UpdateActionRequest {
  fields: Record<string, unknown>;
}

export interface SelectCandidateRequest {
  index: number;
}

export interface CancelQueueRequest {
  queueId: string;
}

export interface SessionDto {
  sessionId: string;
  title?: string | null;
  messages: ChatMessage[];
  tokenCount: number;
}

/** Item da barra lateral de conversas. */
export interface SessionSummaryDto {
  id: string;
  title: string | null;
  active: boolean;
  updatedAt: string;
}

export interface AgentConfig {
  compactTokens: number;
  actionTtlMinutes: number;
  contextCacheTtlSeconds: number;
  sessionKeepMessages: number;
  maxQueue: number;
  maxPending: number;
}
