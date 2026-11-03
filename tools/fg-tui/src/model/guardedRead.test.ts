import { describe, expect, it } from 'vitest';
import { readGuarded, type FsGuard } from './guardedRead.js';
import { parseEvents } from './events.js';
import type { FsLike } from './types.js';

const make = (content: string | null, guard: FsGuard = {}): FsLike & FsGuard => ({
  exists: () => content !== null,
  readFile: () => content ?? '',
  ...guard,
});

describe('readGuarded', () => {
  it('lê arquivo comum', () => {
    expect(readGuarded(make('ok'), 'x', 10)).toBe('ok');
  });
  it('recusa link simbólico', () => {
    expect(readGuarded(make('segredo', { isSymlink: () => true }), 'x', 10)).toBeNull();
  });
  it('recusa arquivo grande pelo tamanho, sem ler o conteúdo', () => {
    let read = false;
    const fs: FsLike & FsGuard = { exists: () => true, readFile: () => { read = true; return ''; }, size: () => 11 };
    expect(readGuarded(fs, 'x', 10)).toBeNull();
    expect(read).toBe(false);
  });
  it('devolve null quando ausente', () => {
    expect(readGuarded(make(null), 'x', 10)).toBeNull();
  });
});

describe('parseEvents sanitiza data e ts', () => {
  it('remove ESC de data.path', () => {
    const line = JSON.stringify({
      ts: '2026-11-03T10:00:00Z',
      step: 1,
      type: 'file_changed',
      message: 'm',
      data: { path: 'a\u001b]0;x\u0007.ts' },
    });
    const [e] = parseEvents(line).events;
    expect(JSON.stringify(e)).not.toContain('\u001b');
    expect(e?.data?.['path']).toBe('a]0;x.ts');
  });
});
