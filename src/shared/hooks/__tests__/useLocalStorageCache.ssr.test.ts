/**
 * @jest-environment node
 *
 * SSR guard (typeof window === 'undefined') — Issue #9.
 *
 * Este arquivo roda em ambiente `node` (sem `window`), simulando SSR de forma
 * REAL: `typeof window === 'undefined'` é verdadeiro de fato.
 *
 * Motivo da separação: jsdom ≥ 22 define `globalThis.window` como getter
 * NÃO-configurável e sem setter — `Object.defineProperty(globalThis, 'window',
 * { value: undefined, ... })` lança "Cannot redefine property: window" e
 * `delete globalThis.window` é silenciosamente ignorado. Portanto, não é
 * possível esconder `window` dentro de um arquivo de teste jsdom.
 */
import {
  readCache,
  writeCache,
  deleteCache,
  clearCacheByPrefix,
} from '@/shared/hooks/useLocalStorageCache';

const CACHE_PREFIX = 'financeguy:cache:';

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('SSR guard (typeof window === undefined)', () => {
  it('writeCache/readCache/deleteCache/clearCacheByPrefix são no-ops seguros sem window', () => {
    // Em ambiente node NÃO existe `window` — os guards devem ser no-ops.
    expect(() => writeCache('ssr-key', { ok: true }, 1_000)).not.toThrow();
    expect(readCache('ssr-key')).toBeNull();
    expect(() => deleteCache('ssr-key')).not.toThrow();
    expect(() =>
      clearCacheByPrefix(`${CACHE_PREFIX}transactions:`),
    ).not.toThrow();
  });
});