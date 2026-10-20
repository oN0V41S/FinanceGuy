import { renderHook, act, waitFor } from '@testing-library/react';
import { useAssistant } from '../useAssistant';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('useAssistant', () => {
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    if (typeof global.fetch !== 'function') {
      global.fetch = jest.fn() as unknown as typeof fetch;
    }
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('começa em idle', () => {
    const { result } = renderHook(() => useAssistant());
    expect(result.current.status).toBe('idle');
    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('vai de loading para success e envia apenas a pergunta', async () => {
    let resolve!: (r: Response) => void;
    fetchSpy.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    const { result } = renderHook(() => useAssistant());

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.ask('Quanto gastei?');
    });
    expect(result.current.status).toBe('loading');

    await act(async () => {
      resolve(jsonResponse({ answer: 'Você gastou R$ 10,00', truncated: false }));
      await pending;
    });

    expect(result.current.status).toBe('success');
    expect(result.current.messages).toEqual([
      expect.objectContaining({ role: 'user', content: 'Quanto gastei?' }),
      expect.objectContaining({ role: 'assistant', content: 'Você gastou R$ 10,00', truncated: false }),
    ]);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/ai/ask');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ question: 'Quanto gastei?' });
  });

  it('propaga truncated', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ answer: 'Parcial', truncated: true }));
    const { result } = renderHook(() => useAssistant());
    await act(async () => {
      await result.current.ask('oi');
    });
    expect(result.current.messages[1]).toMatchObject({ role: 'assistant', truncated: true });
  });

  it('mostra a mensagem de erro do servidor', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ error: 'O assistente está com alta demanda. Tente novamente em instantes.' }, 503),
    );
    const { result } = renderHook(() => useAssistant());
    await act(async () => {
      await result.current.ask('oi');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe(
      'O assistente está com alta demanda. Tente novamente em instantes.',
    );
    expect(result.current.messages).toEqual(expect.not.arrayContaining([expect.objectContaining({ role: 'assistant' })]));
  });

  it('mostra a mensagem do servidor em 429', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({ error: 'Você fez muitas perguntas em pouco tempo. Tente novamente em alguns segundos.' }, 429),
    );
    const { result } = renderHook(() => useAssistant());
    await act(async () => {
      await result.current.ask('oi');
    });
    expect(result.current.error).toMatch(/muitas perguntas/);
  });

  it('usa mensagem padrão quando o corpo de erro é inválido', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('bad json');
      },
    } as unknown as Response);
    const { result } = renderHook(() => useAssistant());
    await act(async () => {
      await result.current.ask('oi');
    });
    expect(result.current.error).toBe('Não foi possível obter a resposta. Tente novamente.');
  });

  it('trata falha de rede com mensagem amigável', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useAssistant());
    await act(async () => {
      await result.current.ask('oi');
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Não foi possível obter a resposta. Tente novamente.');
  });

  it('trata resposta 200 sem answer como erro', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({}));
    const { result } = renderHook(() => useAssistant());
    await act(async () => {
      await result.current.ask('oi');
    });
    expect(result.current.status).toBe('error');
  });

  it('impede duplo envio enquanto carrega', async () => {
    fetchSpy.mockReturnValue(new Promise<Response>(() => {}));
    const { result } = renderHook(() => useAssistant());
    act(() => {
      void result.current.ask('um');
      void result.current.ask('dois');
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('aborta a requisição após ~65s e mostra erro amigável', async () => {
    jest.useFakeTimers();
    try {
      fetchSpy.mockImplementation(
        (_url, init) =>
          new Promise<Response>((_res, rej) => {
            init?.signal?.addEventListener('abort', () => rej(new DOMException('Aborted', 'AbortError')));
          }),
      );
      const { result } = renderHook(() => useAssistant());
      act(() => {
        void result.current.ask('oi');
      });
      await act(async () => {
        jest.advanceTimersByTime(65_000);
      });
      await waitFor(() => expect(result.current.status).toBe('error'));
      expect(result.current.error).toBe('Não foi possível obter a resposta. Tente novamente.');
    } finally {
      jest.useRealTimers();
    }
  });

  it('aborta a requisição ao desmontar', () => {
    let signal: AbortSignal | undefined;
    fetchSpy.mockImplementation((_url, init) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>(() => {});
    });
    const { result, unmount } = renderHook(() => useAssistant());
    act(() => {
      void result.current.ask('oi');
    });
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('reset volta para idle e permite novo envio', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ answer: 'ok', truncated: false }));
    const { result } = renderHook(() => useAssistant());
    await act(async () => {
      await result.current.ask('oi');
    });
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.messages).toEqual([]);
    await act(async () => {
      await result.current.ask('de novo');
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe('useAssistant — histórico', () => {
  it('acumula perguntas e respostas na ordem, com ids únicos', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ answer: 'R1', truncated: false }))
      .mockResolvedValueOnce(jsonResponse({ answer: 'R2', truncated: false }));
    const { result } = renderHook(() => useAssistant());
    await act(async () => {
      await result.current.ask('P1');
    });
    await act(async () => {
      await result.current.ask('P2');
    });
    expect(result.current.messages.map((m) => `${m.role}:${m.content}`)).toEqual([
      'user:P1',
      'assistant:R1',
      'user:P2',
      'assistant:R2',
    ]);
    expect(new Set(result.current.messages.map((m) => m.id)).size).toBe(4);
    // a API do MVP recebe só a pergunta atual
    expect(JSON.parse(fetchSpy.mock.calls[1][1]?.body as string)).toEqual({ question: 'P2' });
    fetchSpy.mockRestore();
  });

  it('mantém a pergunta na conversa quando a resposta falha', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('x'));
    const { result } = renderHook(() => useAssistant());
    await act(async () => {
      await result.current.ask('P1');
    });
    expect(result.current.messages).toEqual([expect.objectContaining({ role: 'user', content: 'P1' })]);
    expect(result.current.status).toBe('error');
    fetchSpy.mockRestore();
  });

  describe('FING-18: sessão e ações', () => {
    let fetchSpy: jest.SpiedFunction<typeof fetch>;
    beforeEach(() => {
      fetchSpy = jest.spyOn(global, 'fetch');
    });
    afterEach(() => fetchSpy.mockRestore());

    const card = {
      id: 'c1', queueId: 'q1', position: 0, entity: 'transaction', op: 'create', status: 'ready',
      destructive: false, fields: [], missingFields: [], expiresAt: '2030-01-01T00:00:00.000Z',
    };
    const nextSteps = { total: 1, done: 0, failed: 0, cancelled: 0, canConfirmAll: false };

    it('hydrate carrega mensagens da sessão e reutiliza o sessionId no ask', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ sessionId: 's1', messages: [{ id: 'a', role: 'user', content: 'antigo' }], tokenCount: 3 }),
      );
      const { result } = renderHook(() => useAssistant());
      await act(async () => {
        await result.current.hydrate();
      });
      expect(fetchSpy.mock.calls[0][0]).toBe('/api/ai/session');
      expect(result.current.messages).toEqual([{ id: 'a', role: 'user', content: 'antigo' }]);
      expect(result.current.isHydrating).toBe(false);

      fetchSpy.mockResolvedValueOnce(jsonResponse({ answer: 'ok', truncated: false }));
      await act(async () => {
        await result.current.ask('oi');
      });
      expect(JSON.parse(fetchSpy.mock.calls[1][1]?.body as string)).toEqual({ question: 'oi', sessionId: 's1' });
    });

    it('hydrate com falha define erro calmo e não quebra', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      const { result } = renderHook(() => useAssistant());
      await act(async () => {
        await result.current.hydrate();
      });
      expect(result.current.error).toMatch(/carregar a conversa anterior/);
      expect(result.current.messages).toEqual([]);
    });

    it('hydrate não sobrescreve mensagens se o usuário já perguntou', async () => {
      let resolveSession!: (r: Response) => void;
      fetchSpy.mockReturnValueOnce(new Promise<Response>((r) => (resolveSession = r)));
      const { result } = renderHook(() => useAssistant());
      let hydrating!: Promise<void>;
      act(() => {
        hydrating = result.current.hydrate();
      });
      fetchSpy.mockResolvedValueOnce(jsonResponse({ answer: 'resp', truncated: false }));
      await act(async () => {
        await result.current.ask('nova');
      });
      await act(async () => {
        resolveSession(jsonResponse({ sessionId: 's1', messages: [{ id: 'z', role: 'user', content: 'velho' }], tokenCount: 1 }));
        await hydrating;
      });
      expect(result.current.messages.map((m) => m.content)).toEqual(['nova', 'resp']);
    });

    it('ask com kind=actions cria mensagem action_cards', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ answer: 'Revise', truncated: false, kind: 'actions', sessionId: 's9', queueId: 'q1', actions: [card], nextSteps }),
      );
      const { result } = renderHook(() => useAssistant());
      await act(async () => {
        await result.current.ask('Registre um gasto');
      });
      expect(result.current.status).toBe('success');
      expect(result.current.messages[1]).toMatchObject({
        role: 'assistant', kind: 'action_cards', queueId: 'q1', actions: [card], nextSteps, content: 'Revise',
      });
    });

    it('newConversation chama POST, troca a sessão e limpa mensagens', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ answer: 'a', truncated: false }));
      const { result } = renderHook(() => useAssistant());
      await act(async () => {
        await result.current.ask('q');
      });
      fetchSpy.mockResolvedValueOnce(jsonResponse({ sessionId: 's2', messages: [], tokenCount: 0 }));
      await act(async () => {
        await result.current.newConversation();
      });
      expect(fetchSpy.mock.calls[1][1]?.method).toBe('POST');
      expect(result.current.messages).toEqual([]);
      expect(result.current.status).toBe('idle');

      fetchSpy.mockResolvedValueOnce(jsonResponse({ answer: 'b', truncated: false }));
      await act(async () => {
        await result.current.ask('q2');
      });
      expect(JSON.parse(fetchSpy.mock.calls[2][1]?.body as string)).toEqual({ question: 'q2', sessionId: 's2' });
    });

    it('newConversation com falha mantém mensagens e define erro', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ answer: 'a', truncated: false }));
      const { result } = renderHook(() => useAssistant());
      await act(async () => {
        await result.current.ask('q');
      });
      fetchSpy.mockResolvedValueOnce(jsonResponse({ error: 'x' }, 500));
      await act(async () => {
        await result.current.newConversation();
      });
      expect(result.current.error).toMatch(/conversa atual foi mantida/);
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.isStartingNew).toBe(false);
    });

    it('openConversation troca de sessão, carrega mensagens e aborta requisição em andamento', async () => {
      let signal: AbortSignal | undefined;
      fetchSpy.mockImplementationOnce((_url, init) => {
        signal = init?.signal ?? undefined;
        return new Promise<Response>(() => {});
      });
      const { result } = renderHook(() => useAssistant());
      act(() => {
        void result.current.ask('pendente');
      });
      fetchSpy.mockResolvedValueOnce(
        jsonResponse({ sessionId: 's5', messages: [{ id: 'm', role: 'user', content: 'outra' }], tokenCount: 1 }),
      );
      await act(async () => {
        await result.current.openConversation('s5');
      });
      expect(fetchSpy.mock.calls[1][0]).toBe('/api/ai/sessions/s5/activate');
      expect(signal?.aborted).toBe(true);
      expect(result.current.sessionId).toBe('s5');
      expect(result.current.messages).toEqual([{ id: 'm', role: 'user', content: 'outra' }]);
      expect(result.current.status).toBe('idle');

      // inFlight foi liberado: novo ask é enviado
      fetchSpy.mockResolvedValueOnce(jsonResponse({ answer: 'ok', truncated: false }));
      await act(async () => {
        await result.current.ask('seguinte');
      });
      expect(JSON.parse(fetchSpy.mock.calls[2][1]?.body as string)).toEqual({ question: 'seguinte', sessionId: 's5' });
    });

    it('openConversation com falha mantém a conversa atual e define erro', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ answer: 'a', truncated: false }));
      const { result } = renderHook(() => useAssistant());
      await act(async () => {
        await result.current.ask('q');
      });
      fetchSpy.mockResolvedValueOnce(jsonResponse({ error: 'x' }, 500));
      await act(async () => {
        await result.current.openConversation('s7');
      });
      expect(result.current.error).toMatch(/Sua conversa atual foi mantida/);
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.isStartingNew).toBe(false);

      fetchSpy.mockResolvedValueOnce(jsonResponse({ nope: true }));
      await act(async () => {
        await result.current.openConversation('s8');
      });
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.error).toMatch(/Sua conversa atual foi mantida/);
    });

    it('openConversation ignora o id da sessão atual', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse({ sessionId: 's1', messages: [], tokenCount: 0 }));
      const { result } = renderHook(() => useAssistant());
      await act(async () => {
        await result.current.hydrate();
      });
      await act(async () => {
        await result.current.openConversation('s1');
      });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('expõe a API de ações', () => {
      const { result } = renderHook(() => useAssistant());
      expect(typeof result.current.actions.confirm).toBe('function');
    });
  });
});
