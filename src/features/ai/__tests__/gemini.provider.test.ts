import { GeminiLlmProvider } from '../gemini.provider';
import type { AiConfig } from '../types';
import {
  AiBusyError,
  AiConnectionError,
  AiRefusalError,
  AiTimeoutError,
  AiUnavailableError,
  AiUpstreamError,
} from '../errors';

const CONFIG: AiConfig = {
  apiKey: 'KEY_SENTINELA',
  model: 'modelo-teste',
  timeoutMs: 1234,
  maxOutputTokens: 321,
  rateLimitPerMinute: 10,
  rateLimitWindowSeconds: 60,
  rateLimitPerDay: 50,
};

const REQUEST = {
  system: 'SYSTEM_PROMPT',
  messages: [{ role: 'user' as const, content: 'PROMPT_SENTINELA' }],
};

const apiError = (status: number, message = 'MENSAGEM_SENTINELA') =>
  Object.assign(new Error(message), { name: 'ApiError', status });

function setup(response: unknown, configOverride: Partial<AiConfig> = {}) {
  const generateContent = jest.fn();
  if (response instanceof Error) generateContent.mockRejectedValue(response);
  else generateContent.mockResolvedValue(response);
  const clientFactory = jest.fn(() => ({ models: { generateContent } }));
  const provider = new GeminiLlmProvider({ getConfig: () => ({ ...CONFIG, ...configOverride }), clientFactory });
  return { provider, generateContent, clientFactory };
}

const okResponse = (over: Record<string, unknown> = {}) => ({
  text: 'Resposta',
  candidates: [{ finishReason: 'STOP' }],
  usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
  ...over,
});

describe('GeminiLlmProvider', () => {
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('construir sem env/chave não lança nem chama a factory', () => {
    const clientFactory = jest.fn();
    expect(() => new GeminiLlmProvider({ getConfig: () => ({ ...CONFIG, apiKey: null }), clientFactory })).not.toThrow();
    expect(clientFactory).not.toHaveBeenCalled();
  });

  it('sem chave: AiUnavailableError antes de instanciar o SDK', async () => {
    const { provider, clientFactory } = setup(okResponse(), { apiKey: null });
    await expect(provider.complete(REQUEST)).rejects.toBeInstanceOf(AiUnavailableError);
    expect(clientFactory).not.toHaveBeenCalled();
  });

  it('monta a requisição com modelo da config, systemInstruction, timeout e limite de tokens', async () => {
    const { provider, generateContent, clientFactory } = setup(okResponse());
    await provider.complete({
      system: 'SYS',
      messages: [
        { role: 'user', content: 'a' },
        { role: 'assistant', content: 'b' },
      ],
    });
    expect(clientFactory).toHaveBeenCalledWith('KEY_SENTINELA');
    const params = generateContent.mock.calls[0][0];
    expect(params.model).toBe('modelo-teste');
    expect(params.contents).toEqual([
      { role: 'user', parts: [{ text: 'a' }] },
      { role: 'model', parts: [{ text: 'b' }] },
    ]);
    expect(params.config.systemInstruction).toBe('SYS');
    expect(params.config.maxOutputTokens).toBe(321);
    expect(params.config.httpOptions.timeout).toBe(1234);
    expect(params.config.httpOptions.retryOptions.attempts).toBeLessThanOrEqual(2);
    expect(params.config.abortSignal).toBeInstanceOf(AbortSignal);
    expect(params.config.thinkingConfig).toBeDefined();
  });

  describe('fallback de modelos', () => {
    const chain = { fallbackModels: ['m2', 'm3'] };

    function setupChain(results: unknown[]) {
      const generateContent = jest.fn();
      for (const r of results) {
        if (r instanceof Error) generateContent.mockRejectedValueOnce(r);
        else generateContent.mockResolvedValueOnce(r);
      }
      const provider = new GeminiLlmProvider({
        getConfig: () => ({ ...CONFIG, ...chain }),
        clientFactory: () => ({ models: { generateContent } }),
      });
      return { provider, generateContent };
    }

    it('503 no principal tenta o próximo modelo e retorna a resposta', async () => {
      const { provider, generateContent } = setupChain([apiError(503), okResponse()]);
      await expect(provider.complete(REQUEST)).resolves.toMatchObject({ text: 'Resposta' });
      expect(generateContent.mock.calls.map((c) => c[0].model)).toEqual(['modelo-teste', 'm2']);
    });

    it('429, 404 e timeout também avançam na cadeia', async () => {
      const timeout = Object.assign(new Error('x'), { name: 'TimeoutError' });
      const { provider, generateContent } = setupChain([apiError(429), apiError(404), okResponse()]);
      await expect(provider.complete(REQUEST)).resolves.toMatchObject({ text: 'Resposta' });
      expect(generateContent).toHaveBeenCalledTimes(3);
      const t = setupChain([timeout, okResponse()]);
      await expect(t.provider.complete(REQUEST)).resolves.toMatchObject({ text: 'Resposta' });
    });

    it('todos indisponíveis: lança AiBusyError após percorrer a cadeia', async () => {
      const { provider, generateContent } = setupChain([apiError(503), apiError(503), apiError(503)]);
      await expect(provider.complete(REQUEST)).rejects.toBeInstanceOf(AiBusyError);
      expect(generateContent).toHaveBeenCalledTimes(3);
    });

    it('chave inválida (401/403) e erro de rede não usam fallback', async () => {
      for (const err of [apiError(401), apiError(403), Object.assign(new TypeError('fetch failed'))]) {
        const { provider, generateContent } = setupChain([err, okResponse()]);
        await expect(provider.complete(REQUEST)).rejects.toBeDefined();
        expect(generateContent).toHaveBeenCalledTimes(1);
      }
    });

    it('bloqueio de segurança da resposta não usa fallback', async () => {
      const { provider, generateContent } = setupChain([okResponse({ text: undefined, promptFeedback: { blockReason: 'SAFETY' } })]);
      await expect(provider.complete(REQUEST)).rejects.toBeInstanceOf(AiRefusalError);
      expect(generateContent).toHaveBeenCalledTimes(1);
    });
  });

  it('reutiliza o cliente entre chamadas', async () => {
    const { provider, clientFactory } = setup(okResponse());
    await provider.complete(REQUEST);
    await provider.complete(REQUEST);
    expect(clientFactory).toHaveBeenCalledTimes(1);
  });

  it('retorna texto, stopReason e uso', async () => {
    const { provider } = setup(okResponse());
    await expect(provider.complete(REQUEST)).resolves.toEqual({
      text: 'Resposta',
      stopReason: 'stop',
      usage: { inputTokens: 10, outputTokens: 5 },
    });
  });

  it('MAX_TOKENS com texto retorna max_tokens', async () => {
    const { provider } = setup(okResponse({ candidates: [{ finishReason: 'MAX_TOKENS' }] }));
    await expect(provider.complete(REQUEST)).resolves.toMatchObject({ text: 'Resposta', stopReason: 'max_tokens' });
  });

  it('MAX_TOKENS sem texto e texto indefinido viram AiUpstreamError', async () => {
    const a = setup(okResponse({ text: undefined, candidates: [{ finishReason: 'MAX_TOKENS' }] }));
    await expect(a.provider.complete(REQUEST)).rejects.toBeInstanceOf(AiUpstreamError);
    const b = setup(okResponse({ text: '   ' }));
    await expect(b.provider.complete(REQUEST)).rejects.toBeInstanceOf(AiUpstreamError);
  });

  it('bloqueio de prompt e finishReason de segurança viram AiRefusalError', async () => {
    const a = setup(okResponse({ text: undefined, promptFeedback: { blockReason: 'SAFETY' } }));
    await expect(a.provider.complete(REQUEST)).rejects.toBeInstanceOf(AiRefusalError);
    for (const finishReason of ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII']) {
      const s = setup(okResponse({ text: undefined, candidates: [{ finishReason }] }));
      await expect(s.provider.complete(REQUEST)).rejects.toBeInstanceOf(AiRefusalError);
    }
  });

  it.each([
    [429, AiBusyError],
    [503, AiBusyError],
    [400, AiUnavailableError],
    [401, AiUnavailableError],
    [403, AiUnavailableError],
    [404, AiUnavailableError],
    [504, AiTimeoutError],
    [500, AiUpstreamError],
    [502, AiUpstreamError],
  ])('ApiError %i é mapeado para o erro de domínio', async (status, ErrorClass) => {
    const { provider } = setup(apiError(status));
    await expect(provider.complete(REQUEST)).rejects.toBeInstanceOf(ErrorClass);
  });

  it('abort/timeout viram AiTimeoutError', async () => {
    const abort = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
    const timeout = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    await expect(setup(abort).provider.complete(REQUEST)).rejects.toBeInstanceOf(AiTimeoutError);
    await expect(setup(timeout).provider.complete(REQUEST)).rejects.toBeInstanceOf(AiTimeoutError);
  });

  it('falha de rede vira AiConnectionError', async () => {
    const net = new TypeError('fetch failed');
    await expect(setup(net).provider.complete(REQUEST)).rejects.toBeInstanceOf(AiConnectionError);
    const refused = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    await expect(setup(refused).provider.complete(REQUEST)).rejects.toBeInstanceOf(AiConnectionError);
  });

  it('erro desconhecido vira AiUpstreamError', async () => {
    await expect(setup(new Error('boom')).provider.complete(REQUEST)).rejects.toBeInstanceOf(AiUpstreamError);
  });

  it('logs nunca contêm prompt, chave ou message do erro', async () => {
    await expect(setup(apiError(500)).provider.complete(REQUEST)).rejects.toBeInstanceOf(AiUpstreamError);
    const logged = JSON.stringify([...errorSpy.mock.calls, ...warnSpy.mock.calls]);
    expect(logged).not.toContain('PROMPT_SENTINELA');
    expect(logged).not.toContain('KEY_SENTINELA');
    expect(logged).not.toContain('MENSAGEM_SENTINELA');
    expect(logged).toContain('ApiError');
  });
});
