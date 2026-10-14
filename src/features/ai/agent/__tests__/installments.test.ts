import { AgentService } from '../agent.service';
import { createTransactionAdapter } from '../entityAdapters/transaction';
import { computeMissing } from '../missingFields';
import { looksLikeCredential, pickSafeResponsible } from '../safeName';
import { buildToolDeclarations } from '../tools';
import { InMemoryPendingRepo, makeTxService, NOW } from '../../__fixtures__/agentFakes';
import type { ILlmProvider, IRateLimiter } from '../../types';

const CREATE = 'propose_transaction_create';
const adapter = createTransactionAdapter(makeTxService());
const base = { type: 'expense', value: 300, category: 'Lazer', responsible: 'Ana' };
const ctx = { today: '2026-10-14', hasTarget: false };

describe('parcelas e recorrência: adapter', () => {
  it('mantém total_installments e is_recurring na criação', () => {
    const ev = adapter.evaluate('create', { ...base, total_installments: 3 }, ctx);
    expect(ev.valid).toBe(true);
    expect(ev.fields.total_installments).toBe(3);
  });

  it('aceita "3x" e descarta 1x', () => {
    expect(adapter.sanitize({ total_installments: '3x' }).total_installments).toBe(3);
    expect(adapter.sanitize({ total_installments: 1 })).not.toHaveProperty('total_installments');
  });

  it('contagem fora de 2 a 48 invalida o card', () => {
    const ev = adapter.evaluate('create', { ...base, total_installments: 60 }, ctx);
    expect(ev.valid).toBe(false);
    expect(ev.errors.total_installments).toMatch(/2 a 48/);
  });

  it('em alteração parcelas/recorrência são ignoradas', () => {
    const ev = adapter.evaluate('update', { value: 10, total_installments: 3, is_recurring: true }, { ...ctx, hasTarget: true });
    expect(ev.fields).not.toHaveProperty('total_installments');
    expect(ev.fields).not.toHaveProperty('is_recurring');
  });

  it('recorrente sem quantidade pergunta o número de ocorrências', () => {
    const ev = adapter.evaluate('create', { ...base, is_recurring: true }, ctx);
    expect(ev.missing.map((m) => m.key)).toContain('total_installments');
    expect(ev.valid).toBe(false);
  });

  it('card mostra campo informativo somente leitura', () => {
    const ev = adapter.evaluate('create', { ...base, total_installments: 3 }, ctx);
    const dto = adapter.toFieldDtos('create', ev).find((f) => f.key === 'total_installments');
    expect(dto).toMatchObject({ label: 'Parcelas', editable: false });
    expect(dto?.display).toMatch(/3x de R\$\s?100,00/);
    expect(adapter.describe('create', ev.fields)).toMatch(/3x/);
  });

  it('lançamento único não ganha campo de parcelas', () => {
    const ev = adapter.evaluate('create', base, ctx);
    expect(adapter.toFieldDtos('create', ev).some((f) => f.key === 'total_installments')).toBe(false);
  });

  it('a tool de criação expõe parcelas; a de alteração não', () => {
    const tools = buildToolDeclarations({ transaction: adapter });
    const props = (name: string) =>
      Object.keys((tools.find((t) => t.name === name)?.parameters as { properties: object }).properties);
    expect(props(CREATE)).toEqual(expect.arrayContaining(['total_installments', 'is_recurring']));
    expect(props('propose_transaction_update')).not.toContain('total_installments');
  });
});

describe('computeMissing: recorrência', () => {
  it('pede a quantidade quando is_recurring sem total_installments', () => {
    const { missing } = computeMissing('transaction', 'create', { ...base, is_recurring: true });
    expect(missing.map((m) => m.key)).toEqual(['total_installments']);
  });
});

describe('AgentService: "3x de R$ 100"', () => {
  it('gera um card com value total e total_installments', async () => {
    const pending = new InMemoryPendingRepo();
    const llm: jest.Mocked<ILlmProvider> = {
      complete: jest.fn().mockResolvedValue({
        text: '',
        stopReason: 'stop',
        toolCalls: [{ name: CREATE, args: { type: 'expense', value: 300, title: 'Notebook', category: 'Lazer', total_installments: 3 } }],
      }),
    };
    const rateLimiter: jest.Mocked<IRateLimiter> = { consume: jest.fn().mockResolvedValue({ allowed: true }) };
    const service = new AgentService({
      adapters: { transaction: adapter },
      pending,
      sessions: {
        getOrCreateActive: jest.fn().mockResolvedValue({ sessionId: 's' }),
        appendMessage: jest.fn().mockResolvedValue({}),
        maybeCompact: jest.fn(),
        getPendingDraft: jest.fn().mockResolvedValue(null),
      } as never,
      llm,
      rateLimiter,
      context: { getContext: jest.fn().mockResolvedValue(null) },
      config: { actionTtlMinutes: 10, maxQueue: 5, maxPending: 20 },
      defaultResponsible: jest.fn().mockResolvedValue('Ana'),
      now: () => NOW,
      newId: () => 'q1',
    });
    const res = await service.propose('user-1', 'comprei um notebook em 3x de R$ 100');
    expect(res?.actions).toHaveLength(1);
    const fields = (pending.rows[0].payload as { fields: Record<string, unknown> }).fields;
    expect(fields).toMatchObject({ value: 300, total_installments: 3 });
    expect(llm.complete.mock.calls[0][0].system).toMatch(/valor TOTAL/);
  });
});

describe('responsável padrão com cara de credencial', () => {
  it.each(['Admin01@ is the pass', 'senha123', 'Admin01@', 'minha senha é x', 'a'.repeat(60)])(
    'descarta "%s"',
    (value) => {
      expect(looksLikeCredential(value)).toBe(true);
      expect(pickSafeResponsible(value)).toBeUndefined();
    },
  );

  it('mantém nomes normais e cai para o próximo candidato', () => {
    expect(looksLikeCredential("Maria D'Ávila")).toBe(false);
    expect(pickSafeResponsible('Admin01@ is the pass', 'Ana Souza')).toBe('Ana Souza');
    expect(pickSafeResponsible(null, undefined, '  ')).toBeUndefined();
  });

  it('computeMissing não usa responsável padrão suspeito', () => {
    const { fields, missing } = computeMissing('transaction', 'create', { ...base, responsible: undefined }, {
      defaultResponsible: 'Admin01@ is the pass',
    });
    expect(fields.responsible).toBeUndefined();
    expect(missing.map((m) => m.key)).toContain('responsible');
  });
});
