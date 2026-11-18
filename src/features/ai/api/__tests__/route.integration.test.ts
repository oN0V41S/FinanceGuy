/**
 * @jest-environment node
 *
 * AC5: AiService + GeminiLlmProvider reais, com cliente Gemini fake e serviços
 * de dados fake, passando pela rota real. Zero rede.
 */
import { NextRequest } from 'next/server';
import { AiService } from '../../ai.service';
import { GeminiLlmProvider } from '../../gemini.provider';
import { InMemoryRateLimiter } from '../../rateLimiter';

const generateContent = jest.fn();

const provider = new GeminiLlmProvider({
  getConfig: () => ({
    apiKey: 'KEY_SENTINELA',
    model: 'm',
    timeoutMs: 1000,
    maxOutputTokens: 100,
    rateLimitPerMinute: 2,
    rateLimitWindowSeconds: 60,
    rateLimitPerDay: 50,
  }),
  clientFactory: () => ({ models: { generateContent } }),
});

const today = '2026-10-05';

const service = new AiService({
  transactions: {
    getAllTransactions: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'ID_SENTINELA',
          type: 'expense',
          title: 'Padaria',
          description: 'DESCRICAO_SENTINELA',
          value: 50,
          date: today,
          category: 'Alimentação',
          responsible: 'RESPONSAVEL_SENTINELA',
          paid: true,
        },
      ],
      fromCache: false,
    }),
  },
  goals: { getAllGoals: jest.fn().mockResolvedValue([]) },
  investments: { getAllInvestments: jest.fn().mockResolvedValue([]) },
  categories: { findAll: jest.fn().mockResolvedValue([]) },
  llm: provider,
  now: () => new Date('2026-10-15T15:00:00Z'),
});

const limiter = new InMemoryRateLimiter({ perMinute: 2, windowSeconds: 60, perDay: 50 });

jest.mock('@/core/container', () => ({
  get aiRateLimiter() {
    return limiter;
  },
  get aiService() {
    return service;
  },
}));

import { POST } from '../route';

const req = (question: string, userId = 'u-int') =>
  new NextRequest('http://localhost/api/ai/ask', {
    method: 'POST',
    headers: { 'x-user-id': userId, 'content-type': 'application/json' },
    body: JSON.stringify({ question }),
  });

describe('POST /api/ai/ask (integração com Gemini fake)', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    generateContent.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('rede proibida nos testes'));
  });
  afterEach(() => jest.restoreAllMocks());

  it('caminho feliz: payload limpo enviado ao Gemini e resposta devolvida', async () => {
    generateContent.mockResolvedValue({ text: 'Você gastou R$ 50,00.', candidates: [{ finishReason: 'STOP' }] });
    const res = await POST(req('Quanto gastei?', 'u-ok'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answer: 'Você gastou R$ 50,00.', truncated: false });

    const sent = JSON.stringify(generateContent.mock.calls[0][0]);
    expect(sent).toContain('Padaria');
    expect(sent).toContain('Quanto gastei?');
    for (const s of ['SENTINELA', 'u-ok']) expect(sent).not.toContain(s.replace('KEY_', ''));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('timeout do Gemini vira 504 amigável', async () => {
    generateContent.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const res = await POST(req('oi', 'u-timeout'));
    expect(res.status).toBe(504);
    expect((await res.json()).error).toBe('O assistente demorou para responder. Tente novamente.');
  });

  it('429 do Gemini vira 503 com Retry-After', async () => {
    generateContent.mockRejectedValue(Object.assign(new Error('quota'), { name: 'ApiError', status: 429 }));
    const res = await POST(req('oi', 'u-busy'));
    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBe('30');
  });

  it('rate limit real bloqueia a 3ª pergunta', async () => {
    generateContent.mockResolvedValue({ text: 'ok', candidates: [{ finishReason: 'STOP' }] });
    expect((await POST(req('1', 'u-rl'))).status).toBe(200);
    expect((await POST(req('2', 'u-rl'))).status).toBe(200);
    const blocked = await POST(req('3', 'u-rl'));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).not.toBeNull();
  });
});
