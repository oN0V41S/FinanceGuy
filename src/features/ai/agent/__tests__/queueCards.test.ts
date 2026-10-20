import { createQueueCardLookup } from '../queueCards';
import { createTransactionAdapter } from '../entityAdapters/transaction';
import { InMemoryPendingRepo, makeTxService, NOW } from '../../__fixtures__/agentFakes';
import type { NewPendingAction } from '../repositories/IPendingAction.repository';

const FIELDS = { type: 'expense', title: 'Mercado', value: 50, category: 'Alimentação', date: '2026-10-14', responsible: 'Ana', paid: true };
const adapters = { transaction: createTransactionAdapter(makeTxService()) };

function item(over: Partial<NewPendingAction> = {}): NewPendingAction {
  return {
    userId: 'user-1', sessionId: 's1', queueId: 'q1', position: 1, entity: 'transaction', op: 'create',
    payload: { fields: FIELDS }, status: 'ready', expiresAt: new Date(NOW.getTime() + 600_000), ...over,
  };
}

describe('createQueueCardLookup', () => {
  it('reflete o estado real: confirmada, cancelada e expirada (vencida mesmo sem expireStale)', async () => {
    const pending = new InMemoryPendingRepo();
    await pending.createMany([
      item({ queueId: 'qa', status: 'confirmed' }),
      item({ queueId: 'qb', status: 'cancelled' }),
      item({ queueId: 'qc', status: 'ready', expiresAt: new Date(NOW.getTime() - 1000) }),
    ]);
    const lookup = createQueueCardLookup({ pending, adapters, now: () => NOW });
    const states = await lookup('user-1', ['qa', 'qb', 'qc']);
    expect(states.get('qa')?.actions[0].status).toBe('confirmed');
    expect(states.get('qa')?.nextSteps).toMatchObject({ done: 1, canConfirmAll: false });
    expect(states.get('qb')?.actions[0].status).toBe('cancelled');
    expect(states.get('qc')?.actions[0].status).toBe('expired');
  });

  it('é escopado por usuário e ignora filas sem registros', async () => {
    const pending = new InMemoryPendingRepo();
    await pending.createMany([item({ userId: 'outro' })]);
    const states = await createQueueCardLookup({ pending, adapters, now: () => NOW })('user-1', ['q1', 'nada']);
    expect(states.size).toBe(0);
  });

  it('devolve confirming preso a failed antes de montar os cards', async () => {
    const pending = new InMemoryPendingRepo();
    await pending.createMany([item()]);
    await pending.claimForConfirm('act-1', 'user-1', new Date(NOW.getTime() - 5 * 60_000));
    const states = await createQueueCardLookup({ pending, adapters, now: () => NOW })('user-1', ['q1']);
    expect(states.get('q1')?.actions[0].status).toBe('failed');
    expect(states.get('q1')?.actions[0].message).toMatch(/Confira/);
  });

  it('falha no expireStale não impede a hidratação', async () => {
    const pending = new InMemoryPendingRepo();
    await pending.createMany([item()]);
    pending.expireStale = jest.fn().mockRejectedValue(new Error('db'));
    const states = await createQueueCardLookup({ pending, adapters, now: () => NOW })('user-1', ['q1']);
    expect(states.get('q1')?.actions[0].status).toBe('ready');
  });
});
