import { AgentService } from '../agent.service';
import { createTransactionAdapter } from '../entityAdapters/transaction';
import { InMemoryPendingRepo, makeTxService, NOW } from '../../__fixtures__/agentFakes';
import type { ILlmProvider, IRateLimiter } from '../../types';
import { extractTransactionFields } from '../extract';

jest.mock('../extract', () => {
  const actual = jest.requireActual('../extract');
  return { ...actual, extractTransactionFields: jest.fn() };
});

describe('AgentService mergeCreate', () => {
  it('chave undefined explícita no extraído não apaga o valor vindo do LLM', async () => {
    (extractTransactionFields as jest.Mock).mockReturnValue({
      type: undefined,
      value: 'R$ 40,00',
      title: 'Cinema',
      date: '2026-10-14',
      category: undefined,
    });
    const llm: jest.Mocked<ILlmProvider> = {
      complete: jest.fn().mockResolvedValue({
        text: '',
        stopReason: 'stop',
        toolCalls: [{ name: 'propose_transaction_create', args: { type: 'expense', category: 'Lazer' } }],
      }),
    };
    const rateLimiter: jest.Mocked<IRateLimiter> = { consume: jest.fn().mockResolvedValue({ allowed: true }) };
    const pending = new InMemoryPendingRepo();
    let n = 0;
    const service = new AgentService({
      adapters: { transaction: createTransactionAdapter(makeTxService()) },
      pending,
      sessions: {
        getOrCreateActive: jest.fn().mockResolvedValue({ sessionId: 's1' }),
        appendMessage: jest.fn().mockResolvedValue({}),
        maybeCompact: jest.fn().mockResolvedValue({ compacted: false }),
      } as never,
      llm,
      rateLimiter,
      context: { getContext: jest.fn().mockResolvedValue(null) },
      config: { actionTtlMinutes: 10, maxQueue: 5, maxPending: 20 },
      defaultResponsible: jest.fn().mockResolvedValue('Ana'),
      now: () => NOW,
      newId: () => `q-${++n}`,
    });

    await service.propose('user-1', 'registre uma despesa de cinema');

    const fields = (pending.rows[0].payload as { fields: Record<string, unknown> }).fields;
    expect(fields.category).toBe('Lazer');
  });
});
