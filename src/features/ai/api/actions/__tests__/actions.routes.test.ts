/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import {
  ActionConflictError,
  ActionExpiredError,
  ActionInvalidError,
  ActionNotFoundError,
} from '../../../agent/errors';

const mockExec = {
  update: jest.fn(),
  select: jest.fn(),
  cancel: jest.fn(),
  confirm: jest.fn(),
  cancelQueue: jest.fn(),
};
const mockSession = { getSessionDto: jest.fn(), startNew: jest.fn() };

jest.mock('@/core/container', () => ({
  aiActionExecutor: {
    update: (...a: unknown[]) => mockExec.update(...a),
    select: (...a: unknown[]) => mockExec.select(...a),
    cancel: (...a: unknown[]) => mockExec.cancel(...a),
    confirm: (...a: unknown[]) => mockExec.confirm(...a),
    cancelQueue: (...a: unknown[]) => mockExec.cancelQueue(...a),
  },
  aiSessionService: {
    getSessionDto: (...a: unknown[]) => mockSession.getSessionDto(...a),
    startNew: (...a: unknown[]) => mockSession.startNew(...a),
  },
}));

import { PATCH } from '../update.route';
import { POST as SELECT } from '../select.route';
import { POST as CANCEL } from '../cancel.route';
import { POST as CONFIRM } from '../confirm.route';
import { POST as CANCEL_QUEUE } from '../cancelQueue.route';
import { GET as SESSION_GET, POST as SESSION_POST } from '../../session.route';

const H = { 'x-user-id': 'user-1' };

function req(method: string, body?: unknown, headers: Record<string, string> = H, raw?: string) {
  return new NextRequest('http://localhost/api/ai/x', {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const CARD = { card: { id: 'a1' }, nextSteps: { total: 1 } };

beforeEach(() => {
  jest.clearAllMocks();
  mockExec.update.mockResolvedValue(CARD);
  mockExec.select.mockResolvedValue(CARD);
  mockExec.cancel.mockResolvedValue(CARD);
  mockExec.confirm.mockResolvedValue({ results: [], nextSteps: { total: 0 } });
  mockExec.cancelQueue.mockResolvedValue({ cancelled: 1, cards: [], nextSteps: { total: 0 } });
});

describe('formatos de resposta', () => {
  it('PATCH, select e cancel devolvem {card, nextSteps}', async () => {
    for (const res of [
      await PATCH(req('PATCH', { fields: { value: 1 } }), ctx('a1')),
      await SELECT(req('POST', { index: 0 }), ctx('a1')),
      await CANCEL(req('POST'), ctx('a1')),
    ]) {
      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toBe('no-store');
      expect(await res.json()).toEqual(CARD);
    }
  });

  it('confirm devolve {results, nextSteps}; cancelQueue devolve {cards, nextSteps}', async () => {
    const c = await CONFIRM(req('POST', { ids: ['a1'] }));
    expect(Object.keys(await c.json()).sort()).toEqual(['nextSteps', 'results']);
    const q = await CANCEL_QUEUE(req('POST', { queueId: 'q1' }));
    const body = await q.json();
    expect(body.cards).toEqual([]);
    expect(body.nextSteps).toBeDefined();
  });
});

describe('userId só vem do header', () => {
  it('ignora userId no corpo e usa o header', async () => {
    await PATCH(req('PATCH', { fields: { value: 1 }, userId: 'attacker' }), ctx('a1'));
    expect(mockExec.update).toHaveBeenCalledWith('user-1', 'a1', { value: 1 });
    await CONFIRM(req('POST', { ids: ['a1'], userId: 'attacker' }));
    expect(mockExec.confirm).toHaveBeenCalledWith('user-1', ['a1']);
    await CANCEL_QUEUE(req('POST', { queueId: 'q1', userId: 'attacker' }));
    expect(mockExec.cancelQueue).toHaveBeenCalledWith('user-1', 'q1');
    await SELECT(req('POST', { index: 2 }), ctx('a1'));
    expect(mockExec.select).toHaveBeenCalledWith('user-1', 'a1', 2);
    await CANCEL(req('POST'), ctx('a1'));
    expect(mockExec.cancel).toHaveBeenCalledWith('user-1', 'a1');
  });

  it('sem header dá 401 e não chama o executor', async () => {
    const none = {};
    const responses = [
      await PATCH(req('PATCH', { fields: {} }, none), ctx('a1')),
      await SELECT(req('POST', { index: 0 }, none), ctx('a1')),
      await CANCEL(req('POST', undefined, none), ctx('a1')),
      await CONFIRM(req('POST', { ids: ['a'] }, none)),
      await CANCEL_QUEUE(req('POST', { queueId: 'q' }, none)),
      await SESSION_GET(req('GET', undefined, none)),
      await SESSION_POST(req('POST', undefined, none)),
    ];
    expect(responses.map((r) => r.status)).toEqual(Array(7).fill(401));
    Object.values(mockExec).forEach((m) => expect(m).not.toHaveBeenCalled());
    expect(mockSession.getSessionDto).not.toHaveBeenCalled();
  });
});

describe('validação do corpo', () => {
  it.each([
    ['PATCH vazio', () => PATCH(req('PATCH', undefined), ctx('a1'))],
    ['PATCH JSON inválido', () => PATCH(req('PATCH', undefined, H, '{x'), ctx('a1'))],
    ['PATCH campo de tipo inválido', () => PATCH(req('PATCH', { fields: { a: { b: 1 } } }), ctx('a1'))],
    ['select índice negativo', () => SELECT(req('POST', { index: -1 }), ctx('a1'))],
    ['select índice > 4', () => SELECT(req('POST', { index: 5 }), ctx('a1'))],
    ['select índice string', () => SELECT(req('POST', { index: '1' }), ctx('a1'))],
    ['confirm sem ids', () => CONFIRM(req('POST', { ids: [] }))],
    ['confirm > 5 ids', () => CONFIRM(req('POST', { ids: ['1', '2', '3', '4', '5', '6'] }))],
    ['cancelQueue sem queueId', () => CANCEL_QUEUE(req('POST', {}))],
    ['corpo gigante', () => CONFIRM(req('POST', undefined, H, JSON.stringify({ ids: ['x'.repeat(5000)] })))],
  ])('%s dá 400', async (_n, run) => {
    const res = await run();
    expect(res.status).toBe(400);
    expect(typeof (await res.json()).error).toBe('string');
    Object.values(mockExec).forEach((m) => expect(m).not.toHaveBeenCalled());
  });

  it('id de rota inválido dá 404', async () => {
    expect((await PATCH(req('PATCH', { fields: {} }), ctx(''))).status).toBe(404);
    expect((await SELECT(req('POST', { index: 0 }), ctx('x'.repeat(65)))).status).toBe(404);
    expect((await CANCEL(req('POST'), ctx(''))).status).toBe(404);
  });
});

describe('mapeamento de erros', () => {
  it.each([
    [new ActionNotFoundError(), 404],
    [new ActionConflictError(), 409],
    [new ActionExpiredError(), 410],
    [new ActionInvalidError(), 400],
    [new Error('SEGREDO interno'), 500],
  ])('%p vira %i sem vazar detalhes', async (error, status) => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockExec.cancel.mockRejectedValue(error);
    mockExec.confirm.mockRejectedValue(error);
    const a = await CANCEL(req('POST'), ctx('a1'));
    const b = await CONFIRM(req('POST', { ids: ['a1'] }));
    spy.mockRestore();
    expect(a.status).toBe(status);
    expect(b.status).toBe(status);
    expect(JSON.stringify(await a.json())).not.toContain('SEGREDO');
  });
});

describe('sessão', () => {
  it('GET hidrata a sessão do usuário do header', async () => {
    mockSession.getSessionDto.mockResolvedValue({ sessionId: 's1', messages: [] });
    const res = await SESSION_GET(req('GET'));
    expect(await res.json()).toEqual({ sessionId: 's1', messages: [] });
    expect(mockSession.getSessionDto).toHaveBeenCalledWith('user-1');
  });

  it('POST arquiva e devolve a nova sessão', async () => {
    mockSession.startNew.mockResolvedValue(undefined);
    mockSession.getSessionDto.mockResolvedValue({ sessionId: 's2', messages: [] });
    const res = await SESSION_POST(req('POST'));
    expect(mockSession.startNew).toHaveBeenCalledWith('user-1');
    expect((await res.json()).sessionId).toBe('s2');
  });

  it('falhas viram resposta de erro sem vazar a mensagem', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSession.getSessionDto.mockRejectedValue(new Error('SEGREDO'));
    const res = await SESSION_GET(req('GET'));
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('SEGREDO');
  });
});
