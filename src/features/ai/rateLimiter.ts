import { getAiConfig } from './config';
import type { IRateLimiter, RateLimitResult } from './types';

export interface RateLimits {
  perMinute: number;
  windowSeconds: number;
  perDay: number;
}

/** Armazena contadores de janela fixa. Retorna o valor APÓS incrementar. */
interface CounterStore {
  increment(key: string, ttlSeconds: number, nowMs: number): Promise<number>;
}

/** BRT = UTC-3 fixo (o Brasil não adota horário de verão desde 2019). */
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function brtDayInfo(nowMs: number): { dateKey: string; secondsUntilMidnight: number } {
  const shifted = nowMs - BRT_OFFSET_MS;
  const msIntoDay = ((shifted % DAY_MS) + DAY_MS) % DAY_MS;
  return {
    dateKey: new Date(shifted).toISOString().slice(0, 10),
    secondsUntilMidnight: Math.max(1, Math.ceil((DAY_MS - msIntoDay) / 1000)),
  };
}

/** Lógica comum: dia primeiro, depois minuto (janela fixa). Cada tentativa incrementa os contadores. */
abstract class CounterRateLimiter implements IRateLimiter {
  constructor(
    protected readonly store: CounterStore,
    protected readonly limits: RateLimits,
  ) {}

  async consume(userId: string, now: Date = new Date()): Promise<RateLimitResult> {
    const nowMs = now.getTime();
    const day = brtDayInfo(nowMs);

    const dayCount = await this.store.increment(`ai:rl:day:${userId}:${day.dateKey}`, day.secondsUntilMidnight + 3600, nowMs);
    if (dayCount > this.limits.perDay) {
      return { allowed: false, scope: 'day', retryAfterSeconds: day.secondsUntilMidnight };
    }

    const windowMs = this.limits.windowSeconds * 1000;
    const bucket = Math.floor(nowMs / windowMs);
    const minuteCount = await this.store.increment(`ai:rl:minute:${userId}:${bucket}`, this.limits.windowSeconds + 5, nowMs);
    if (minuteCount > this.limits.perMinute) {
      const retryAfterSeconds = Math.max(1, Math.ceil(((bucket + 1) * windowMs - nowMs) / 1000));
      return { allowed: false, scope: 'minute', retryAfterSeconds };
    }

    return { allowed: true };
  }
}

// ── Memória (fallback; por instância, best-effort em serverless) ──

class MemoryCounterStore implements CounterStore {
  private readonly entries = new Map<string, { count: number; expiresAt: number }>();

  constructor(private readonly maxEntries: number) {}

  get size(): number {
    return this.entries.size;
  }

  async increment(key: string, ttlSeconds: number, nowMs: number): Promise<number> {
    const current = this.entries.get(key);
    if (current && current.expiresAt > nowMs) {
      current.count += 1;
      return current.count;
    }

    if (this.entries.size >= this.maxEntries) this.sweep(nowMs);

    this.entries.set(key, { count: 1, expiresAt: nowMs + ttlSeconds * 1000 });
    return 1;
  }

  private sweep(nowMs: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= nowMs) this.entries.delete(key);
    }
    // Ainda cheio: descarta as mais antigas (ordem de inserção do Map).
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }
}

export class InMemoryRateLimiter extends CounterRateLimiter {
  private readonly memory: MemoryCounterStore;

  constructor(limits: RateLimits, options: { maxEntries?: number } = {}) {
    const memory = new MemoryCounterStore(options.maxEntries ?? 10000);
    super(memory, limits);
    this.memory = memory;
  }

  get size(): number {
    return this.memory.size;
  }
}

// ── Upstash (INCR + EXPIRE na primeira ocorrência) ──

export interface RedisCounterClient {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

class UpstashCounterStore implements CounterStore {
  constructor(private readonly client: RedisCounterClient) {}

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return count;
  }
}

export class UpstashRateLimiter extends CounterRateLimiter {
  constructor(client: RedisCounterClient, limits: RateLimits) {
    super(new UpstashCounterStore(client), limits);
  }
}

// ── Fail-soft: falha de infraestrutura nunca bloqueia o recurso ──

export class FailSoftRateLimiter implements IRateLimiter {
  constructor(
    private readonly primary: IRateLimiter,
    private readonly fallback: IRateLimiter,
  ) {}

  async consume(userId: string, now?: Date): Promise<RateLimitResult> {
    try {
      return await this.primary.consume(userId, now);
    } catch (error) {
      const name = error instanceof Error ? error.name : 'UnknownError';
      console.error('[ai.rateLimiter] Redis indisponível, usando limiter em memória', { name });
      return this.fallback.consume(userId, now);
    }
  }
}

type EnvSource = Record<string, string | undefined>;

/** Nunca lança e não faz rede na construção (o cliente Redis é lazy por requisição HTTP). */
export function createRateLimiter(env: EnvSource = process.env): IRateLimiter {
  const config = getAiConfig(env);
  const limits: RateLimits = {
    perMinute: config.rateLimitPerMinute,
    windowSeconds: config.rateLimitWindowSeconds,
    perDay: config.rateLimitPerDay,
  };
  const memory = new InMemoryRateLimiter(limits);

  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return memory;

  // Cliente Redis carregado sob demanda (1ª requisição): a construção não faz rede nem I/O.
  let clientPromise: Promise<RedisCounterClient> | null = null;
  const getClient = (): Promise<RedisCounterClient> => {
    clientPromise ??= import('@upstash/redis').then(({ Redis }) => new Redis({ url, token }));
    return clientPromise;
  };
  const lazyClient: RedisCounterClient = {
    incr: async (key) => (await getClient()).incr(key),
    expire: async (key, seconds) => (await getClient()).expire(key, seconds),
  };

  return new FailSoftRateLimiter(new UpstashRateLimiter(lazyClient, limits), memory);
}
