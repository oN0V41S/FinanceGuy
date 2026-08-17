/**
 * Fase RED (TDD) — Issue #9: cache client-side com localStorage.
 *
 * Este arquivo define o CONTRATO do utilitário `useLocalStorageCache`
 * (exportar `readCache`, `writeCache`, `deleteCache`, `clearCacheByPrefix` +
 * hook wrapper `useLocalStorageCache`). A implementação em
 * `src/shared/hooks/useLocalStorageCache.ts` AINDA NÃO EXISTE — todos os
 * testes devem falhar (red) até a próxima fase.
 *
 * Contrato esperado:
 * - Chave real no localStorage: `financeguy:cache:{key}`
 * - Envelope armazenado: `{ value, timestamp, ttl }`
 * - TTL default: 30 minutos (30 * 60 * 1000 ms)
 * - LRU: quando o total estimado (JSON.stringify(...).length) excede ~4MB,
 *   remove as entradas mais antigas até caber
 * - SSR guard: sem `window` (typeof window === 'undefined') → no-ops seguros
 */
import { renderHook, act } from '@testing-library/react';
import {
  readCache,
  writeCache,
  deleteCache,
  clearCacheByPrefix,
  useLocalStorageCache,
} from '@/shared/hooks/useLocalStorageCache';

const CACHE_PREFIX = 'financeguy:cache:';
const DEFAULT_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_SIZE = 4 * 1024 * 1024; // ~4MB

function readRawStored(key: string): Record<string, unknown> {
  const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
  expect(raw).not.toBeNull();
  return JSON.parse(raw as string) as Record<string, unknown>;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// writeCache
// ---------------------------------------------------------------------------

describe('writeCache', () => {
  it('serializa JSON e guarda envelope { value, timestamp, ttl } na chave prefixada', () => {
    writeCache('minha-chave', { saldo: 100 }, 45_000);

    const stored = readRawStored('minha-chave');
    expect(stored.value).toEqual({ saldo: 100 });
    expect(typeof stored.timestamp).toBe('number');
    expect(stored.ttl).toBe(45_000);

    // A chave real usa o prefixo financeguy:cache:
    expect(localStorage.getItem('minha-chave')).toBeNull();
    expect(localStorage.getItem(`${CACHE_PREFIX}minha-chave`)).not.toBeNull();
  });

  it('usa TTL default de 30 minutos quando ttlMs é omitido', () => {
    writeCache('ttl-default', { ok: true });

    const stored = readRawStored('ttl-default');
    expect(stored.ttl).toBe(DEFAULT_TTL_MS);
  });

  it('respeita ttlMs informado', () => {
    writeCache('ttl-custom', { ok: true }, 2 * 60 * 1000);

    const stored = readRawStored('ttl-custom');
    expect(stored.ttl).toBe(2 * 60 * 1000);
  });

  it('sobrescreve entrada existente para a mesma chave', () => {
    writeCache('sobrescrever', { versao: 1 }, DEFAULT_TTL_MS);
    writeCache('sobrescrever', { versao: 2 }, DEFAULT_TTL_MS);

    const stored = readRawStored('sobrescrever');
    expect(stored.value).toEqual({ versao: 2 });
  });
});

// ---------------------------------------------------------------------------
// readCache
// ---------------------------------------------------------------------------

describe('readCache', () => {
  it('retorna null quando a chave não existe', () => {
    expect(readCache('inexistente')).toBeNull();
  });

  it('retorna o valor quando o snapshot é válido e fresco', () => {
    const payload = { transacoes: ['a', 'b'], meta: { valor: 10 } };
    writeCache('valida', payload, DEFAULT_TTL_MS);

    expect(readCache('valida')).toEqual(payload);
  });

  it('retorna valores falsy válidos (0, false, string vazia) — não confunde com ausência', () => {
    writeCache('zero', 0, DEFAULT_TTL_MS);
    writeCache('falso', false, DEFAULT_TTL_MS);
    writeCache('vazio', '', DEFAULT_TTL_MS);

    expect(readCache('zero')).toBe(0);
    expect(readCache('falso')).toBe(false);
    expect(readCache('vazio')).toBe('');
  });

  it('expira após o TTL configurado', () => {
    jest.useFakeTimers({ now: 1_800_000_000_000 });

    writeCache('expiravel', 'valor', 1_000);
    expect(readCache('expiravel')).toBe('valor');

    jest.advanceTimersByTime(1_001);
    expect(readCache('expiravel')).toBeNull();
  });

  it('retorna null quando o snapshot expirou (timestamp antigo além do TTL)', () => {
    // Simula escrita há mais de 30min (TTL default)
    localStorage.setItem(
      `${CACHE_PREFIX}velho`,
      JSON.stringify({
        value: { ok: true },
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        ttl: DEFAULT_TTL_MS,
      }),
    );

    expect(readCache('velho')).toBeNull();
  });

  it('retorna null para JSON inválido/corrompido', () => {
    localStorage.setItem(`${CACHE_PREFIX}corrompido`, '{isso não é json');
    localStorage.setItem(`${CACHE_PREFIX}truncado`, '{"value":');

    expect(readCache('corrompido')).toBeNull();
    expect(readCache('truncado')).toBeNull();
  });

  it('retorna null quando o envelope está incompleto (sem value/timestamp/ttl)', () => {
    localStorage.setItem(
      `${CACHE_PREFIX}sem-ttl`,
      JSON.stringify({ value: 1, timestamp: Date.now() }),
    );
    localStorage.setItem(
      `${CACHE_PREFIX}sem-timestamp`,
      JSON.stringify({ value: 1, ttl: DEFAULT_TTL_MS }),
    );

    expect(readCache('sem-ttl')).toBeNull();
    expect(readCache('sem-timestamp')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// LRU simples (~4MB)
// ---------------------------------------------------------------------------

describe('LRU simples — limite de ~4MB', () => {
  it('remove as entradas mais antigas quando o cache excede ~4MB até caber', () => {
    const removeSpy = jest.spyOn(Storage.prototype, 'removeItem');

    // 12 entradas de ~300KB (payload) → ~3.6MB
    const block = 'x'.repeat(300 * 1024);
    for (let i = 0; i < 12; i += 1) {
      writeCache(`lru-${i}`, { payload: block }, DEFAULT_TTL_MS);
    }

    // + ~500KB → total ~4.1MB > 4MB → evicção necessária
    const finalBlock = 'y'.repeat(500 * 1024);
    writeCache('lru-final', { payload: finalBlock }, DEFAULT_TTL_MS);

    // Entrada mais antiga foi removida; a nova sobrevive
    expect(removeSpy).toHaveBeenCalledWith(`${CACHE_PREFIX}lru-0`);
    expect(readCache('lru-0')).toBeNull();

    // As entradas seguintes (mais novas) permanecem
    expect(readCache('lru-1')).toEqual({ payload: block });
    expect(readCache('lru-final')).toEqual({ payload: finalBlock });

    // Após a evicção, o total armazenado fica abaixo do limite de ~4MB
    let total = 0;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key === null) continue;
      total += key.length + (localStorage.getItem(key)?.length ?? 0);
    }
    expect(total).toBeLessThanOrEqual(MAX_CACHE_SIZE);
  });
});

// ---------------------------------------------------------------------------
// deleteCache / clearCacheByPrefix
// ---------------------------------------------------------------------------

describe('deleteCache / clearCacheByPrefix', () => {
  it('deleteCache remove a chave única do cache', () => {
    writeCache('apagar', { ok: true }, DEFAULT_TTL_MS);
    expect(localStorage.getItem(`${CACHE_PREFIX}apagar`)).not.toBeNull();

    deleteCache('apagar');

    expect(localStorage.getItem(`${CACHE_PREFIX}apagar`)).toBeNull();
    expect(readCache('apagar')).toBeNull();
  });

  it('clearCacheByPrefix remove apenas chaves que começam com o prefixo', () => {
    localStorage.setItem(
      `${CACHE_PREFIX}transactions:abc`,
      JSON.stringify({ value: 1, timestamp: Date.now(), ttl: DEFAULT_TTL_MS }),
    );
    localStorage.setItem(
      `${CACHE_PREFIX}transactions:def`,
      JSON.stringify({ value: 2, timestamp: Date.now(), ttl: DEFAULT_TTL_MS }),
    );
    localStorage.setItem(
      `${CACHE_PREFIX}dashboard:abc`,
      JSON.stringify({ value: 3, timestamp: Date.now(), ttl: DEFAULT_TTL_MS }),
    );
    // Prefixo parecido mas com sufixo diferente — NÃO deve ser removido
    localStorage.setItem(
      `${CACHE_PREFIX}transactions-x:abc`,
      JSON.stringify({ value: 4, timestamp: Date.now(), ttl: DEFAULT_TTL_MS }),
    );
    localStorage.setItem('outra-chave', 'valor qualquer');

    clearCacheByPrefix(`${CACHE_PREFIX}transactions:`);

    expect(localStorage.getItem(`${CACHE_PREFIX}transactions:abc`)).toBeNull();
    expect(localStorage.getItem(`${CACHE_PREFIX}transactions:def`)).toBeNull();
    expect(localStorage.getItem(`${CACHE_PREFIX}dashboard:abc`)).not.toBeNull();
    expect(localStorage.getItem(`${CACHE_PREFIX}transactions-x:abc`)).not.toBeNull();
    expect(localStorage.getItem('outra-chave')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SSR guard
// ---------------------------------------------------------------------------
// Movido para `useLocalStorageCache.ssr.test.ts` (ambiente `@jest-environment
// node`): jsdom ≥ 22 define `globalThis.window` como getter não-configurável e
// sem setter, tornando impossível esconder `window` num arquivo jsdom
// ("Cannot redefine property: window").

// ---------------------------------------------------------------------------
// Hook wrapper useLocalStorageCache
// ---------------------------------------------------------------------------

describe('hook wrapper useLocalStorageCache', () => {
  it('lê snapshot existente no mount', () => {
    writeCache('hook-sample', { n: 1 }, 60_000);

    const { result } = renderHook(() =>
      useLocalStorageCache<{ n: number }>('hook-sample'),
    );

    expect(result.current.cache).toEqual({ n: 1 });
  });

  it('retorna null no mount quando não há snapshot', () => {
    const { result } = renderHook(() =>
      useLocalStorageCache<{ n: number }>('hook-missing'),
    );

    expect(result.current.cache).toBeNull();
  });

  it('setCache grava no localStorage (com o TTL informado ao hook)', () => {
    const { result } = renderHook(() =>
      useLocalStorageCache<number>('hook-write', 60_000),
    );

    act(() => {
      result.current.setCache(42);
    });

    const stored = readRawStored('hook-write');
    expect(stored.value).toBe(42);
    expect(stored.ttl).toBe(60_000);
    expect(result.current.cache).toBe(42);
  });

  it('clearCache remove a chave e zera o estado do hook', () => {
    writeCache('hook-clear', 'valor', 60_000);

    const { result } = renderHook(() =>
      useLocalStorageCache<string>('hook-clear'),
    );
    expect(result.current.cache).toBe('valor');

    act(() => {
      result.current.clearCache();
    });

    expect(localStorage.getItem(`${CACHE_PREFIX}hook-clear`)).toBeNull();
    expect(result.current.cache).toBeNull();
  });
});