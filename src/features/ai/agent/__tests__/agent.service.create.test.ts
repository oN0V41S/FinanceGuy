import { AgentService } from '../agent.service';
import { createTransactionAdapter } from '../entityAdapters/transaction';
import { InMemoryPendingRepo, makeTxService, NOW } from '../../__fixtures__/agentFakes';
import { AiRateLimitedError } from '../../errors';
import type { ILlmProvider, IRateLimiter } from '../../types';

const CREATE = 'propose_transaction_create';

function call(args: Record<string, unknown>) {
  return { name: CREATE, args };
}

function setup(opts: { defaultResponsible?: string | null; draft?: unknown; suggested?: string } = {}) {
  const pending = new InMemoryPendingRepo();
  const sessions = {
    getOrCreateActive: jest.fn().mockResolvedValue({ sessionId: 'sess-1' }),
    appendMessage: jest.fn().mockResolvedValue({}),
    maybeCompact: jest.fn().mockResolvedValue({ compacted: false }),
    getPendingDraft: jest.fn().mockResolvedValue(opts.draft ?? null),
  };
  const llm: jest.Mocked<ILlmProvider> = { complete: jest.fn() };
  const rateLimiter: jest.Mocked<IRateLimiter> = { consume: jest.fn().mockResolvedValue({ allowed: true }) };
  const categorySuggester = { suggest: jest.fn().mockResolvedValue(opts.suggested) };
  let n = 0;
  const service = new AgentService({
    adapters: { transaction: createTransactionAdapter(makeTxService()) },
    pending,
    sessions: sessions as never,
    llm,
    rateLimiter,
    categorySuggester,
    context: { getContext: jest.fn().mockResolvedValue(null) },
    config: { actionTtlMinutes: 10, maxQueue: 5, maxPending: 20 },
    defaultResponsible: jest
      .fn()
      .mockResolvedValue(opts.defaultResponsible === null ? undefined : (opts.defaultResponsible ?? 'Ana')),
    now: () => NOW,
    newId: () => `queue-${++n}`,
  });
  return { service, pending, sessions, llm, rateLimiter, categorySuggester };
}

const reply = (...calls: Array<{ name: string; args: Record<string, unknown> }>) => ({
  text: '',
  stopReason: 'stop' as const,
  toolCalls: calls,
});

describe('AgentService: criação interpretada pelo LLM', () => {
  it('uma mensagem com duas transações gera dois cards, quantidade decidida pelo LLM', async () => {
    const { service, llm, rateLimiter, pending } = setup();
    llm.complete.mockResolvedValue(
      reply(
        call({ type: 'expense', value: 50, title: 'Mercado', date: '2026-10-14', category: 'Alimentação' }),
        call({ type: 'income', value: 3000, title: 'Salário', category: 'Salário' }),
      ),
    );
    const res = await service.propose(
      'user-1',
      'Criar despesa de R$ 50,00 no mercado hoje e nova receita de R$ 3.000,00 de salário',
    );
    expect(rateLimiter.consume).toHaveBeenCalledTimes(1);
    expect(llm.complete).toHaveBeenCalledTimes(1);
    expect(res?.actions).toHaveLength(2);
    expect(pending.rows.map((r) => r.position)).toEqual([1, 2]);
    expect(res?.actions?.every((a) => a.status === 'ready')).toBe(true);
  });

  it('envia ao LLM só a tool de criação e o texto original dentro de <pedido>', async () => {
    const { service, llm } = setup();
    llm.complete.mockResolvedValue(reply(call({ type: 'expense', value: 10, category: 'Lazer' })));
    await service.propose('user-1', 'gastei 10 no cinema');
    const request = llm.complete.mock.calls[0][0];
    expect(request.toolChoice).toEqual({ mode: 'any', allowedNames: [CREATE] });
    expect(request.tools?.map((t) => t.name)).toEqual([CREATE]);
    expect(request.messages[0].content).toContain('<pedido>gastei 10 no cinema</pedido>');
  });

  it('aplica só padrões do app (data hoje, não pago, responsável padrão) e não inventa dados', async () => {
    const { service, pending, llm } = setup();
    llm.complete.mockResolvedValue(reply(call({ type: 'expense', value: 50, title: 'Mercado', category: 'Alimentação' })));
    await service.propose('user-1', 'registre despesa de 50 no mercado');
    const fields = (pending.rows[0].payload as { fields: Record<string, unknown> }).fields;
    expect(fields).toMatchObject({ date: '2026-10-14', paid: false, responsible: 'Ana', value: 50 });
  });

  it('categoria ausente é sugerida (apenas ela)', async () => {
    const { service, pending, llm, categorySuggester } = setup({ suggested: 'Alimentação' });
    llm.complete.mockResolvedValue(reply(call({ type: 'expense', value: 50, title: 'Padaria' })));
    await service.propose('user-1', 'registre despesa de 50 na padaria');
    expect(categorySuggester.suggest).toHaveBeenCalledTimes(1);
    expect((pending.rows[0].payload as { fields: Record<string, unknown> }).fields.category).toBe('Alimentação');
  });

  it('faltando campo obrigatório NÃO gera card: pergunta o que falta e guarda o rascunho', async () => {
    const { service, pending, llm, sessions } = setup();
    llm.complete.mockResolvedValue(reply(call({ title: 'Mercado', category: 'Alimentação' })));
    const res = await service.propose('user-1', 'registre uma despesa no mercado');
    expect(res).toMatchObject({ kind: 'clarify', sessionId: 'sess-1' });
    expect(res?.actions).toBeUndefined();
    expect(res?.answer).toMatch(/valor/i);
    expect(pending.rows).toHaveLength(0);
    const assistant = sessions.appendMessage.mock.calls.find(([, , m]) => m.role === 'assistant')?.[2];
    expect(assistant.payload.draft).toMatchObject({ entity: 'transaction', op: 'create' });
    expect(assistant.payload.draft.items[0]).toMatchObject({ title: 'Mercado' });
  });

  it('sem responsável padrão, pergunta o responsável', async () => {
    const { service, llm, pending } = setup({ defaultResponsible: null });
    llm.complete.mockResolvedValue(reply(call({ type: 'expense', value: 5, title: 'Pão', category: 'Alimentação' })));
    const res = await service.propose('user-1', 'gastei 5 em pão');
    expect(res?.kind).toBe('clarify');
    expect(res?.answer).toMatch(/respons/i);
    expect(pending.rows).toHaveLength(0);
  });

  it('resposta seguinte (sem verbo) completa o rascunho pendente e vira card', async () => {
    const draft = { entity: 'transaction', op: 'create', items: [{ title: 'Mercado', category: 'Alimentação', type: 'expense' }] };
    const { service, llm, sessions } = setup({ draft });
    llm.complete.mockResolvedValue(
      reply(call({ title: 'Mercado', category: 'Alimentação', type: 'expense', value: 80 })),
    );
    const res = await service.propose('user-1', 'foi 80 reais');
    expect(sessions.getPendingDraft).toHaveBeenCalled();
    const content = llm.complete.mock.calls[0][0].messages[0].content;
    expect(content).toContain('<rascunho>');
    expect(content).toContain('<pedido>foi 80 reais</pedido>');
    expect(res?.kind).toBe('actions');
    expect(res?.actions?.[0].status).toBe('ready');
  });

  it('novo comando com verbo ignora o rascunho pendente', async () => {
    const draft = { entity: 'transaction', op: 'create', items: [{ title: 'Mercado' }] };
    const { service, llm } = setup({ draft });
    llm.complete.mockResolvedValue(reply(call({ type: 'income', value: 100, title: 'Freela', category: 'Outros' })));
    await service.propose('user-1', 'recebi 100 de freela');
    expect(llm.complete.mock.calls[0][0].messages[0].content).not.toContain('<rascunho>');
  });

  it('pergunta de leitura sem rascunho retorna null sem chamar o LLM', async () => {
    const { service, llm } = setup();
    expect(await service.propose('user-1', 'quanto gastei este mês?')).toBeNull();
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('LLM indisponível ou sem tool call: pede para reenviar, sem card nem erro', async () => {
    const { service, llm, pending } = setup();
    llm.complete.mockRejectedValueOnce(new Error('boom'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const first = await service.propose('user-1', 'gastei 10 no cinema');
    llm.complete.mockResolvedValueOnce({ text: 'oi', stopReason: 'stop' });
    const second = await service.propose('user-1', 'gastei 10 no cinema');
    spy.mockRestore();
    expect(first?.kind).toBe('clarify');
    expect(second?.kind).toBe('clarify');
    expect(pending.rows).toHaveLength(0);
  });

  it('cota esgotada vira AiRateLimitedError', async () => {
    const { service, rateLimiter, llm } = setup();
    rateLimiter.consume.mockResolvedValue({ allowed: false, scope: 'minute', retryAfterSeconds: 7 });
    await expect(service.propose('user-1', 'gastei 10 no cinema')).rejects.toBeInstanceOf(AiRateLimitedError);
    expect(llm.complete).not.toHaveBeenCalled();
  });

  it('mais cards que AI_MAX_QUEUE vira esclarecimento', async () => {
    const { service, llm } = setup();
    llm.complete.mockResolvedValue(
      reply(...Array.from({ length: 6 }, (_, i) => call({ type: 'expense', value: i + 1, category: 'Lazer' }))),
    );
    const res = await service.propose('user-1', 'gastei 1 em a e gastei 2 em b');
    expect(res?.kind).toBe('clarify');
  });

  it('ignora campos que o LLM devolve fora do contrato', async () => {
    const { service, llm, pending } = setup();
    llm.complete.mockResolvedValue(
      reply(call({ type: 'expense', value: 5, category: 'Lazer', userId: 'outro', id: 'x', paid: true })),
    );
    await service.propose('user-1', 'paguei 5 de cinema');
    const fields = (pending.rows[0].payload as { fields: Record<string, unknown> }).fields;
    expect(fields).not.toHaveProperty('userId');
    expect(fields).not.toHaveProperty('id');
    expect(pending.rows[0].userId).toBe('user-1');
  });
});
