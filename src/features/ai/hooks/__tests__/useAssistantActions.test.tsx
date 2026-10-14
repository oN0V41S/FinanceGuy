import { useState } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useAssistantActions, applyCardUpdates } from '../useAssistantActions';
import { makeCard, makeCardsMessage, makeNextSteps } from '@/features/ai/__fixtures__/actionCards';
import type { ActionCardDto, ChatMessage } from '@/features/ai/types';
import { clearCacheByPrefix } from '@/shared/hooks/useLocalStorageCache';

jest.mock('@/shared/hooks/useLocalStorageCache', () => ({
  ...jest.requireActual('@/shared/hooks/useLocalStorageCache'),
  clearCacheByPrefix: jest.fn(),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

const CACHE_PREFIX = 'financeguy:cache:transactions:';

function setup(cards: ActionCardDto[] = [makeCard({ id: 'a1' }), makeCard({ id: 'a2', position: 1 })]) {
  const initial: ChatMessage[] = [
    { id: 'u1', role: 'user', content: 'crie duas despesas' },
    makeCardsMessage(cards, { canConfirmAll: true }),
  ];
  return renderHook(() => {
    const [messages, setMessages] = useState<ChatMessage[]>(initial);
    const actions = useAssistantActions({ setMessages });
    return { messages, actions };
  });
}

function cardsOf(messages: ChatMessage[]): ActionCardDto[] {
  const message = messages.find((m) => m.kind === 'action_cards');
  return message && message.kind === 'action_cards' ? message.actions : [];
}

function nextStepsOf(messages: ChatMessage[]) {
  const message = messages.find((m) => m.kind === 'action_cards');
  return message && message.kind === 'action_cards' ? message.nextSteps : undefined;
}

describe('useAssistantActions', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    if (typeof global.fetch !== 'function') {
      global.fetch = jest.fn() as unknown as typeof fetch;
    }
    fetchSpy = jest.spyOn(global, 'fetch');
    (clearCacheByPrefix as jest.Mock).mockClear();
  });

  afterEach(() => fetchSpy.mockRestore());

  describe('confirm', () => {
    it('envia os ids, atualiza cards e próximos passos e invalida o cache de transações', async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({
          results: [
            { id: 'a1', status: 'confirmed', card: makeCard({ id: 'a1', status: 'confirmed' }) },
            { id: 'a2', status: 'confirmed', card: makeCard({ id: 'a2', status: 'confirmed', position: 1 }) },
          ],
          nextSteps: makeNextSteps({ total: 2, done: 2 }),
        }),
      );
      const { result } = setup();

      await act(async () => {
        await result.current.actions.confirm(['a1', 'a2']);
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/ai/actions/confirm',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ ids: ['a1', 'a2'] }) }),
      );
      expect(cardsOf(result.current.messages).map((c) => c.status)).toEqual(['confirmed', 'confirmed']);
      expect(nextStepsOf(result.current.messages)?.done).toBe(2);
      expect(clearCacheByPrefix).toHaveBeenCalledWith(CACHE_PREFIX);
      expect(result.current.actions.busyIds.size).toBe(0);
    });

    it('marca os cards como ocupados durante a requisição', async () => {
      let resolve!: (r: Response) => void;
      fetchSpy.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
      const { result } = setup();

      let pending!: Promise<void>;
      act(() => {
        pending = result.current.actions.confirm(['a1']);
      });
      expect(result.current.actions.busyIds.has('a1')).toBe(true);
      expect(result.current.actions.busyIds.has('a2')).toBe(false);

      await act(async () => {
        resolve(
          jsonResponse({
            results: [{ id: 'a1', status: 'confirmed', card: makeCard({ id: 'a1', status: 'confirmed' }) }],
            nextSteps: makeNextSteps({ total: 2, done: 1 }),
          }),
        );
        await pending;
      });
      expect(result.current.actions.busyIds.size).toBe(0);
    });

    it('ignora novo clique enquanto o mesmo card está em andamento', async () => {
      fetchSpy.mockReturnValue(new Promise<Response>(() => undefined));
      const { result } = setup();
      act(() => {
        void result.current.actions.confirm(['a1']);
      });
      await act(async () => {
        await result.current.actions.confirm(['a1']);
      });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('falha parcial: mostra o card que falhou e só invalida o cache se algo foi gravado', async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({
          results: [
            { id: 'a1', status: 'confirmed', card: makeCard({ id: 'a1', status: 'confirmed' }) },
            { id: 'a2', status: 'failed', message: 'Não deu certo.', card: makeCard({ id: 'a2', status: 'failed', message: 'Não deu certo.', position: 1 }) },
          ],
          nextSteps: makeNextSteps({ total: 2, done: 1, failed: 1 }),
        }),
      );
      const { result } = setup();
      await act(async () => {
        await result.current.actions.confirm(['a1', 'a2']);
      });
      expect(cardsOf(result.current.messages).map((c) => c.status)).toEqual(['confirmed', 'failed']);
      expect(nextStepsOf(result.current.messages)).toMatchObject({ done: 1, failed: 1 });
      expect(clearCacheByPrefix).toHaveBeenCalledTimes(1);
    });

    it('nada confirmado: não invalida o cache', async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({
          results: [{ id: 'a1', status: 'failed', card: makeCard({ id: 'a1', status: 'failed' }) }],
          nextSteps: makeNextSteps({ total: 2, failed: 1 }),
        }),
      );
      const { result } = setup();
      await act(async () => {
        await result.current.actions.confirm(['a1']);
      });
      expect(clearCacheByPrefix).not.toHaveBeenCalled();
    });

    it('falha de rede: erro inline, card intacto e nova tentativa possível', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      const { result } = setup();

      await act(async () => {
        await result.current.actions.confirm(['a1']);
      });
      expect(result.current.actions.errors.a1).toMatch(/conexão/i);
      expect(cardsOf(result.current.messages)[0].status).toBe('ready');
      expect(result.current.actions.busyIds.size).toBe(0);
      expect(clearCacheByPrefix).not.toHaveBeenCalled();

      fetchSpy.mockResolvedValueOnce(
        jsonResponse({
          results: [{ id: 'a1', status: 'confirmed', card: makeCard({ id: 'a1', status: 'confirmed' }) }],
          nextSteps: makeNextSteps({ total: 2, done: 1 }),
        }),
      );
      await act(async () => {
        await result.current.actions.confirm(['a1']);
      });
      expect(result.current.actions.errors.a1).toBeUndefined();
      expect(cardsOf(result.current.messages)[0].status).toBe('confirmed');
    });

    it.each([
      [409, 'Esta ação já foi resolvida.'],
      [410, 'Esta ação expirou.'],
    ])('HTTP %s mostra a mensagem do servidor para todos os ids', async (status, error) => {
      fetchSpy.mockResolvedValue(jsonResponse({ error }, status));
      const { result } = setup();
      await act(async () => {
        await result.current.actions.confirm(['a1', 'a2']);
      });
      expect(result.current.actions.errors.a1).toBe(error);
      expect(result.current.actions.errors.a2).toBe(error);
    });

    it('HTTP de erro sem corpo usa mensagem calma padrão', async () => {
      fetchSpy.mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('x'); } } as unknown as Response);
      const { result } = setup();
      await act(async () => {
        await result.current.actions.confirm(['a1']);
      });
      expect(result.current.actions.errors.a1).toMatch(/Tente novamente/);
    });

    it('resposta com formato inesperado vira erro inline', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ foo: 'bar' }));
      const { result } = setup();
      await act(async () => {
        await result.current.actions.confirm(['a1']);
      });
      expect(result.current.actions.errors.a1).toMatch(/Tente novamente/);
    });
  });

  describe('update', () => {
    it('PATCH com os campos, substitui o card e devolve true', async () => {
      const updated = makeCard({ id: 'a1', status: 'ready' });
      fetchSpy.mockResolvedValue(jsonResponse({ card: updated, nextSteps: makeNextSteps({ total: 2, canConfirmAll: true }) }));
      const { result } = setup([makeCard({ id: 'a1', status: 'needs_input' }), makeCard({ id: 'a2', position: 1 })]);

      let ok = false;
      await act(async () => {
        ok = await result.current.actions.update('a1', { value: 70 });
      });
      expect(ok).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/ai/actions/a1',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ fields: { value: 70 } }) }),
      );
      expect(cardsOf(result.current.messages)[0].status).toBe('ready');
      expect(nextStepsOf(result.current.messages)?.canConfirmAll).toBe(true);
      expect(clearCacheByPrefix).not.toHaveBeenCalled();
    });

    it('erro de validação do servidor devolve false e mostra a mensagem', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({ error: 'Valor deve ser positivo' }, 400));
      const { result } = setup();
      let ok = true;
      await act(async () => {
        ok = await result.current.actions.update('a1', { value: -1 });
      });
      expect(ok).toBe(false);
      expect(result.current.actions.errors.a1).toBe('Valor deve ser positivo');
    });

    it('falha de rede devolve false e mantém o card editável', async () => {
      fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));
      const { result } = setup();
      let ok = true;
      await act(async () => {
        ok = await result.current.actions.update('a1', { value: 5 });
      });
      expect(ok).toBe(false);
      expect(result.current.actions.errors.a1).toMatch(/conexão/i);
      expect(cardsOf(result.current.messages)[0].status).toBe('ready');
    });
  });

  describe('select', () => {
    it('POST com o índice e atualiza o card', async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({ card: makeCard({ id: 'a1', op: 'update', status: 'ready' }), nextSteps: makeNextSteps({ total: 2 }) }),
      );
      const { result } = setup([makeCard({ id: 'a1', op: 'update', status: 'awaiting_pick' }), makeCard({ id: 'a2', position: 1 })]);
      await act(async () => {
        await result.current.actions.select('a1', 1);
      });
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/ai/actions/a1/select',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ index: 1 }) }),
      );
      expect(cardsOf(result.current.messages)[0].status).toBe('ready');
    });
  });

  describe('cancel', () => {
    it('POST no cancel da ação e atualiza o card', async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({ card: makeCard({ id: 'a1', status: 'cancelled' }), nextSteps: makeNextSteps({ total: 2, cancelled: 1 }) }),
      );
      const { result } = setup();
      await act(async () => {
        await result.current.actions.cancel('a1');
      });
      expect(fetchSpy).toHaveBeenCalledWith('/api/ai/actions/a1/cancel', expect.objectContaining({ method: 'POST' }));
      expect(cardsOf(result.current.messages)[0].status).toBe('cancelled');
      expect(nextStepsOf(result.current.messages)?.cancelled).toBe(1);
      expect(clearCacheByPrefix).not.toHaveBeenCalled();
    });
  });

  describe('cancelQueue', () => {
    it('cancela os restantes da fila e atualiza os cards', async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({
          cards: [makeCard({ id: 'a1', status: 'cancelled' }), makeCard({ id: 'a2', status: 'cancelled', position: 1 })],
          nextSteps: makeNextSteps({ total: 2, cancelled: 2 }),
        }),
      );
      const { result } = setup();
      await act(async () => {
        await result.current.actions.cancelQueue('q1');
      });
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/ai/actions/cancel',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ queueId: 'q1' }) }),
      );
      expect(cardsOf(result.current.messages).map((c) => c.status)).toEqual(['cancelled', 'cancelled']);
    });

    it('falha de rede: erro da fila inline e cards intactos', async () => {
      fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));
      const { result } = setup();
      await act(async () => {
        await result.current.actions.cancelQueue('q1');
      });
      expect(result.current.actions.queueErrors.q1).toMatch(/conexão/i);
      expect(cardsOf(result.current.messages)[0].status).toBe('ready');
    });
  });
});

describe('applyCardUpdates', () => {
  it('só altera a mensagem que contém o card e preserva as demais', () => {
    const other = makeCardsMessage([makeCard({ id: 'z1', queueId: 'q9' })], {}, 'm9');
    const target = makeCardsMessage([makeCard({ id: 'a1' })], {}, 'm1');
    const text: ChatMessage = { id: 't', role: 'assistant', content: 'oi' };
    const next = applyCardUpdates(
      [text, other, target],
      [makeCard({ id: 'a1', status: 'confirmed' })],
      makeNextSteps({ done: 1 }),
    );
    expect(next[0]).toBe(text);
    expect(next[1]).toBe(other);
    expect(next[2]).not.toBe(target);
    expect(next[2].kind === 'action_cards' && next[2].actions[0].status).toBe('confirmed');
  });
});
