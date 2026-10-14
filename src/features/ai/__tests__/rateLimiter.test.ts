import {
  FailSoftRateLimiter,
  InMemoryRateLimiter,
  UpstashRateLimiter,
  createRateLimiter,
} from '../rateLimiter';
import type { IRateLimiter } from '../types';

const LIMITS = { perMinute: 10, windowSeconds: 60, perDay: 50 };

describe('InMemoryRateLimiter', () => {
  const T0 = new Date('2026-10-15T15:00:10Z');

  it('permite 10 e bloqueia o 11º com retryAfter da janela', async () => {
    const rl = new InMemoryRateLimiter(LIMITS);
    for (let i = 0; i < 10; i++) {
      await expect(rl.consume('u1', T0)).resolves.toEqual({ allowed: true });
    }
    const r = await rl.consume('u1', T0);
    expect(r).toEqual({ allowed: false, scope: 'minute', retryAfterSeconds: 50 });
  });

  it('libera na janela seguinte', async () => {
    const rl = new InMemoryRateLimiter(LIMITS);
    for (let i = 0; i < 11; i++) await rl.consume('u1', T0);
    await expect(rl.consume('u1', new Date('2026-10-15T15:01:01Z'))).resolves.toEqual({ allowed: true });
  });

  it('isola usuários', async () => {
    const rl = new InMemoryRateLimiter({ ...LIMITS, perMinute: 1 });
    await rl.consume('u1', T0);
    expect((await rl.consume('u1', T0)).allowed).toBe(false);
    expect((await rl.consume('u2', T0)).allowed).toBe(true);
  });

  it('aplica teto diário, com retryAfter até a meia-noite BRT', async () => {
    const rl = new InMemoryRateLimiter({ perMinute: 100, windowSeconds: 60, perDay: 2 });
    // 22:00 BRT = 01:00Z do dia seguinte
    const now = new Date('2026-10-16T01:00:00Z');
    await rl.consume('u1', now);
    await rl.consume('u1', now);
    const r = await rl.consume('u1', now);
    expect(r).toEqual({ allowed: false, scope: 'day', retryAfterSeconds: 2 * 3600 });
  });

  it('o contador diário reinicia após a meia-noite BRT', async () => {
    const rl = new InMemoryRateLimiter({ perMinute: 100, windowSeconds: 60, perDay: 1 });
    await rl.consume('u1', new Date('2026-10-16T01:00:00Z'));
    expect((await rl.consume('u1', new Date('2026-10-16T01:30:00Z'))).allowed).toBe(false);
    // 00:10 BRT do dia seguinte = 03:10Z
    expect((await rl.consume('u1', new Date('2026-10-16T03:10:00Z'))).allowed).toBe(true);
  });

  it('varredura mantém o Map limitado', async () => {
    const rl = new InMemoryRateLimiter(LIMITS, { maxEntries: 50 });
    for (let i = 0; i < 200; i++) await rl.consume(`user-${i}`, T0);
    expect(rl.size).toBeLessThanOrEqual(50);
  });
});

describe('UpstashRateLimiter', () => {
  const NOW = new Date('2026-10-15T15:00:10Z');

  it('usa INCR e só chama EXPIRE quando o contador vira 1', async () => {
    const counts = new Map<string, number>();
    const client = {
      incr: jest.fn(async (k: string) => {
        const n = (counts.get(k) ?? 0) + 1;
        counts.set(k, n);
        return n;
      }),
      expire: jest.fn(async () => 1),
    };
    const rl = new UpstashRateLimiter(client, LIMITS);
    await rl.consume('u1', NOW);
    await rl.consume('u1', NOW);
    // 2 chaves (dia e minuto) x 2 chamadas
    expect(client.incr).toHaveBeenCalledTimes(4);
    expect(client.expire).toHaveBeenCalledTimes(2);
    const keys = client.incr.mock.calls.map((c) => c[0]);
    expect(keys.some((k) => k.startsWith('ai:rl:minute:u1:'))).toBe(true);
    expect(keys.some((k) => k.startsWith('ai:rl:day:u1:2026-10-15'))).toBe(true);
  });

  it('bloqueia quando o contador excede o limite', async () => {
    const client = { incr: jest.fn(async () => 11), expire: jest.fn(async () => 1) };
    const rl = new UpstashRateLimiter(client, { perMinute: 10, windowSeconds: 60, perDay: 100 });
    const r = await rl.consume('u1', NOW);
    expect(r).toMatchObject({ allowed: false, scope: 'minute' });
  });
});

describe('FailSoftRateLimiter', () => {
  it('cai para o fallback quando o primário lança, logando só o nome', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const primary: IRateLimiter = {
      consume: jest.fn().mockRejectedValue(Object.assign(new Error('SEGREDO_REDIS'), { name: 'UpstashError' })),
    };
    const fallback: IRateLimiter = { consume: jest.fn().mockResolvedValue({ allowed: true }) };
    const rl = new FailSoftRateLimiter(primary, fallback);
    await expect(rl.consume('u1')).resolves.toEqual({ allowed: true });
    expect(fallback.consume).toHaveBeenCalled();
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).toContain('UpstashError');
    expect(logged).not.toContain('SEGREDO_REDIS');
    spy.mockRestore();
  });
});

describe('createRateLimiter', () => {
  it('sem env do Upstash usa memória e não lança', async () => {
    const rl = createRateLimiter({});
    await expect(rl.consume('u1')).resolves.toEqual({ allowed: true });
  });

  it('com env do Upstash constrói sem rede e sem lançar', () => {
    expect(() =>
      createRateLimiter({ UPSTASH_REDIS_REST_URL: 'https://example.invalid', UPSTASH_REDIS_REST_TOKEN: 'tok' }),
    ).not.toThrow();
  });
});
