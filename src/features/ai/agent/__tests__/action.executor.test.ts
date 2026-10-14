import { ActionExecutor } from '../action.executor';
import { createTransactionAdapter } from '../entityAdapters/transaction';
import {
  ActionConflictError,
  ActionExpiredError,
  ActionInvalidError,
  ActionNotFoundError,
} from '../errors';
import { InMemoryPendingRepo, makeTxService, NOW, txRow } from '../../__fixtures__/agentFakes';
import type { NewPendingAction } from '../repositories/IPendingAction.repository';

const FULL_CREATE = {
  fields: { type: 'expense', title: 'Mercado', value: 50, category: 'Alimentação', date: '2026-10-14', responsible: 'Ana', paid: true },
};

function item(overrides: Partial<NewPendingAction> = {}): NewPendingAction {
  return {
    userId: 'user-1',
    sessionId: 's1',
    queueId: 'q1',
    position: 1,
    entity: 'transaction',
    op: 'create',
    payload: FULL_CREATE,
    status: 'ready',
    expiresAt: new Date(NOW.getTime() + 600_000),
    ...overrides,
  };
}

async function setup(items: NewPendingAction[] = [item()]) {
  const tx = makeTxService();
  const pending = new InMemoryPendingRepo();
  await pending.createMany(items);
  const audit = { create: jest.fn().mockResolvedValue(undefined) };
  const contextCache = { invalidate: jest.fn().mockResolvedValue(undefined) };
  const executor = new ActionExecutor({
    adapters: { transaction: createTransactionAdapter(tx) },
    pending,
    audit,
    contextCache,
    now: () => NOW,
  });
  return { executor, tx, pending, audit, contextCache };
}

describe('ActionExecutor.confirm', () => {
  it('cria a transação, audita, invalida o cache e marca como confirmada', async () => {
    const { executor, tx, pending, audit, contextCache } = await setup();
    const res = await executor.confirm('user-1', ['act-1']);
    expect(tx.createTransaction).toHaveBeenCalledWith(expect.objectContaining({ title: 'Mercado', userId: 'user-1' }));
    expect(res.results[0]).toMatchObject({ id: 'act-1', status: 'confirmed' });
    expect(res.results[0].message).toMatch(/^Feito:/);
    expect(res.nextSteps).toMatchObject({ total: 1, done: 1 });
    expect(pending.rows[0].status).toBe('confirmed');
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', op: 'create', entityId: 'tx-new', before: null, source: 'ai-agent' }),
    );
    expect(contextCache.invalidate).toHaveBeenCalledWith('user-1');
  });

  it('é idempotente: segunda confirmação da mesma ação dá 409 e não escreve de novo', async () => {
    const { executor, tx } = await setup();
    await executor.confirm('user-1', ['act-1']);
    await expect(executor.confirm('user-1', ['act-1'])).rejects.toBeInstanceOf(ActionConflictError);
    expect(tx.createTransaction).toHaveBeenCalledTimes(1);
  });

  it('confirmações concorrentes escrevem uma única vez (claim atômico)', async () => {
    const { executor, tx } = await setup();
    const results = await Promise.allSettled([executor.confirm('user-1', ['act-1']), executor.confirm('user-1', ['act-1'])]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(tx.createTransaction).toHaveBeenCalledTimes(1);
  });

  it('ação vencida dá 410 e é marcada como expirada', async () => {
    const { executor, pending, tx } = await setup([item({ expiresAt: new Date(NOW.getTime() - 1) })]);
    await expect(executor.confirm('user-1', ['act-1'])).rejects.toBeInstanceOf(ActionExpiredError);
    expect(pending.rows[0].status).toBe('expired');
    expect(tx.createTransaction).not.toHaveBeenCalled();
  });

  it('IDOR: ação de outro usuário é 404 e nada é executado', async () => {
    const { executor, tx, pending } = await setup();
    await expect(executor.confirm('user-2', ['act-1'])).rejects.toBeInstanceOf(ActionNotFoundError);
    expect(tx.createTransaction).not.toHaveBeenCalled();
    expect(pending.rows[0].status).toBe('ready');
  });

  it('lote com um id alheio derruba o lote inteiro antes de executar', async () => {
    const { executor, tx, pending } = await setup([item(), item({ userId: 'user-2', position: 2 })]);
    await expect(executor.confirm('user-1', ['act-1', 'act-2'])).rejects.toBeInstanceOf(ActionNotFoundError);
    expect(tx.createTransaction).not.toHaveBeenCalled();
    expect(pending.rows.every((r) => r.status === 'ready')).toBe(true);
  });

  it.each([
    [[]],
    [['a', 'a']],
    [['1', '2', '3', '4', '5', '6']],
  ])('lote inválido %j dá ActionInvalidError', async (ids) => {
    const { executor } = await setup();
    await expect(executor.confirm('user-1', ids)).rejects.toBeInstanceOf(ActionInvalidError);
  });

  it('sucesso parcial: uma falha não impede as demais', async () => {
    const { executor, tx, pending } = await setup([
      item(),
      item({ position: 2, payload: { fields: { ...FULL_CREATE.fields, title: 'Falha' } } }),
      item({ position: 3, status: 'needs_input' }),
    ]);
    tx.createTransaction.mockImplementationOnce(async (d: Record<string, unknown>) => ({ id: 'ok', ...d }));
    tx.createTransaction.mockRejectedValueOnce(new Error('db down'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await executor.confirm('user-1', ['act-1', 'act-2', 'act-3']);
    spy.mockRestore();
    expect(res.results.map((r) => r.status)).toEqual(['confirmed', 'failed', 'needs_input']);
    expect(res.results[1].message).toMatch(/Nada foi alterado/);
    expect(res.nextSteps).toMatchObject({ done: 1, failed: 1 });
    expect(pending.rows[1].status).toBe('failed');
  });

  it('revalida com Zod: payload adulterado vira failed sem escrever', async () => {
    const { executor, tx } = await setup([item({ payload: { fields: { ...FULL_CREATE.fields, value: -1 } } })]);
    const res = await executor.confirm('user-1', ['act-1']);
    expect(res.results[0].status).toBe('failed');
    expect(tx.createTransaction).not.toHaveBeenCalled();
  });

  it('update: lê o alvo antes, audita before/after e preserva paid', async () => {
    const { executor, tx, audit } = await setup([
      item({ op: 'update', payload: { fields: { value: 150 } }, targetId: 'tx-1', before: txRow() as never }),
    ]);
    tx.getTransactionById.mockResolvedValue(txRow({ paid: true, is_recurring: true }));
    const res = await executor.confirm('user-1', ['act-1']);
    expect(res.results[0].status).toBe('confirmed');
    expect(tx.updateTransaction).toHaveBeenCalledWith('tx-1', expect.objectContaining({ value: 150, paid: true, is_recurring: true }));
    const entry = audit.create.mock.calls[0][0];
    expect(entry.before).toMatchObject({ value: 120 });
    expect(entry.after).toMatchObject({ value: 150 });
    expect(JSON.stringify([entry.before, entry.after])).not.toContain('userId');
  });

  it('delete: alvo sumiu vira failed com mensagem clara', async () => {
    const { executor, tx } = await setup([item({ op: 'delete', payload: { fields: {} }, targetId: 'tx-1' })]);
    tx.getTransactionById.mockResolvedValue(null);
    const res = await executor.confirm('user-1', ['act-1']);
    expect(res.results[0]).toMatchObject({ status: 'failed' });
    expect(res.results[0].message).toMatch(/Não encontrei mais/);
    expect(tx.deleteTransaction).not.toHaveBeenCalled();
  });

  it('delete confirmado remove e audita o before', async () => {
    const { executor, tx, audit } = await setup([item({ op: 'delete', payload: { fields: {} }, targetId: 'tx-1' })]);
    tx.getTransactionById.mockResolvedValue(txRow());
    const res = await executor.confirm('user-1', ['act-1']);
    expect(res.results[0].status).toBe('confirmed');
    expect(tx.deleteTransaction).toHaveBeenCalledWith('tx-1', 'user-1');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ op: 'delete', after: null }));
  });

  it('delete/update sem alvo falha', async () => {
    const { executor } = await setup([item({ op: 'delete', payload: { fields: {} }, targetId: null })]);
    // delete sem alvo não é válido (hasTarget=false) e deve falhar com "dados inválidos"
    const res = await executor.confirm('user-1', ['act-1']);
    expect(res.results[0].status).toBe('failed');
  });

  it('falha de auditoria e de cache não desfazem a escrita e não vazam para o console', async () => {
    const { executor, audit, contextCache, tx } = await setup();
    audit.create.mockRejectedValue(new Error('SENSITIVE audit'));
    contextCache.invalidate.mockRejectedValue(new Error('SENSITIVE cache'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await executor.confirm('user-1', ['act-1']);
    const logged = JSON.stringify(spy.mock.calls);
    spy.mockRestore();
    expect(res.results[0].status).toBe('confirmed');
    expect(tx.createTransaction).toHaveBeenCalled();
    expect(logged).not.toContain('SENSITIVE');
  });

  it('entidade sem adapter falha sem executar', async () => {
    const { executor } = await setup([item({ entity: 'investment' })]);
    const res = await executor.confirm('user-1', ['act-1']);
    expect(res.results[0].status).toBe('failed');
  });

  it('não invalida o cache quando falha', async () => {
    const { executor, tx, contextCache } = await setup();
    tx.createTransaction.mockRejectedValue(new Error('x'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await executor.confirm('user-1', ['act-1']);
    spy.mockRestore();
    expect(contextCache.invalidate).not.toHaveBeenCalled();
  });

  it('lote: item já resolvido vira resultado por item (sem lançar)', async () => {
    const { executor } = await setup([item(), item({ position: 2, status: 'cancelled' })]);
    const res = await executor.confirm('user-1', ['act-1', 'act-2']);
    expect(res.results.map((r) => r.status)).toEqual(['confirmed', 'cancelled']);
  });

  it('lote: item vencido vira expired por item', async () => {
    const { executor } = await setup([item(), item({ position: 2, expiresAt: new Date(NOW.getTime() - 1) })]);
    const res = await executor.confirm('user-1', ['act-1', 'act-2']);
    expect(res.results.map((r) => r.status)).toEqual(['confirmed', 'expired']);
  });
});

describe('ActionExecutor.update (PATCH)', () => {
  it('completa campos faltantes e passa de needs_input para ready', async () => {
    const { executor, pending } = await setup([
      item({ status: 'needs_input', payload: { fields: { ...FULL_CREATE.fields, responsible: null } } as never }),
    ]);
    const res = await executor.update('user-1', 'act-1', { responsible: 'Leo' });
    expect(res.card.status).toBe('ready');
    expect(pending.rows[0].status).toBe('ready');
    expect((pending.rows[0].payload as { fields: Record<string, unknown> }).fields.responsible).toBe('Leo');
  });

  it('limpar um campo obrigatório volta para needs_input', async () => {
    const { executor } = await setup();
    const res = await executor.update('user-1', 'act-1', { value: null });
    expect(res.card.status).toBe('needs_input');
    const res2 = await executor.update('user-1', 'act-1', { category: '  ' });
    expect(res2.card.missingFields.map((m) => m.key)).toEqual(expect.arrayContaining(['value', 'category']));
  });

  it('categoria em branco é preenchida pela IA a partir do título', async () => {
    const suggester = { suggest: jest.fn().mockResolvedValue('Lazer') };
    const { executor, pending } = await setup();
    (executor as unknown as { deps: { categorySuggester: unknown } }).deps.categorySuggester = suggester;
    const res = await executor.update('user-1', 'act-1', { category: '', title: 'Boliche' });
    expect(suggester.suggest).toHaveBeenCalledWith('user-1', 'Boliche');
    expect(res.card.status).toBe('ready');
    expect((pending.rows[0].payload as { fields: Record<string, unknown> }).fields.category).toBe('Lazer');
  });

  it('categoria informada pelo usuário não chama a IA', async () => {
    const suggester = { suggest: jest.fn() };
    const { executor } = await setup();
    (executor as unknown as { deps: { categorySuggester: unknown } }).deps.categorySuggester = suggester;
    await executor.update('user-1', 'act-1', { title: 'Outro' });
    expect(suggester.suggest).not.toHaveBeenCalled();
  });

  it('descarta chaves não permitidas (userId, id)', async () => {
    const { executor, pending } = await setup();
    await executor.update('user-1', 'act-1', { userId: 'x', id: 'y', title: 'Novo' });
    const fields = (pending.rows[0].payload as { fields: Record<string, unknown> }).fields;
    expect(fields).not.toHaveProperty('userId');
    expect(fields).not.toHaveProperty('id');
    expect(fields.title).toBe('Novo');
  });

  it('mantém awaiting_pick enquanto não houver escolha', async () => {
    const { executor } = await setup([
      item({
        op: 'update',
        status: 'awaiting_pick',
        payload: { fields: { value: 10 } },
        candidates: [{ id: 'a', label: 'A', record: {} }],
      }),
    ]);
    const res = await executor.update('user-1', 'act-1', { value: 20 });
    expect(res.card.status).toBe('awaiting_pick');
  });

  it('remoção não tem campos editáveis', async () => {
    const { executor } = await setup([item({ op: 'delete', payload: { fields: {} }, targetId: 't' })]);
    await expect(executor.update('user-1', 'act-1', { value: 1 })).rejects.toBeInstanceOf(ActionInvalidError);
  });

  it('IDOR, expirada e já resolvida', async () => {
    const { executor, pending } = await setup();
    await expect(executor.update('user-2', 'act-1', { title: 'x' })).rejects.toBeInstanceOf(ActionNotFoundError);
    pending.rows[0].expiresAt = new Date(NOW.getTime() - 1);
    await expect(executor.update('user-1', 'act-1', { title: 'x' })).rejects.toBeInstanceOf(ActionExpiredError);
    expect(pending.rows[0].status).toBe('expired');
    pending.rows[0].status = 'confirmed';
    pending.rows[0].expiresAt = new Date(NOW.getTime() + 1000);
    await expect(executor.update('user-1', 'act-1', { title: 'x' })).rejects.toBeInstanceOf(ActionConflictError);
  });

  it('corpo que não é objeto é inválido', async () => {
    const { executor } = await setup();
    await expect(executor.update('user-1', 'act-1', [] as unknown as Record<string, unknown>)).rejects.toBeInstanceOf(
      ActionInvalidError,
    );
  });
});

describe('ActionExecutor.select', () => {
  const pick = () =>
    item({
      op: 'update',
      status: 'awaiting_pick',
      payload: { fields: { value: 150 } },
      candidates: [
        { id: 'tx-a', label: 'A', record: txRow({ id: 'tx-a' }) as never },
        { id: 'tx-b', label: 'B', record: txRow({ id: 'tx-b', value: 99 }) as never },
      ],
    });

  it('define o alvo, guarda o before, limpa as candidatas e fica ready', async () => {
    const { executor, pending } = await setup([pick()]);
    const res = await executor.select('user-1', 'act-1', 1);
    expect(res.card.status).toBe('ready');
    expect(res.card.candidates).toBeUndefined();
    expect(res.card.before?.length).toBeGreaterThan(0);
    expect(pending.rows[0].targetId).toBe('tx-b');
    expect(pending.rows[0].candidates).toBeNull();
    expect(JSON.stringify(res)).not.toContain('tx-b');
  });

  it('índice fora do intervalo é inválido', async () => {
    const { executor } = await setup([pick()]);
    await expect(executor.select('user-1', 'act-1', 2)).rejects.toBeInstanceOf(ActionInvalidError);
    await expect(executor.select('user-1', 'act-1', -1)).rejects.toBeInstanceOf(ActionInvalidError);
  });

  it('só vale para ações aguardando escolha', async () => {
    const { executor } = await setup();
    await expect(executor.select('user-1', 'act-1', 0)).rejects.toBeInstanceOf(ActionConflictError);
  });

  it('IDOR dá 404', async () => {
    const { executor } = await setup([pick()]);
    await expect(executor.select('user-2', 'act-1', 0)).rejects.toBeInstanceOf(ActionNotFoundError);
  });
});

describe('ActionExecutor.cancel / cancelQueue', () => {
  it('cancela uma ação aberta', async () => {
    const { executor, pending } = await setup();
    const res = await executor.cancel('user-1', 'act-1');
    expect(res.card.status).toBe('cancelled');
    expect(res.nextSteps.cancelled).toBe(1);
    expect(pending.rows[0].status).toBe('cancelled');
  });

  it('cancelar ação já resolvida dá 409; de outro usuário, 404', async () => {
    const { executor } = await setup();
    await expect(executor.cancel('user-2', 'act-1')).rejects.toBeInstanceOf(ActionNotFoundError);
    await executor.cancel('user-1', 'act-1');
    await expect(executor.cancel('user-1', 'act-1')).rejects.toBeInstanceOf(ActionConflictError);
  });

  it('cancelQueue cancela só as abertas e devolve os cards', async () => {
    const { executor, pending } = await setup([item(), item({ position: 2 }), item({ position: 3, status: 'confirmed' })]);
    const res = await executor.cancelQueue('user-1', 'q1');
    expect(res.cancelled).toBe(2);
    expect(res.cards.map((c) => c.status)).toEqual(['cancelled', 'cancelled', 'confirmed']);
    expect(res.nextSteps).toMatchObject({ total: 3, done: 1, cancelled: 2 });
    expect(pending.rows[2].status).toBe('confirmed');
  });

  it('fila inexistente ou de outro usuário dá 404', async () => {
    const { executor } = await setup();
    await expect(executor.cancelQueue('user-2', 'q1')).rejects.toBeInstanceOf(ActionNotFoundError);
    await expect(executor.cancelQueue('user-1', 'nope')).rejects.toBeInstanceOf(ActionNotFoundError);
  });
});

describe('ActionExecutor — corrida com confirmação em andamento (409)', () => {
  /** Faz a ação passar para `confirming` logo depois da leitura inicial (simula claim concorrente). */
  async function racing() {
    const ctx = await setup();
    const original = ctx.pending.getByIdForUser.bind(ctx.pending);
    let first = true;
    ctx.pending.getByIdForUser = async (id: string, userId: string) => {
      const record = await original(id, userId);
      if (first) {
        first = false;
        await ctx.pending.claimForConfirm(id, userId, NOW);
      }
      return record;
    };
    return ctx;
  }

  it('cancel durante a confirmação dá 409 e não altera o estado', async () => {
    const { executor, pending } = await racing();
    await expect(executor.cancel('user-1', 'act-1')).rejects.toBeInstanceOf(ActionConflictError);
    expect(pending.rows[0].status).toBe('confirming');
  });

  it('update durante a confirmação dá 409 e não reescreve o payload', async () => {
    const { executor, pending } = await racing();
    await expect(executor.update('user-1', 'act-1', { title: 'Outro' })).rejects.toBeInstanceOf(ActionConflictError);
    expect(pending.rows[0].status).toBe('confirming');
    expect(pending.rows[0].payload).toEqual(FULL_CREATE);
  });

  it('cancelar ação confirmada não a desfaz (repositório recusa)', async () => {
    const { pending } = await setup();
    await pending.claimForConfirm('act-1', 'user-1', NOW);
    await pending.updateStatus('act-1', 'user-1', 'confirmed', NOW);
    expect(await pending.updateStatus('act-1', 'user-1', 'cancelled', NOW)).toBe(false);
    expect(pending.rows[0].status).toBe('confirmed');
  });
});

describe('InMemoryPendingRepo.expireStale — confirming preso', () => {
  it('confirming com claim antigo (> 2 min) volta a failed; recente permanece', async () => {
    const { pending } = await setup([item(), item({ position: 2 })]);
    await pending.claimForConfirm('act-1', 'user-1', new Date(NOW.getTime() - 3 * 60_000));
    await pending.claimForConfirm('act-2', 'user-1', new Date(NOW.getTime() - 30_000));
    expect(await pending.expireStale('user-1', NOW)).toBe(1);
    expect(pending.rows.map((r) => r.status)).toEqual(['failed', 'confirming']);
  });
});
