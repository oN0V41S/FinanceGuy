import { randomUUID } from 'node:crypto';
import { AiRateLimitedError } from '../errors';
import type { ISessionService } from '../session/ISession.service';
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
  NextStepsDto,
  TextChatMessage,
} from '../types';
import { computeNextSteps, summarizeCards, toCard } from './cards';
import type { AdapterRegistry, EntityAdapter, FieldMap, TargetCandidate } from './entityAdapters/types';
import { extractTransactionFields, todayBRT } from './extract';
import { classifyIntent, type IntentSegment } from './intent';
import { buildAgentSystemPrompt, buildAgentUserMessage } from './prompts';
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
} as const;

const LLM_RELEVANT_MISSING = new Set(['type', 'category', 'value']);

function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function letterWords(text: string): number {
  return sanitizeText(text)
    .split(' ')
    .filter((w) => /\p{L}/u.test(w)).length;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

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
    if (intent.kind === 'read') return null;

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
      console.error('[ai.agent] Falha ao registrar a conversa', { name: errorName(error) });
      return sessionId;
    }
  }

  // ── Escrita ──

  private async proposeWrite(
    userId: string,
    sessionId: string,
    question: string,
    segments: IntentSegment[],
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
    let defaultResponsible: string | undefined;
    let responsibleLoaded = false;

    for (const segment of segments) {
      const adapter = adapters[segment.entity] as EntityAdapter;
      if (segment.op === 'create' && !responsibleLoaded) {
        responsibleLoaded = true;
        defaultResponsible = await this.deps.defaultResponsible?.(userId).catch(() => undefined);
      }
      const built = await this.buildItem({
        userId,
        sessionId,
        queueId,
        position: items.length + 1,
        expiresAt,
        segment,
        adapter,
        now,
        defaultResponsible,
      });
      if (built === 'not_found') notes.push(MESSAGES.notFound);
      else items.push(built.item);
    }

    if (items.length === 0) {
      return this.textReply(userId, sessionId, question, 'not_found', notes.join('\n'));
    }

    await pending.createMany(items);
    const records = await pending.listByQueue(queueId, userId);
    const cards = records.map((record) => toCard(record, { adapters, now }));
    const nextSteps = computeNextSteps(records, adapters, now);
    const answer = [summarizeCards(cards, adapters, records), ...notes].join('\n');

    await this.persistCards(userId, sessionId, question, answer, queueId, cards, nextSteps);

    return { kind: 'actions', answer, truncated: false, sessionId, queueId, actions: cards, nextSteps };
  }

  private async buildItem(input: {
    userId: string;
    sessionId: string;
    queueId: string;
    position: number;
    expiresAt: Date;
    segment: IntentSegment;
    adapter: EntityAdapter;
    now: Date;
    defaultResponsible?: string;
  }): Promise<BuiltItem | 'not_found'> {
    const { segment, adapter, now, userId } = input;
    const today = todayBRT(now);
    const base = {
      userId,
      sessionId: input.sessionId,
      queueId: input.queueId,
      position: input.position,
      entity: segment.entity,
      op: segment.op,
      expiresAt: input.expiresAt,
    };

    if (segment.op === 'create') {
      const extracted = extractTransactionFields(segment.text, now) as FieldMap;
      let evaluation = adapter.evaluate('create', extracted, {
        today,
        defaultResponsible: input.defaultResponsible,
        hasTarget: false,
      });
      if (!evaluation.valid && evaluation.missing.some((m) => LLM_RELEVANT_MISSING.has(m.key)) && letterWords(segment.text) >= 2) {
        const llm = await this.askLlm(userId, segment.entity, 'create', segment.text);
        if (llm.fields) {
          const merged = mergeCreate(extracted, llm.fields);
          evaluation = adapter.evaluate('create', merged, {
            today,
            defaultResponsible: input.defaultResponsible,
            hasTarget: false,
          });
        }
      }
      const status: PendingActionStatus = evaluation.valid ? 'ready' : 'needs_input';
      return { item: { ...base, payload: toJson({ fields: evaluation.fields }), status } };
    }

    // update / delete: o servidor encontra o alvo (até 5 candidatas do próprio usuário).
    const parts = splitSegment(segment.text, segment.op);
    const hints = deriveHints(parts.targetText, now);
    const resolved = await this.resolver.resolve(userId, segment.entity, hints);
    if (resolved.kind === 'none') return 'not_found';

    let changes: FieldMap = segment.op === 'update' ? deriveChanges(parts, now) : {};
    if (segment.op === 'update') {
      let evaluation = adapter.evaluate('update', changes, { today, hasTarget: true });
      if (evaluation.missing.length > 0 && letterWords(segment.text) >= 3) {
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
      console.error('[ai.agent] LLM indisponível para a ação; seguindo com os dados extraídos', {
        name: errorName(error),
      });
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
  ): Promise<AskResult> {
    try {
      await this.deps.sessions.appendMessage(userId, sessionId, { role: 'user', kind: 'text', content: question });
      await this.deps.sessions.appendMessage(userId, sessionId, { role: 'assistant', kind: 'text', content: answer });
    } catch (error) {
      console.error('[ai.agent] Falha ao registrar a conversa', { name: errorName(error) });
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
      console.error('[ai.agent] Falha ao registrar a conversa', { name: errorName(error) });
    }
  }
}

function toStored(candidate: TargetCandidate): { id: string; label: string; record: FieldMap } {
  return { id: candidate.id, label: candidate.label, record: candidate.record };
}

/** Valor, data, tipo e pago vêm das regras (determinísticos); título e categoria podem vir do LLM. */
function mergeCreate(extracted: FieldMap, llm: FieldMap): FieldMap {
  const merged: FieldMap = { ...llm, ...extracted };
  if (llm.title !== undefined) merged.title = llm.title;
  return merged;
}
