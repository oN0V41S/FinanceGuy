import { getAiConfig } from '../config';

describe('getAiConfig', () => {
  it('usa defaults sem env e não lança', () => {
    expect(getAiConfig({})).toEqual({
      apiKey: null,
      model: 'gemini-3.8-flash',
      fallbackModels: ['gemini-3.7-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
      timeoutMs: 20000,
      maxOutputTokens: 2048,
      rateLimitPerMinute: 10,
      rateLimitWindowSeconds: 60,
      rateLimitPerDay: 50,
    });
  });

  it('lê valores da env', () => {
    const c = getAiConfig({
      GEMINI_API_KEY: ' k ',
      GEMINI_MODEL: 'm',
      GEMINI_FALLBACK_MODELS: ' a , b,,m ',
      AI_REQUEST_TIMEOUT_MS: '5000',
      AI_MAX_OUTPUT_TOKENS: '100',
      AI_RATE_LIMIT_PER_MINUTE: '2',
      AI_RATE_LIMIT_WINDOW_SECONDS: '30',
      AI_RATE_LIMIT_PER_DAY: '7',
    });
    expect(c).toEqual({
      apiKey: 'k',
      model: 'm',
      fallbackModels: ['a', 'b'],
      timeoutMs: 5000,
      maxOutputTokens: 100,
      rateLimitPerMinute: 2,
      rateLimitWindowSeconds: 30,
      rateLimitPerDay: 7,
    });
  });

  it('valores inválidos caem no default e chave vazia vira null', () => {
    const c = getAiConfig({ GEMINI_API_KEY: '  ', AI_REQUEST_TIMEOUT_MS: 'abc', AI_RATE_LIMIT_PER_DAY: '-3' });
    expect(c.apiKey).toBeNull();
    expect(c.timeoutMs).toBe(20000);
    expect(c.rateLimitPerDay).toBe(50);
  });
});

describe('getAgentConfig', () => {
  const { getAgentConfig } = jest.requireActual('../config') as typeof import('../config');

  it('usa defaults 10/5/20/80000/60/10 sem env', () => {
    expect(getAgentConfig({})).toEqual({
      actionTtlMinutes: 10,
      maxQueue: 5,
      maxPending: 20,
      compactTokens: 80000,
      contextCacheTtlSeconds: 60,
      sessionKeepMessages: 10,
    });
  });

  it('lê da env e cai no default quando inválido', () => {
    const c = getAgentConfig({
      AI_ACTION_TTL_MINUTES: '3',
      AI_MAX_QUEUE: 'abc',
      AI_MAX_PENDING: '-1',
      AI_COMPACT_TOKENS: '1000',
      AI_CONTEXT_CACHE_TTL_SECONDS: '0',
      AI_SESSION_KEEP_MESSAGES: '4',
    });
    expect(c).toEqual({
      actionTtlMinutes: 3,
      maxQueue: 5,
      maxPending: 20,
      compactTokens: 1000,
      contextCacheTtlSeconds: 60,
      sessionKeepMessages: 4,
    });
  });
});
