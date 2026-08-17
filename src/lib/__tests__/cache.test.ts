/**
 * @jest-environment node
 *
 * TDD — FASE RED (Issue #9 — cache server-side com Redis/Upstash)
 *
 * Contrato testado (src/lib/cache.ts — ainda NÃO implementado):
 * 1. Singleton do cliente Redis (padrão prisma.ts) que instancia `@upstash/redis`
 *    somente quando `UPSTASH_REDIS_REST_URL` está presente.
 * 2. FALLBACK NOOP: sem `UPSTASH_REDIS_REST_URL`, expõe um stub in-memory que
 *    retorna null no get e é no-op no set/del/delByPattern (graceful degradation).
 * 3. `set(key, value, ttlSeconds?)` aplica TTL padrão 300 quando `CACHE_TTL`
 *    está ausente (e `ttlSeconds` não é fornecido).
 * 4. `delByPattern(pattern)` resolve as chaves via `keys(pattern)` e deleta
 *    todas com `del(...keys)` — invalidação por padrão.
 *
 * Esperado nesta fase: TODOS os testes falham com
 * "Cannot find module '@/lib/cache'" (implementação ainda não existe).
 */
import { Redis } from '@upstash/redis';

// Instância única do cliente mockado — o factory do jest.mock é a ÚNICA
// implementação de @upstash/redis vista pelo módulo sob teste.
const mockRedisInstance = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  scan: jest.fn(),
};

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(() => mockRedisInstance),
}));

// Referência tipada do construtor mockado (sem `any` explícito)
const MockRedis = Redis as unknown as jest.Mock;

// Contrato do cache exposto por src/lib/cache.ts (equivale a ICacheRepository)
interface CacheLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPattern(pattern: string): Promise<void>;
}

describe('src/lib/cache — cliente Redis com fallback NOOP', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.CACHE_TTL;
    jest.restoreAllMocks();
  });

  describe('fallback NOOP (sem UPSTASH_REDIS_REST_URL)', () => {
    it('should resolve null on get without instantiating Redis when UPSTASH_REDIS_REST_URL is absent', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;

      const { cache }: { cache: CacheLike } = await jest.isolateModulesAsync(() =>
        import('@/lib/cache')
      );

      await expect(cache.get('transactions:u1:abc')).resolves.toBeNull();
      expect(MockRedis).not.toHaveBeenCalled();
    });

    it('should be a no-op on set, del and delByPattern when UPSTASH_REDIS_REST_URL is absent', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;

      const { cache }: { cache: CacheLike } = await jest.isolateModulesAsync(() =>
        import('@/lib/cache')
      );

      await expect(cache.set('key', 'value', 300)).resolves.toBeUndefined();
      await expect(cache.del('key')).resolves.toBeUndefined();
      await expect(cache.delByPattern('transactions:u1:*')).resolves.toBeUndefined();
      // O stub NÃO armazena: após um set, o get continua retornando null
      // (decisão: stub in-memory retorna null no get e não faz nada no set/del)
      await expect(cache.get('key')).resolves.toBeNull();
    });
  });

  describe('cliente Upstash (com UPSTASH_REDIS_REST_URL)', () => {
    it('should instantiate the Upstash client and delegate get/set/del when UPSTASH_REDIS_REST_URL is present', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://mock.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';

      const { cache }: { cache: CacheLike } = await jest.isolateModulesAsync(() =>
        import('@/lib/cache')
      );

      expect(MockRedis).toHaveBeenCalledTimes(1);

      await cache.set('transactions:u1:abc', '{"data":[]}', 300);
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'transactions:u1:abc',
        '{"data":[]}',
        300
      );

      mockRedisInstance.get.mockResolvedValue('{"data":[]}');
      await expect(cache.get('transactions:u1:abc')).resolves.toBe('{"data":[]}');
      expect(mockRedisInstance.get).toHaveBeenCalledWith('transactions:u1:abc');

      await cache.del('transactions:u1:abc');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('transactions:u1:abc');
    });

    it('should apply default ttl of 300 seconds when CACHE_TTL is absent and ttlSeconds is not provided', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://mock.upstash.io';
      delete process.env.CACHE_TTL;

      const { cache }: { cache: CacheLike } = await jest.isolateModulesAsync(() =>
        import('@/lib/cache')
      );

      await cache.set('key', 'value');
      expect(mockRedisInstance.set).toHaveBeenCalledWith('key', 'value', 300);
    });

    it('should delete all keys matching the pattern via keys + del on delByPattern', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://mock.upstash.io';

      mockRedisInstance.keys.mockResolvedValue([
        'transactions:u1:aaa',
        'transactions:u1:bbb',
      ]);

      const { cache }: { cache: CacheLike } = await jest.isolateModulesAsync(() =>
        import('@/lib/cache')
      );

      await cache.delByPattern('transactions:u1:*');

      expect(mockRedisInstance.keys).toHaveBeenCalledWith('transactions:u1:*');
      expect(mockRedisInstance.del).toHaveBeenCalledWith(
        'transactions:u1:aaa',
        'transactions:u1:bbb'
      );
    });
  });
});