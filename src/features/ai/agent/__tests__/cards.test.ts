import {
  computeNextSteps,
  effectiveStatus,
  readBefore,
  readCandidates,
  readFields,
  summarizeCards,
  toCard,
} from '../cards';
import { createTransactionAdapter } from '../entityAdapters/transaction';
import { InMemoryPendingRepo, makeTxService, NOW, txRow } from '../../__fixtures__/agentFakes';
import type { NewPendingAction, PendingActionRecord } from '../repositories/IPendingAction.repository';

const adapters = { transaction: createTransactionAdapter(makeTxService()) };
const FIELDS = { type: 'expense', title: 'Mercado', value: 50, category: 'Alimentação', date: '2026-10-14', responsible: 'Ana', paid: true };

async function records(items: Partial<NewPendingAction>[]): Promise<PendingActionRecord[]> {
  const repo = new InMemoryPendingRepo();
  await repo.createMany(
    items.map((o, i) => ({
      userId: 'user-1',
      sessionId: 's1',
      queueId: 'q1',
      position: i + 1,
      entity: 'transaction',
      op: 'create',
      payload: { fields: FIELDS },
      status: 'ready',
      expiresAt: new Date(NOW.getTime() + 60_000),
      ...o,
    })) as NewPendingAction[],
  );
  return repo.rows as unknown as PendingActionRecord[];
}

describe('readers', () => {
  it('toleram valores inesperados', () => {
    expect(readFields(null)).toEqual({});
    expect(readFields({ fields: 3 })).toEqual({});
    expect(readFields({ fields: { a: 1 } })).toEqual({ a: 1 });
    expect(readBefore([])).toBeNull();
    expect(readBefore({ a: 1 })).toEqual({ a: 1 });
    expect(readCandidates('x')).toEqual([]);
    expect(readCandidates([{ id: 1 }, { id: 'a', label: 'A' }, null])).toEqual([{ id: 'a', label: 'A', record: {} }]);
  });
});

describe('effectiveStatus', () => {
  it('ação aberta e vencida é expired; resolvida permanece', async () => {
    const [open, done] = await records([
      { expiresAt: new Date(NOW.getTime() - 1) },
      { status: 'confirmed', expiresAt: new Date(NOW.getTime() - 1) },
    ]);
    expect(effectiveStatus(open, NOW)).toBe('expired');
    expect(effectiveStatus(done, NOW)).toBe('confirmed');
  });
});

describe('toCard', () => {
  it('ready: tem descrição e não vaza ids/userId', async () => {
    const [r] = await records([{}]);
    const card = toCard(r, { adapters, now: NOW });
    expect(card.status).toBe('ready');
    expect(card.message).toBeTruthy();
    expect(card.destructive).toBe(false);
    expect(JSON.stringify(card)).not.toMatch(/user-1|targetId/);
  });

  it('needs_input: lista o que falta', async () => {
    const [r] = await records([{ status: 'needs_input', payload: { fields: { ...FIELDS, value: null } } as never }]);
    const card = toCard(r, { adapters, now: NOW });
    expect(card.missingFields.length).toBeGreaterThan(0);
    expect(card.message).toMatch(/^Falta informar/);
  });

  it('awaiting_pick: candidatas só com index e label (0-based)', async () => {
    const [r] = await records([
      {
        op: 'update',
        status: 'awaiting_pick',
        payload: { fields: { value: 1 } },
        candidates: [
          { id: 'secret-1', label: 'A', record: txRow() as never },
          { id: 'secret-2', label: 'B', record: txRow() as never },
        ],
      },
    ]);
    const card = toCard(r, { adapters, now: NOW });
    expect(card.candidates).toEqual([
      { index: 0, label: 'A' },
      { index: 1, label: 'B' },
    ]);
    expect(JSON.stringify(card)).not.toContain('secret');
  });

  it('delete é destrutivo e mostra o before', async () => {
    const [r] = await records([{ op: 'delete', payload: { fields: {} }, targetId: 'tx-1', before: txRow() as never }]);
    const card = toCard(r, { adapters, now: NOW });
    expect(card.destructive).toBe(true);
    expect(card.before?.length).toBeGreaterThan(0);
  });

  it('vencida vira expired com mensagem; mensagem explícita prevalece', async () => {
    const [r] = await records([{ expiresAt: new Date(NOW.getTime() - 1) }]);
    expect(toCard(r, { adapters, now: NOW })).toMatchObject({ status: 'expired' });
    expect(toCard(r, { adapters, now: NOW }).message).toMatch(/expirou/);
    expect(toCard(r, { adapters, now: NOW, message: 'oi' }).message).toBe('oi');
  });

  it('entidade sem adapter devolve card mínimo', async () => {
    const [r] = await records([{ entity: 'investment' }]);
    const card = toCard(r, { adapters, now: NOW, message: 'm' });
    expect(card).toMatchObject({ fields: [], missingFields: [], message: 'm' });
  });
});

describe('computeNextSteps', () => {
  it('conta estados e indica o próximo passo', async () => {
    const rs = await records([
      { status: 'confirmed' },
      { status: 'failed' },
      { status: 'cancelled' },
      { status: 'needs_input', payload: { fields: { ...FIELDS, value: null } } as never },
    ]);
    const n = computeNextSteps(rs, adapters, NOW);
    expect(n).toMatchObject({ total: 4, done: 1, failed: 1, cancelled: 1, canConfirmAll: false });
    expect(n.next).toMatch(/Falta informar/);
  });

  it('todas prontas permite confirmar tudo; vencida conta como cancelada', async () => {
    const rs = await records([{}, {}]);
    const n = computeNextSteps(rs, adapters, NOW);
    expect(n.canConfirmAll).toBe(true);
    expect(n.next).toMatch(/^Confirmar:/);
    const exp = await records([{ expiresAt: new Date(NOW.getTime() - 1) }]);
    expect(computeNextSteps(exp, adapters, NOW)).toMatchObject({ cancelled: 1, canConfirmAll: false });
  });

  it('awaiting_pick pede escolha; fila vazia não confirma', async () => {
    const rs = await records([{ op: 'update', status: 'awaiting_pick', candidates: [] }]);
    expect(computeNextSteps(rs, adapters, NOW).next).toMatch(/Escolha/);
    expect(computeNextSteps([], adapters, NOW)).toMatchObject({ total: 0, canConfirmAll: false });
  });
});

describe('summarizeCards', () => {
  it('singular e plural, com sufixo por estado', async () => {
    const rs = await records([{}, { status: 'needs_input' }]);
    const cards = rs.map((r) => toCard(r, { adapters, now: NOW }));
    const text = summarizeCards(cards, adapters, rs);
    expect(text).toMatch(/^Preparei 2 ações/);
    expect(text).toContain('(aguardando confirmação)');
    expect(text).toContain('(faltam dados)');
    expect(summarizeCards([cards[0]], adapters, [rs[0]])).toMatch(/^Preparei 1 ação /);
  });

  it('awaiting_pick sugere escolher', async () => {
    const rs = await records([{ op: 'update', status: 'awaiting_pick', candidates: [] }]);
    const cards = rs.map((r) => toCard(r, { adapters, now: NOW }));
    expect(summarizeCards(cards, adapters, rs)).toContain('(escolha o item)');
  });
});
