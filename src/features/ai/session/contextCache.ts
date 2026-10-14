import { resolveQuestionPeriod } from '../questionPeriod';
import type { AgentConfig, FinancialContextDto, FinancialContextSource } from '../types';
import type { IContextCache } from './ISession.service';

const DEFAULT_TTL_SECONDS = 60;
const DEFAULT_MAX_ENTRIES = 1000;

const cacheKey = (userId: string): string => `ai:ctx:${userId}`;

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

function parseDto(raw: unknown): FinancialContextDto | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as FinancialContextDto) : null;
    } catch {
      return null;
    }
  }
  return typeof raw === 'object' ? (raw as FinancialContextDto) : null;
}

// ── Memória (fallback; por instância) ──

export class InMemoryContextCache implements IContextCache {
  private readonly entries = new Map<string, { dto: FinancialContextDto; expiresAt: number }>();

  constructor(
    private readonly ttlSeconds: number,
    private readonly clock: () => number = Date.now,
    private readonly maxEntries: number = DEFAULT_MAX_ENTRIES,
  ) {}

  async get(userId: string): Promise<FinancialContextDto | null> {
    const entry = this.entries.get(cacheKey(userId));
    if (!entry) return null;
    if (entry.expiresAt <= this.clock()) {
      this.entries.delete(cacheKey(userId));
      return null;
    }
    return entry.dto;
  }

  async set(userId: string, dto: FinancialContextDto): Promise<void> {
    const key = cacheKey(userId);
    this.entries.delete(key);
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
    this.entries.set(key, { dto, expiresAt: this.clock() + this.ttlSeconds * 1000 });
  }

  async invalidate(userId: string): Promise<void> {
    this.entries.delete(cacheKey(userId));
  }
}

// ── Upstash ──

export interface RedisContextClient {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, options: { ex: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export class UpstashContextCache implements IContextCache {
  constructor(
    private readonly client: RedisContextClient,
    private readonly ttlSeconds: number,
  ) {}

  async get(userId: string): Promise<FinancialContextDto | null> {
    return parseDto(await this.client.get(cacheKey(userId)));
  }

  async set(userId: string, dto: FinancialContextDto): Promise<void> {
    await this.client.set(cacheKey(userId), dto, { ex: this.ttlSeconds });
  }

  async invalidate(userId: string): Promise<void> {
    await this.client.del(cacheKey(userId));
  }
}

/** Qualquer erro do cache vira miss/no-op: o cache é otimização, nunca pode derrubar a conversa. */
class FailSoftContextCache implements IContextCache {
  constructor(
    private readonly primary: IContextCache,
    private readonly fallback: IContextCache,
  ) {}

  async get(userId: string): Promise<FinancialContextDto | null> {
    try {
      return await this.primary.get(userId);
    } catch (error) {
      console.error('[ai.contextCache] get falhou, tratando como miss', { name: errorName(error) });
      return this.fallback.get(userId).catch(() => null);
    }
  }

  async set(userId: string, dto: FinancialContextDto): Promise<void> {
    try {
      await this.primary.set(userId, dto);
    } catch (error) {
      console.error('[ai.contextCache] set falhou, ignorando', { name: errorName(error) });
      await this.fallback.set(userId, dto).catch(() => undefined);
    }
  }

  async invalidate(userId: string): Promise<void> {
    // Limpa os dois: o fallback pode ter guardado entradas durante uma falha do Redis.
    await this.fallback.invalidate(userId).catch(() => undefined);
    try {
      await this.primary.invalidate(userId);
    } catch (error) {
      console.error('[ai.contextCache] invalidate falhou, ignorando', { name: errorName(error) });
    }
  }
}

type EnvSource = Record<string, string | undefined>;

/** Nunca lança e não faz rede na construção (cliente Redis carregado sob demanda). */
export function createContextCache(
  config: Pick<AgentConfig, 'contextCacheTtlSeconds'>,
  env: EnvSource = process.env,
): IContextCache {
  const ttl =
    Number.isFinite(config.contextCacheTtlSeconds) && config.contextCacheTtlSeconds > 0
      ? Math.floor(config.contextCacheTtlSeconds)
      : DEFAULT_TTL_SECONDS;
  const memory = new InMemoryContextCache(ttl);

  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return new FailSoftContextCache(memory, new InMemoryContextCache(ttl));

  let clientPromise: Promise<RedisContextClient> | null = null;
  const getClient = (): Promise<RedisContextClient> => {
    clientPromise ??= import('@upstash/redis').then(({ Redis }) => new Redis({ url, token }));
    return clientPromise;
  };
  const lazy: RedisContextClient = {
    get: async (key) => (await getClient()).get(key),
    set: async (key, value, options) => (await getClient()).set(key, value, options),
    del: async (key) => (await getClient()).del(key),
  };

  return new FailSoftContextCache(new UpstashContextCache(lazy, ttl), memory);
}

/**
 * Decora uma FinancialContextSource com cache por usuário.
 *
 * Design seguro: o DTO depende do período citado na pergunta (`resolveQuestionPeriod`), e a chave
 * do IContextCache é só `ai:ctx:{userId}`. Por isso só se cacheia quando NENHUM período foi
 * detectado (janela padrão, idêntica para qualquer pergunta). Perguntas com recorte vão direto à
 * fonte, sem ler nem gravar o cache; assim um recorte nunca é servido a outra pergunta.
 * `invalidate(userId)` apaga a única chave do usuário.
 */
export function withContextCache(
  source: FinancialContextSource,
  cache: IContextCache,
  now: () => Date = () => new Date(),
): FinancialContextSource {
  return {
    async getContext(userId: string, question: string): Promise<FinancialContextDto> {
      if (resolveQuestionPeriod(question, now()) !== null) {
        return source.getContext(userId, question);
      }

      const cached = await cache.get(userId).catch(() => null);
      if (cached) return cached;

      const dto = await source.getContext(userId, question);
      await cache.set(userId, dto).catch(() => undefined);
      return dto;
    },
  };
}
