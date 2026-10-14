import { AgentService } from '../agent.service';
import { createTransactionAdapter } from '../entityAdapters/transaction';
import { InMemoryPendingRepo, makeTxService, NOW, txRow } from '../../__fixtures__/agentFakes';
import { AiRateLimitedError } from '../../errors';
import type { FinancialContextDto, ILlmProvider, IRateLimiter } from '../../types';

function setup(overrides: { maxPending?: number; maxQueue?: number; defaultResponsible?: string | null } = {}) {
  const tx = makeTxService();
  const pending = new InMemoryPendingRepo();
  const sessions = {
    getOrCreateActive: jest.fn().mockResolvedValue({ sessionId: 'sess-1' }),
    startNew: jest.fn(),
    appendMessage: jest.fn().mockResolvedValue({}),
    getLlmHistory: jest.fn(),
    getSessionDto: jest.fn(),
    maybeCompact: jest.fn().mockResolvedValue({ compacted: false }),
  };
  const llm: jest.Mocked<ILlmProvider> = { complete: jest.fn() };
  const rateLimiter: jest.Mocked<IRateLimiter> = { consume: jest.fn().mockResolvedValue({ allowed: true }) };
  const context = { getContext: jest.fn().mockResolvedValue({
      today: '2026-10-14',
      currentMonth: { month: '2026-10', income: { total: 0 }, expense: { total: 0 }, byCategory: [] },
      recentTransactions: [],
    } as unknown as FinancialContextDto) };
  let n = 0;
  const service = new AgentService({
    adapters: { transaction: createTransactionAdapter(tx) },
    pending,
    sessions,
    llm,
    rateLimiter,
    context,
    config: { actionTtlMinutes: 10, maxQueue: 5, maxPending: overrides.maxPending ?? 20 },
    defaultResponsible: jest
      .fn()
      .mockResolvedValue(overrides.defaultResponsible === null ? undefined : (overrides.defaultResponsible ?? 'Ana')),
    now: () => NOW,
    newId: () => `queue-${++n}`,
  });
  return { service, tx, pending, sessions, llm, rateLimiter, context };
}

describe('AgentService.propose', () => {
  it('perguntas de leitura retornam null sem tocar em nada', async () => {
    const { service, sessions, rateLimiter, llm } = setup();
    expect(await service.propose('user-1', 'quanto gastei este mês?')).toBeNull();
    expect(sessions.appendMessage).not.toHaveBeenCalled();
    expect(rateLimiter.consume).not.toHaveBeenCalled();
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('pedido ambíguo vira esclarecimento (0 token)', async () => {
    const { service, rateLimiter, sessions } = setup();
    const res = await service.propose('user-1', 'crie algo');
    expect(res).toMatchObject({ kind: 'clarify', sessionId: 'sess-1' });
    expect(rateLimiter.consume).not.toHaveBeenCalled();
    expect(sessions.appendMessage).toHaveBeenCalledTimes(2);
  });

  it('criação completa fica pronta sem LLM e sem consumir cota', async () => {
    const { service, llm, rateLimiter, pending, sessions } = setup();
    const res = await service.propose('user-1', 'gastei 50 no mercado hoje', 'sess-9');
    expect(res).toMatchObject({ kind: 'actions', queueId: 'queue-1', sessionId: 'sess-9' });
    expect(res?.actions).toHaveLength(1);
    expect(res?.actions?.[0]).toMatchObject({ status: 'ready', op: 'create', destructive: false });
    expect(res?.nextSteps).toMatchObject({ total: 1, canConfirmAll: true });
    expect(llm.complete).not.toHaveBeenCalled();
    expect(rateLimiter.consume).not.toHaveBeenCalled();
    expect(pending.rows[0].expiresAt.getTime()).toBe(NOW.getTime() + 10 * 60_000);
    const cardsMsg = sessions.appendMessage.mock.calls.find(([, , m]) => m.kind === 'action_cards')?.[2];
    expect(cardsMsg.payload).toMatchObject({ queueId: 'queue-1', nextSteps: { total: 1 } });
    expect(cardsMsg.payload.actions).toHaveLength(1);
    expect(sessions.maybeCompact).toHaveBeenCalled();
  });

  it('sem responsável padrão, o campo vira pendência (needs_input) sem chamar o LLM', async () => {
    const { service, llm } = setup({ defaultResponsible: null });
    const res = await service.propose('user-1', 'gastei 50 no mercado hoje');
    expect(res?.actions?.[0].status).toBe('needs_input');
    expect(res?.actions?.[0].missingFields.map((m) => m.key)).toEqual(['responsible']);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('com dados faltantes usa o LLM (cota consumida, tool forçada) e vira ready', async () => {
    const { service, llm, rateLimiter, context } = setup();
    llm.complete.mockResolvedValue({
      text: '',
      stopReason: 'stop',
      toolCalls: [
        {
          name: 'propose_transaction_create',
          args: { type: 'expense', category: 'Lazer', value: 'R$ 40,00', title: 'Cinema' },
        },
      ],
    });
    const res = await service.propose('user-1', 'registre uma despesa de cinema ontem');
    expect(rateLimiter.consume).toHaveBeenCalledTimes(1);
    expect(context.getContext).toHaveBeenCalled();
    const request = llm.complete.mock.calls[0][0];
    expect(request.toolChoice).toEqual({ mode: 'any', allowedNames: ['propose_transaction_create'] });
    expect(request.tools).toHaveLength(1);
    expect(request.messages[0].content).toContain('<pedido>');
    expect(res?.actions?.[0]).toMatchObject({ status: 'ready' });
  });

  it('falha do LLM degrada para needs_input, sem lançar', async () => {
    const { service, llm } = setup();
    llm.complete.mockRejectedValue(new Error('boom'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await service.propose('user-1', 'registre uma despesa de cinema ontem');
    spy.mockRestore();
    expect(res?.kind).toBe('actions');
    expect(res?.actions?.[0].status).toBe('needs_input');
  });

  it('resposta do LLM sem a tool esperada também degrada', async () => {
    const { service, llm } = setup();
    llm.complete.mockResolvedValue({ text: 'oi', stopReason: 'stop', toolCalls: [{ name: 'outra', args: {} }] });
    const res = await service.propose('user-1', 'registre uma despesa de cinema ontem');
    expect(res?.actions?.[0].status).toBe('needs_input');
  });

  it('cota esgotada vira AiRateLimitedError', async () => {
    const { service, rateLimiter, llm } = setup();
    rateLimiter.consume.mockResolvedValue({ allowed: false, scope: 'minute', retryAfterSeconds: 7 });
    await expect(service.propose('user-1', 'registre uma despesa de cinema ontem')).rejects.toBeInstanceOf(AiRateLimitedError);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('entidade sem adapter (investimento) é recusada com texto', async () => {
    const { service, pending } = setup();
    const res = await service.propose('user-1', 'cadastre um investimento');
    expect(res?.kind).toBe('refused');
    expect(pending.rows).toHaveLength(0);
  });

  it('respeita AI_MAX_PENDING', async () => {
    const { service, pending } = setup({ maxPending: 1 });
    await service.propose('user-1', 'gastei 50 no mercado hoje');
    const res = await service.propose('user-1', 'gastei 30 no mercado hoje');
    expect(res?.kind).toBe('clarify');
    expect(pending.rows).toHaveLength(1);
  });

  it('ações vencidas são expiradas antes de contar o limite', async () => {
    const { service, pending } = setup({ maxPending: 1 });
    await service.propose('user-1', 'gastei 50 no mercado hoje');
    pending.rows[0].expiresAt = new Date(NOW.getTime() - 1);
    const res = await service.propose('user-1', 'gastei 30 no mercado hoje');
    expect(res?.kind).toBe('actions');
    expect(pending.rows[0].status).toBe('expired');
  });

  it('respeita AI_MAX_QUEUE', async () => {
    const { service } = setup();
    const res = await service.propose(
      'user-1',
      'gastei 1 no mercado; gastei 2 no mercado; gastei 3 no mercado; gastei 4 no mercado; gastei 5 no mercado; gastei 6 no mercado',
    );
    expect(res?.kind).toBe('clarify');
  });

  it('uma fila com vários pedidos cria uma ação por segmento', async () => {
    const { service, pending } = setup();
    const res = await service.propose('user-1', 'gastei 50 no mercado hoje; recebi 100 de salário hoje');
    expect(res?.actions).toHaveLength(2);
    expect(pending.rows.map((r) => r.position)).toEqual([1, 2]);
  });

  describe('alterar e remover', () => {
    it('sem candidatas responde "não encontrei" sem criar ação', async () => {
      const { service, pending } = setup();
      const res = await service.propose('user-1', 'remova a despesa mercado');
      expect(res?.kind).toBe('not_found');
      expect(res?.answer).toMatch(/Não encontrei/);
      expect(pending.rows).toHaveLength(0);
    });

    it('uma candidata gera card direto com "before" e alvo guardado no servidor', async () => {
      const { service, tx, pending } = setup();
      tx.searchTransactions.mockResolvedValue([txRow()]);
      const res = await service.propose('user-1', 'remova a despesa mercado');
      const card = res?.actions?.[0];
      expect(card).toMatchObject({ status: 'ready', op: 'delete', destructive: true });
      expect(card?.before?.length).toBeGreaterThan(0);
      expect(pending.rows[0].targetId).toBe('tx-1');
      expect(JSON.stringify(res)).not.toContain('tx-1');
    });

    it('várias candidatas entram em awaiting_pick expondo só rótulos', async () => {
      const { service, tx, pending } = setup();
      tx.searchTransactions.mockResolvedValue([txRow({ id: 'a1' }), txRow({ id: 'b2', value: 99 })]);
      const res = await service.propose('user-1', 'altere a despesa mercado para 150');
      const card = res?.actions?.[0];
      expect(card?.status).toBe('awaiting_pick');
      expect(card?.candidates).toHaveLength(2);
      expect(card?.candidates?.[0]).toEqual({ index: 0, label: expect.any(String) });
      expect(JSON.stringify(res)).not.toMatch(/a1|b2/);
      expect(pending.rows[0].targetId).toBeNull();
    });

    it('alteração sem mudanças reconhecíveis usa o LLM para as mudanças', async () => {
      const { service, tx, llm, rateLimiter } = setup();
      tx.searchTransactions.mockResolvedValue([txRow()]);
      llm.complete.mockResolvedValue({
        text: '',
        stopReason: 'stop',
        toolCalls: [{ name: 'propose_transaction_update', args: { category: 'Lazer' } }],
      });
      const res = await service.propose('user-1', 'altere a despesa mercado para a categoria de lazer do mês');
      expect(rateLimiter.consume).toHaveBeenCalledTimes(1);
      expect(res?.actions?.[0].status).toBe('ready');
    });

    it('remoção nunca chama o LLM', async () => {
      const { service, tx, llm } = setup();
      tx.searchTransactions.mockResolvedValue([txRow()]);
      await service.propose('user-1', 'exclua a despesa mercado');
      expect(llm.complete).not.toHaveBeenCalled();
    });
  });

  it('falha ao gravar na sessão não derruba a resposta', async () => {
    const { service, sessions } = setup();
    sessions.appendMessage.mockRejectedValue(new Error('db'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await service.propose('user-1', 'gastei 50 no mercado hoje');
    spy.mockRestore();
    expect(res?.kind).toBe('actions');
  });

  it('exige userId', async () => {
    const { service } = setup();
    await expect(service.propose('', 'gastei 50')).rejects.toThrow();
  });
});

describe('AgentService.recordTurn', () => {
  it('grava pergunta e resposta e devolve a sessão usada', async () => {
    const { service, sessions } = setup();
    const sid = await service.recordTurn('user-1', undefined, 'quanto gastei?', { answer: 'R$ 10', truncated: true });
    expect(sid).toBe('sess-1');
    expect(sessions.appendMessage).toHaveBeenCalledTimes(2);
    expect(sessions.appendMessage.mock.calls[1][2]).toMatchObject({ truncated: true, payload: { truncated: true } });
  });

  it('nunca lança', async () => {
    const { service, sessions } = setup();
    sessions.getOrCreateActive.mockRejectedValue(new Error('db'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(service.recordTurn('user-1', undefined, 'q', { answer: 'a', truncated: false })).resolves.toBeUndefined();
    await expect(service.recordTurn('user-1', 's', 'q', { answer: 'a', truncated: false })).resolves.toBeDefined();
    spy.mockRestore();
  });
});
