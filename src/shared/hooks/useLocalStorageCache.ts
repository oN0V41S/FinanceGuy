'use client';

import { useState, useCallback } from 'react';

/**
 * Cache client-side com localStorage + stale-while-revalidate (Issue #9).
 *
 * Utilitários puros (sem React) + hook wrapper:
 * - writeCache / readCache / deleteCache / clearCacheByPrefix
 * - useLocalStorageCache (hook com estado sincronizado)
 *
 * Envelope armazenado: `{ value, timestamp, ttl }`
 * Chave real: `financeguy:cache:{key}`
 * LRU simples: quando o total estimado excede ~4MB, remove as entradas mais
 * antigas (por timestamp) até caber.
 */

export const CACHE_PREFIX = 'financeguy:cache:';
export const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutos
export const MAX_CACHE_SIZE = 4 * 1024 * 1024; // ~4MB

interface CacheEnvelope<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function realKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

/** Somatório estimado (key.length + value.length) de todas as chaves. */
function estimateCacheSize(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key === null) continue;
    total += key.length + (localStorage.getItem(key)?.length ?? 0);
  }
  return total;
}

/**
 * Evicção LRU: se `incomingLength` + total atual exceder ~4MB, remove as
 * entradas mais antigas (por timestamp) até caber. Entradas com JSON
 * corrompido/inválido são tratadas como as mais antigas (timestamp 0).
 */
function evictIfNeeded(incomingLength: number): void {
  let total = estimateCacheSize() + incomingLength;
  if (total <= MAX_CACHE_SIZE) return;

  const entries: Array<{ key: string; length: number; timestamp: number }> = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key === null || !key.startsWith(CACHE_PREFIX)) continue;

    const raw = localStorage.getItem(key);
    const length = (raw?.length ?? 0) + key.length;
    let timestamp = 0;
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw) as { timestamp?: unknown };
        if (typeof parsed.timestamp === 'number') {
          timestamp = parsed.timestamp;
        }
      } catch {
        timestamp = 0;
      }
    }
    entries.push({ key, length, timestamp });
  }

  // Mais antigas primeiro (timestamp ascendente; ties preservam ordem de escrita)
  entries.sort((a, b) => a.timestamp - b.timestamp);

  for (const entry of entries) {
    if (total <= MAX_CACHE_SIZE) break;
    localStorage.removeItem(entry.key);
    total -= entry.length;
  }
}

/**
 * Grava `{ value, timestamp, ttl }` serializado em `financeguy:cache:{key}`.
 * No SSR (`typeof window === 'undefined'`) é um no-op seguro.
 */
export function writeCache<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  if (!hasWindow()) return;

  const envelope: CacheEnvelope<T> = {
    value,
    timestamp: Date.now(),
    ttl: ttlMs,
  };
  const serialized = JSON.stringify(envelope);
  evictIfNeeded(serialized.length + realKey(key).length);
  localStorage.setItem(realKey(key), serialized);
}

/**
 * Lê o valor do snapshot. Retorna `null` se: sem window, chave inexistente,
 * TTL expirado, JSON corrompido ou envelope incompleto. Valores falsy válidos
 * (0, false, '') são retornados normalmente.
 */
export function readCache<T>(key: string): T | null {
  if (!hasWindow()) return null;

  const raw = localStorage.getItem(realKey(key));
  if (raw === null) return null;

  let envelope: CacheEnvelope<T>;
  try {
    envelope = JSON.parse(raw) as CacheEnvelope<T>;
  } catch {
    return null;
  }

  if (
    typeof envelope !== 'object' ||
    envelope === null ||
    !('value' in envelope) ||
    typeof envelope.timestamp !== 'number' ||
    typeof envelope.ttl !== 'number'
  ) {
    return null;
  }

  if (Date.now() - envelope.timestamp > envelope.ttl) {
    return null;
  }

  return envelope.value;
}

/** Remove a chave `financeguy:cache:{key}`. No SSR é um no-op seguro. */
export function deleteCache(key: string): void {
  if (!hasWindow()) return;
  localStorage.removeItem(realKey(key));
}

/**
 * Remove todas as chaves que começam exatamente com `prefix`.
 * Prefixos maiores (ex: `transactions-x:` vs `transactions:`) são preservados.
 * No SSR é um no-op seguro.
 */
export function clearCacheByPrefix(prefix: string): void {
  if (!hasWindow()) return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key === null) continue;
    if (key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

export interface UseLocalStorageCacheReturn<T> {
  cache: T | null;
  setCache: (value: T) => void;
  clearCache: () => void;
}

/**
 * Hook wrapper: estado React sincronizado com o snapshot do localStorage.
 * Lê o snapshot no mount (lazy initializer) e expõe setCache (grava via
 * writeCache) e clearCache (remove chave + zera estado).
 */
export function useLocalStorageCache<T>(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
): UseLocalStorageCacheReturn<T> {
  const [cache, setCacheState] = useState<T | null>(() => readCache<T>(key));

  const setCache = useCallback(
    (value: T) => {
      writeCache(key, value, ttlMs);
      setCacheState(value);
    },
    [key, ttlMs],
  );

  const clearCache = useCallback(() => {
    deleteCache(key);
    setCacheState(null);
  }, [key]);

  return { cache, setCache, clearCache };
}