/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import {
  AiBusyError,
  AiConnectionError,
  AiContextLoadError,
  AiRateLimitedError,
  AiRefusalError,
  AiTimeoutError,
  AiUnavailableError,
  AiUpstreamError,
} from '../../errors';

const mockConsume = jest.fn();
const mockAsk = jest.fn();

jest.mock('@/core/container', () => ({
  aiRateLimiter: { consume: (...args: unknown[]) => mockConsume(...args) },
  aiService: { ask: (...args: unknown[]) => mockAsk(...args) },
}));

import { POST } from '../route';

function makeRequest(body: unknown, headers: Record<string, string> = { 'x-user-id': 'user-1' }, raw = false) {
  return new NextRequest('http://localhost/api/ai/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : raw ? (body as string) : JSON.stringify(body),
  });
}

describe('POST /api/ai/ask', () => {
  let errSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsume.mockResolvedValue({ allowed: true });
    mockAsk.mockResolvedValue({ answer: 'Resposta', truncated: false });
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => errSpy.mockRestore());

  it('401 sem x-user-id', async () => {
    const res = await POST(makeRequest({ question: 'oi' }, {}));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Usuário não identificado' });
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it.each([
    ['JSON inválido', '{nao-json', true],
    ['corpo ausente', undefined, false],
  ])('400 para %s', async (_n, body, raw) => {
    const res = await POST(makeRequest(body, undefined, raw as boolean));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Corpo da requisição inválido.');
  });

  it('400 para corpo maior que 4 KB', async () => {
    const res = await POST(makeRequest({ question: 'a', pad: 'x'.repeat(5000) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Corpo da requisição inválido.');
  });

  it.each([
    [{ question: 123 }, 'Digite uma pergunta'],
    [{}, 'Digite uma pergunta'],
    [{ question: '   ' }, 'Digite uma pergunta'],
    [{ question: 'a'.repeat(501) }, 'A pergunta deve ter no máximo 500 caracteres'],
  ])('400 para pergunta inválida %#', async (body, message) => {
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(message);
  });

  it('requisição inválida não consome cota', async () => {
    await POST(makeRequest({ question: '' }));
    expect(mockConsume).not.toHaveBeenCalled();
  });

  it('429 com Retry-After por minuto e por dia', async () => {
    mockConsume.mockResolvedValueOnce({ allowed: false, scope: 'minute', retryAfterSeconds: 42 });
    const a = await POST(makeRequest({ question: 'oi' }));
    expect(a.status).toBe(429);
    expect(a.headers.get('Retry-After')).toBe('42');
    expect((await a.json()).error).toBe('Você fez muitas perguntas em pouco tempo. Tente novamente em alguns segundos.');

    mockConsume.mockResolvedValueOnce({ allowed: false, scope: 'day', retryAfterSeconds: 3600 });
    const b = await POST(makeRequest({ question: 'oi' }));
    expect(b.status).toBe(429);
    expect(b.headers.get('Retry-After')).toBe('3600');
    expect((await b.json()).error).toBe('Você atingiu o limite diário de perguntas do assistente. Volte amanhã.');
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('200 com Cache-Control no-store', async () => {
    const res = await POST(makeRequest({ question: '  Quanto gastei?  ' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ answer: 'Resposta', truncated: false });
    expect(mockConsume).toHaveBeenCalledWith('user-1');
    expect(mockAsk).toHaveBeenCalledWith('user-1', 'Quanto gastei?', { history: [], profile: '' });
  });

  it('repassa truncated', async () => {
    mockAsk.mockResolvedValue({ answer: 'parcial', truncated: true });
    const res = await POST(makeRequest({ question: 'oi' }));
    expect((await res.json()).truncated).toBe(true);
  });

  it('ignora userId enviado no corpo', async () => {
    await POST(makeRequest({ question: 'oi', userId: 'atacante' }));
    expect(mockConsume).toHaveBeenCalledWith('user-1');
    expect(mockAsk).toHaveBeenCalledWith('user-1', 'oi', { history: [], profile: '' });
  });

  it.each([
    [new AiUnavailableError(), 503, 'O assistente está indisponível no momento.', undefined],
    [new AiBusyError(), 503, 'O assistente está com alta demanda. Tente novamente em instantes.', '30'],
    [new AiConnectionError(), 503, 'Não foi possível falar com o assistente agora. Tente novamente.', undefined],
    [new AiTimeoutError(), 504, 'O assistente demorou para responder. Tente novamente.', undefined],
    [new AiUpstreamError(), 502, 'Não consegui concluir a resposta. Tente uma pergunta mais específica.', undefined],
    [new AiRefusalError(), 422, 'Não consegui responder a essa pergunta. Tente reformulá-la.', undefined],
    [new AiContextLoadError(), 500, 'Não foi possível carregar seus dados financeiros agora.', undefined],
  ])('mapeia %p para HTTP', async (error, status, message, retryAfter) => {
    mockAsk.mockRejectedValue(error);
    const res = await POST(makeRequest({ question: 'oi' }));
    expect(res.status).toBe(status);
    expect((await res.json()).error).toBe(message);
    expect(res.headers.get('Retry-After')).toBe(retryAfter ?? null);
  });

  it('AiRateLimitedError vindo do service também vira 429', async () => {
    mockAsk.mockRejectedValue(new AiRateLimitedError('minute', 9));
    const res = await POST(makeRequest({ question: 'oi' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('9');
  });

  it('erro desconhecido vira 500 genérico sem vazar a mensagem', async () => {
    mockAsk.mockRejectedValue(new Error('SEGREDO_INTERNO postgres://x'));
    const res = await POST(makeRequest({ question: 'oi' }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Erro interno do servidor' });
    expect(JSON.stringify(errSpy.mock.calls)).not.toContain('SEGREDO_INTERNO');
  });

  it('falha no rate limiter não derruba a rota com vazamento', async () => {
    mockConsume.mockRejectedValue(new Error('SEGREDO_INTERNO'));
    const res = await POST(makeRequest({ question: 'oi' }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('SEGREDO_INTERNO');
  });
});
