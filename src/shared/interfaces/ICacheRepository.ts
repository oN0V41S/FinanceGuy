/**
 * Contrato do cache server-side (Redis/Upstash).
 *
 * Implementações concretas:
 * - `src/lib/cache.ts` — cliente Upstash real (quando UPSTASH_REDIS_REST_URL
 *   está presente) com fallback NOOP in-memory (graceful degradation).
 */
export interface ICacheRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPattern(pattern: string): Promise<void>;
}