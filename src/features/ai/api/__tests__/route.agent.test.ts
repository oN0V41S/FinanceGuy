/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const mockConsume = jest.fn();
const mockAsk = jest.fn();
const mockPropose = jest.fn();
const mockRecord = jest.fn();

jest.mock('@/core/container', () => ({
  aiRateLimiter: { consume: (...a: unknown[]) => mockConsume(...a) },
  aiService: { ask: (...a: unknown[]) => mockAsk(...a) },
  aiAgent: {
    propose: (...a: unknown[]) => mockPropose(...a),
    recordTurn: (...a: unknown[]) => mockRecord(...a),
  },
}));

import { POST } from '../route';

function req(body: unknown, headers: Record<string, string> = { 'x-user-id': 'user-1' }) {
  return new NextRequest('http://localhost/api/ai/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/ai/ask com o agente de escrita', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsume.mockResolvedValue({ allowed: true });
    mockAsk.mockResolvedValue({ answer: 'Resposta', truncated: false });
    mockPropose.mockResolvedValue(null);
    mockRecord.mockResolvedValue(undefined);
  });

  it('devolve a proposta do agente sem consumir cota nem chamar a leitura', async () => {
    const proposal = { kind: 'actions', sessionId: 's1', queueId: 'q1', cards: [], nextSteps: { total: 0 } };
    mockPropose.mockResolvedValue(proposal);
    const res = await POST(req({ question: 'registre uma despesa', sessionId: 's1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(proposal);
    expect(mockPropose).toHaveBeenCalledWith('user-1', 'registre uma despesa', 's1');
    expect(mockConsume).not.toHaveBeenCalled();
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('userId do corpo é ignorado pelo agente', async () => {
    await POST(req({ question: 'oi', userId: 'attacker' }));
    expect(mockPropose).toHaveBeenCalledWith('user-1', 'oi', undefined);
  });

  it('pergunta de leitura cai no fluxo normal e registra o turno com kind answer', async () => {
    mockRecord.mockResolvedValue('s9');
    const res = await POST(req({ question: 'quanto gastei?' }));
    expect(await res.json()).toEqual({ answer: 'Resposta', truncated: false, kind: 'answer', sessionId: 's9' });
    expect(mockConsume).toHaveBeenCalledWith('user-1');
    expect(mockRecord).toHaveBeenCalledWith('user-1', undefined, 'quanto gastei?', { answer: 'Resposta', truncated: false });
  });

  it('sem sessão registrada mantém o formato legado', async () => {
    const res = await POST(req({ question: 'quanto gastei?' }));
    expect(await res.json()).toEqual({ answer: 'Resposta', truncated: false });
  });

  it('cota esgotada na leitura dá 429', async () => {
    mockConsume.mockResolvedValue({ allowed: false, scope: 'minute', retryAfterSeconds: 7 });
    const res = await POST(req({ question: 'quanto gastei?' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('7');
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('erro do agente é traduzido (cota do LLM de escrita = 429)', async () => {
    const { AiRateLimitedError } = await import('../../errors');
    mockPropose.mockRejectedValue(new AiRateLimitedError('minute', 5));
    const res = await POST(req({ question: 'registre uma despesa' }));
    expect(res.status).toBe(429);
  });

  it('401 sem header e 400 sem pergunta, sem acionar o agente', async () => {
    expect((await POST(req({ question: 'x' }, {}))).status).toBe(401);
    expect((await POST(req({ question: '  ' }))).status).toBe(400);
    expect(mockPropose).not.toHaveBeenCalled();
  });
});
