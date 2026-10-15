import { randomUUID } from 'node:crypto';
import { AiRateLimitedError } from '../errors';
import type { ISessionService, PendingDraft } from '../session/ISession.service';
import type {
  ActionCardDto,
  ActionCardsChatMessage,
  AgentConfig,
  AgentEntity,
  AgentOp,
  AskResult,
  FinancialContextDto,
  FinancialContextSource,
  ILlmProvider,
  IRateLimiter,
  MissingFieldDto,
  NextStepsDto,
  TextChatMessage,
} from '../types';
import { computeNextSteps, summarizeCards, toCard } from './cards';
import type {
  AdapterRegistry,
  EntityAdapter,
  Evaluation,
  FieldMap,
  TargetCandidate,
} from './entityAdapters/types';
import { logSafe } from '../logging';
import { todayBRT } from './extract';
import { classifyIntent, type IntentSegment } from './intent';
import type { ICategorySuggester } from './categorySuggester';
import {
  buildAgentSystemPrompt,
  buildAgentUserMessage,
  buildCreateSystemPrompt,
  buildCreateUserMessage,
} from './prompts';
import type {
  IPendingActionRepository,
  JsonValue,
  NewPendingAction,
  PendingActionStatus,
} from './repositories/IPendingAction.repository';
import { sanitizeText } from './text';
import { deriveChanges, deriveHints, splitSegment, TargetResolver } from './targetResolver';
import { buildToolDeclarations, toolName } from './tools';

export interface AgentServiceDeps {
  adapters: AdapterRegistry;
  pending: IPendingActionRepository;
  sessions: ISessionService;
  llm: ILlmProvider;
  rateLimiter: IRateLimiter;
  /** Escolhe a categoria quando o usuário não informa (palavra-chave ou modelo pequeno). */
  categorySuggester?: ICategorySuggester;
  /** Contexto financeiro (já decorado com cache pelo container). */
  context: FinancialContextSource;
  config: Pick<AgentConfig, 'actionTtlMinutes' | 'maxQueue' | 'maxPending'>;
  /** Responsável padrão (apelido ou nome do usuário). Falhas viram "sem padrão". */
  defaultResponsible?: (userId: string) => Promise<string | undefined>;
  now?: () => Date;
  newId?: () => string;
}

export const MESSAGES = {
  notFound:
    'Não encontrei uma transação que corresponda ao que você descreveu. Tente incluir o título, o valor ou a data.',
  unsupportedEntity:
    'Por enquanto só consigo criar, alterar e remover transações. Investimentos e categorias chegam em breve.',
  tooManyQueue: (max: number) => `Consigo cuidar de até ${max} ações por vez. Pode me enviar em partes menores?`,
  tooManyPending:
    'Você já tem várias ações aguardando. Confirme ou cancele algumas antes de pedir novas.',
  llmDegraded:
    'Não consegui interpretar tudo automaticamente. Complete os campos destacados e confirme.',
  llmFailed:
    'Não consegui interpretar o pedido agora. Pode reenviar com o tipo (despesa ou receita), o valor e a categoria?',
} as const;

/** Mínimo de palavras (com letras) para valer a chamada ao LLM na alteração. */
const MIN_WORDS_UPDATE_LLM = 3;

/** Resposta do usuário a uma pergunta de dados faltantes não passa disso. */
const MAX_DRAFT_REPLY_CHARS = 300;

function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function letterWords(text: string): number {
  return sanitizeText(text)
    .split(' ')
    .filter((w) => /\p{L}/u.test(w)).length;
}

interface BuildInput {
  userId: string;
  sessionId: string;
  queueId: string;
  position: number;
  expiresAt: Date;
  segment: IntentSegment;
  adapter: EntityAdapter;
  now: Date;
}

interface CreatesInput {
  userId: string;
  sessionId: string;
  queueId: string;
  expiresAt: Date;
  adapter: EntityAdapter;
  now: Date;
  text: string;
  draft?: PendingDraft;
}

type CreatesResult =
  | { kind: 'items'; items: NewPendingAction[] }
  | { kind: 'ask'; answer: string; draft?: PendingDraft };

interface BuiltItem {
  item: NewPendingAction;
}

interface LlmFields {
  fields: FieldMap | null;
}

export class AgentService {
  private readonly now: () => Date;
  private readonly newId: () => string;
  private readonly resolver: TargetResolver;

  constructor(private readonly deps: AgentServiceDeps) {
    this.now = deps.now ?? (() => new Date());
    this.newId = deps.newId ?? randomUUID;
    this.resolver = new TargetResolver(deps.adapters);
  }

  /**
   * Interpreta a mensagem como pedido de escrita. Retorna `null` para perguntas (fluxo de leitura FING-7).
   * Só consome cota quando precisa chamar o LLM; pedidos completos ou esclarecimentos custam 0 token.
   */
  async propose(userId: string, question: string, sessionId?: string): Promise<AskResult | null> {
    if (!userId) throw new Error('Usuário não identificado');

    const intent = classifyIntent(question);
    if (intent.kind === 'read') return this.continueDraft(userId, question, sessionId);

    const sid = sessionId ?? (await this.deps.sessions.getOrCreateActive(userId)).sessionId;

    if (intent.kind === 'clarify') {
      return this.textReply(userId, sid, question, 'clarify', intent.message);
    }
    return this.proposeWrite(userId, sid, question, intent.segments);
  }

  /** Registra um turno de leitura (pergunta + resposta) na sessão. Nunca lança. Devolve o sessionId usado. */
  async recordTurn(
    userId: string,
    sessionId: string | undefined,
    question: string,
    result: Pick<AskResult, 'answer' | 'truncated'>,
  ): Promise<string | undefined> {
    try {
      const sid = sessionId ?? (await this.deps.sessions.getOrCreateActive(userId)).sessionId;
      await this.deps.sessions.appendMessage(userId, sid, { role: 'user', kind: 'text', content: question });
      const assistant: Omit<TextChatMessage, 'id'> & { payload?: unknown } = {
        role: 'assistant',
        kind: 'text',
        content: result.answer,
        truncated: result.truncated,
        payload: result.truncated ? { truncated: true } : undefined,
      };
      await this.deps.sessions.appendMessage(userId, sid, assistant);
      await this.deps.sessions.maybeCompact(userId, sid);
      return sid;
    } catch (error) {
      logSafe('ai.agent', 'Falha ao registrar a conversa', error);
      return sessionId;
    }
  }

  // ── Escrita ──

  private async proposeWrite(
    userId: string,
    sessionId: string,
    question: string,
    segments: IntentSegment[],
    draft?: PendingDraft,
  ): Promise<AskResult> {
    const { adapters, pending, config } = this.deps;

    if (segments.some((s) => !adapters[s.entity])) {
      return this.textReply(userId, sessionId, question, 'refused', MESSAGES.unsupportedEntity);
    }
    if (segments.length > config.maxQueue) {
      return this.textReply(userId, sessionId, question, 'clarify', MESSAGES.tooManyQueue(config.maxQueue));
    }

    const now = this.now();
    await pending.expireStale(userId, now);
    const open = await pending.countOpen(userId);
    if (open + segments.length > config.maxPending) {
      return this.textReply(userId, sessionId, question, 'clarify', MESSAGES.tooManyPending);
    }

    const queueId = this.newId();
    const expiresAt = new Date(now.getTime() + config.actionTtlMinutes * 60_000);
    const items: NewPendingAction[] = [];
    const notes: string[] = [];
    let createsDone = false;

    for (const segment of segments) {
      const adapter = adapters[segment.entity] as EntityAdapter;
      if (segment.op === 'create') {
        // Todas as criações vão numa só chamada: o LLM decide quantos cards o pedido gera.
        if (createsDone) continue;
        createsDone = true;
        const text = segments.every((s) => s.op === 'create')
          ? question
          : segments.filter((s) => s.op === 'create').map((s) => s.text).join('\n');
        const built = await this.buildCreates({ userId, queueId, sessionId, expiresAt, adapter, now, text, draft });
        if (built.kind === 'ask') {
          return this.textReply(
            userId,
            sessionId,
            question,
            'clarify',
            built.answer,
            built.draft && { draft: built.draft },
          );
        }
        items.push(...built.items);
        continue;
      }
      const built = await this.buildChange({
        userId,
        sessionId,
        queueId,
        position: items.length + 1,
        expiresAt,
        segment,
        adapter,
        now,
      });
      if (built === 'not_found') notes.push(MESSAGES.notFound);
      else items.push(built.item);
    }

    if (items.length === 0) {
      return this.textReply(userId, sessionId, question, 'not_found', notes.join('\n'));
    }
    if (items.length > config.maxQueue) {
      return this.textReply(userId, sessionId, question, 'clarify', MESSAGES.tooManyQueue(config.maxQueue));
    }
    if ((await pending.countOpen(userId)) + items.length > config.maxPending) {
      return this.textReply(userId, sessionId, question, 'clarify', MESSAGES.tooManyPending);
    }
    items.forEach((item, index) => {
      item.position = index + 1;
    });

    await pending.createMany(items);
    const records = await pending.listByQueue(queueId, userId);
    const cards = records.map((record) => toCard(record, { adapters, now }));
    const nextSteps = computeNextSteps(records, adapters, now);
    const answer = [summarizeCards(cards, adapters, records), ...notes].join('\n');

    await this.persistCards(userId, sessionId, question, answer, queueId, cards, nextSteps);

    return { kind: 'actions', answer, truncated: false, sessionId, queueId, actions: cards, nextSteps };
  }

  private baseOf(input: BuildInput) {
    const { segment } = input;
    return {
      userId: input.userId,
      sessionId: input.sessionId,
      queueId: input.queueId,
      position: input.position,
      entity: segment.entity,
      op: segment.op,
      expiresAt: input.expiresAt,
    };
  }

  /** Criações: o LLM interpreta o pedido; faltando dado obrigatório, nenhum card é gerado e o usuário é questionado. */
  private async buildCreates(input: CreatesInput): Promise<CreatesResult> {
    const { userId, adapter, now, text, draft } = input;
    const today = todayBRT(now);
    const defaultResponsible = await this.deps.defaultResponsible?.(userId).catch(() => undefined);

    const proposed = await this.askCreate(userId, text, draft?.items);
    if (!proposed) return { kind: 'ask', answer: MESSAGES.llmFailed };

    const evaluated: { raw: FieldMap; evaluation: Evaluation }[] = [];
    for (const original of proposed) {
      const evaluate = (fields: FieldMap): Evaluation =>
        adapter.evaluate('create', fields, { today, defaultResponsible, hasTarget: false });
      let raw = original;
      let evaluation = evaluate(raw);
      const category = raw.category;
      if ((typeof category !== 'string' || !category.trim()) && this.deps.categorySuggester) {
        const suggested = await this.deps.categorySuggester.suggest(userId, categoryText(raw, text));
        if (suggested) {
          raw = { ...raw, category: suggested };
          evaluation = evaluate(raw);
        }
      }
      evaluated.push({ raw, evaluation });
    }

    if (evaluated.some((e) => e.evaluation.missing.length > 0)) {
      return {
        kind: 'ask',
        answer: askForMissing(evaluated.map((e) => ({ fields: e.raw, missing: e.evaluation.missing }))),
        draft: { entity: 'transaction', op: 'create', items: evaluated.map((e) => toJson(e.raw) as FieldMap) },
      };
    }

    const base = {
      userId,
      sessionId: input.sessionId,
      queueId: input.queueId,
      entity: 'transaction' as const,
      op: 'create' as const,
      expiresAt: input.expiresAt,
    };
    return {
      kind: 'items',
      items: evaluated.map((e, index) => ({
        ...base,
        position: index + 1,
        payload: toJson({ fields: e.evaluation.fields }),
        status: (e.evaluation.valid ? 'ready' : 'needs_input') as PendingActionStatus,
      })),
    };
  }

  /** Pergunta de dados faltantes seguida de resposta curta (sem verbo): reaproveita o rascunho guardado. */
  private async continueDraft(userId: string, question: string, sessionId?: string): Promise<AskResult | null> {
    if (question.includes('?') || question.length > MAX_DRAFT_REPLY_CHARS || !question.trim()) return null;
    try {
      const sid = sessionId ?? (await this.deps.sessions.getOrCreateActive(userId)).sessionId;
      const draft = await this.deps.sessions.getPendingDraft(userId, sid);
      if (!draft) return null;
      return await this.proposeWrite(
        userId,
        sid,
        question,
        [{ op: 'create', entity: 'transaction', text: question }],
        draft,
      );
    } catch (error) {
      if (error instanceof AiRateLimitedError) throw error;
      logSafe('ai.agent', 'Falha ao retomar o rascunho', error);
      return null;
    }
  }

  /** Chamada ao LLM da criação. Consome cota; devolve um conjunto de campos por lançamento, ou null se falhar. */
  private async askCreate(userId: string, text: string, draft?: FieldMap[]): Promise<FieldMap[] | null> {
    const limit = await this.deps.rateLimiter.consume(userId);
    if (!limit.allowed) throw new AiRateLimitedError(limit.scope, limit.retryAfterSeconds);

    const name = toolName('transaction', 'create');
    const tools = buildToolDeclarations(this.deps.adapters).filter((t) => t.name === name);
    const adapter = this.deps.adapters.transaction;
    const now = this.now();
    try {
      const context: FinancialContextDto | null = await this.deps.context.getContext(userId, text).catch(() => null);
      const response = await this.deps.llm.complete({
        system: buildCreateSystemPrompt(),
        messages: [{ role: 'user', content: buildCreateUserMessage(context, text, todayBRT(now), draft) }],
        tools,
        toolChoice: { mode: 'any', allowedNames: [name] },
      });
      if (!adapter) return null;
      const items = (response.toolCalls ?? [])
        .filter((c) => c.name === name && typeof c.args === 'object' && c.args !== null)
        .map((c) => adapter.sanitize(c.args));
      return items.length > 0 ? items : null;
    } catch (error) {
      logSafe('ai.agent', 'LLM indisponível para a criação', error);
      return null;
    }
  }

  private async buildChange(input: BuildInput): Promise<BuiltItem | 'not_found'> {
    const { segment, adapter, now, userId } = input;
    const today = todayBRT(now);
    const base = this.baseOf(input);

    // update / delete: o servidor encontra o alvo (até 5 candidatas do próprio usuário).
    const parts = splitSegment(segment.text, segment.op);
    const hints = deriveHints(parts.targetText, now);
    const resolved = await this.resolver.resolve(userId, segment.entity, hints);
    if (resolved.kind === 'none') return 'not_found';

    let changes: FieldMap = segment.op === 'update' ? deriveChanges(parts, now) : {};
    if (segment.op === 'update') {
      let evaluation = adapter.evaluate('update', changes, { today, hasTarget: true });
      if (evaluation.missing.length > 0 && letterWords(segment.text) >= MIN_WORDS_UPDATE_LLM) {
        const llm = await this.askLlm(userId, segment.entity, 'update', segment.text);
        if (llm.fields) changes = { ...llm.fields, ...changes };
        evaluation = adapter.evaluate('update', changes, { today, hasTarget: true });
      }
      changes = evaluation.fields;
    }

    if (resolved.kind === 'many') {
      return {
        item: {
          ...base,
          payload: toJson({ fields: changes }),
          candidates: toJson(resolved.candidates.map(toStored)),
          status: 'awaiting_pick',
        },
      };
    }

    const evaluation = adapter.evaluate(segment.op, changes, { today, hasTarget: true });
    return {
      item: {
        ...base,
        payload: toJson({ fields: evaluation.fields }),
        targetId: resolved.candidate.id,
        before: toJson(resolved.candidate.record),
        status: evaluation.valid ? 'ready' : 'needs_input',
      },
    };
  }

  /** Única chamada ao LLM do fluxo de escrita. Consome cota; falhas degradam para `fields: null`. */
  private async askLlm(userId: string, entity: AgentEntity, op: AgentOp, text: string): Promise<LlmFields> {
    const limit = await this.deps.rateLimiter.consume(userId);
    if (!limit.allowed) throw new AiRateLimitedError(limit.scope, limit.retryAfterSeconds);

    const name = toolName(entity, op);
    const tools = buildToolDeclarations(this.deps.adapters).filter((t) => t.name === name);
    const now = this.now();
    try {
      const context: FinancialContextDto | null = await this.deps.context
        .getContext(userId, text)
        .catch(() => null);
      const response = await this.deps.llm.complete({
        system: buildAgentSystemPrompt(),
        messages: [{ role: 'user', content: buildAgentUserMessage(context, text, todayBRT(now)) }],
        tools,
        toolChoice: { mode: 'any', allowedNames: [name] },
      });
      const call = response.toolCalls?.find((c) => c.name === name);
      const adapter = this.deps.adapters[entity];
      if (!call || !adapter || typeof call.args !== 'object' || call.args === null) return { fields: null };
      return { fields: adapter.sanitize(call.args) };
    } catch (error) {
      logSafe('ai.agent', 'LLM indisponível para a ação; seguindo com os dados extraídos', error);
      return { fields: null };
    }
  }

  // ── Sessão ──

  private async textReply(
    userId: string,
    sessionId: string,
    question: string,
    kind: 'clarify' | 'refused' | 'not_found',
    answer: string,
    payload?: unknown,
  ): Promise<AskResult> {
    try {
      await this.deps.sessions.appendMessage(userId, sessionId, { role: 'user', kind: 'text', content: question });
      await this.deps.sessions.appendMessage(userId, sessionId, { role: 'assistant', kind: 'text', content: answer, payload });
    } catch (error) {
      logSafe('ai.agent', 'Falha ao registrar a conversa', error);
    }
    return { kind, answer, truncated: false, sessionId };
  }

  private async persistCards(
    userId: string,
    sessionId: string,
    question: string,
    answer: string,
    queueId: string,
    actions: ActionCardDto[],
    nextSteps: NextStepsDto,
  ): Promise<void> {
    try {
      await this.deps.sessions.appendMessage(userId, sessionId, { role: 'user', kind: 'text', content: question });
      const assistant: Omit<ActionCardsChatMessage, 'id'> & { payload?: unknown } = {
        role: 'assistant',
        kind: 'action_cards',
        content: answer,
        queueId,
        actions,
        nextSteps,
        payload: { queueId, actions, nextSteps },
      };
      await this.deps.sessions.appendMessage(userId, sessionId, assistant);
      await this.deps.sessions.maybeCompact(userId, sessionId);
    } catch (error) {
      logSafe('ai.agent', 'Falha ao registrar a conversa', error);
    }
  }
}

function toStored(candidate: TargetCandidate): { id: string; label: string; record: FieldMap } {
  return { id: candidate.id, label: candidate.label, record: candidate.record };
}

/** Texto curto para classificar: o título é o melhor sinal; sem ele, a própria frase. */
function categoryText(fields: FieldMap, fallback: string): string {
  return typeof fields.title === 'string' && fields.title.trim() ? fields.title : fallback;
}

interface MissingItem {
  fields: FieldMap;
  missing: MissingFieldDto[];
}

function titleOf(item: MissingItem): string {
  return typeof item.fields.title === 'string' && item.fields.title ? ` "${item.fields.title}"` : '';
}

function describeMissing(item: MissingItem): string {
  return item.missing.map((m) => (m.example ? `${m.label} (ex.: ${m.example})` : m.label)).join(', ');
}

function askForMissing(items: MissingItem[]): string {
  if (items.length === 1) {
    const [item] = items;
    return `Para criar o lançamento${titleOf(item)}, ainda preciso de: ${describeMissing(item)}. Pode me informar?`;
  }
  const lines = items.map(
    (item, i) => `${i + 1}. Lançamento${titleOf(item)}: ${item.missing.length > 0 ? describeMissing(item) : 'ok'}`,
  );
  return ['Antes de criar os lançamentos, preciso de mais dados:', ...lines, 'Pode me informar?'].join('\n');
}
