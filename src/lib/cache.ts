import { Redis } from '@upstash/redis';
import { ICacheRepository } from '@/shared/interfaces/ICacheRepository';

/**
 * Subconjunto do cliente Redis usado pelo cache.
 *
 * ALINHADO com o contrato real do SDK @upstash/redis (v1.38.2):
 * `set<TData>(key, value, opts?: SetCommandOptions)` — o TTL é passado como
 * OPÇÃO `{ ex: number }`, NUNCA como número posicional (que o SDK não aceita
 * e lançaria TypeError em produção no primeiro MISS).
 */
interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts: { ex: number }): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
}

/** Cliente Upstash real (`UPSTASH_REDIS_REST_URL` presente). */
class UpstashCacheRepository implements ICacheRepository {
  constructor(private readonly client: CacheClient) {}

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? Number(process.env.CACHE_TTL ?? 300);
    // Contrato do SDK: TTL como OPÇÃO ({ ex }), não posicional.
    await this.client.set(key, value, { ex: ttl });
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);

    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}

/**
 * Fallback NOOP (sem `UPSTASH_REDIS_REST_URL`): `get` resolve null e
 * `set`/`del`/`delByPattern` são no-op — graceful degradation em ambientes
 * sem Redis (dev/CI). O cliente Redis NÃO é instanciado.
 */
class NoopCacheRepository implements ICacheRepository {
  async get(_key: string): Promise<string | null> {
    return null;
  }

  async set(_key: string, _value: string, _ttlSeconds?: number): Promise<void> {}

  async del(_key: string): Promise<void> {}

  async delByPattern(_pattern: string): Promise<void> {}
}

const cacheClient: CacheClient | null =
  process.env.UPSTASH_REDIS_REST_URL
    ? (new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL as string,
        token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
      }) as CacheClient)
    : null;

// Singleton do módulo (padrão prisma.ts): instanciado uma única vez por
// processo a partir das variáveis de ambiente no load do módulo.
export const cache: ICacheRepository = cacheClient
  ? new UpstashCacheRepository(cacheClient)
  : new NoopCacheRepository();