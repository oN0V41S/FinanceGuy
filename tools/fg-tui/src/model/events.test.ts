import { describe, expect, it } from 'vitest';
import { EVENTS_FILE, eventsForStep, parseEvents, readEvents, tailEvents } from './events.js';
import type { FsLike } from './types.js';

const DIR = '/repo/FinanceGuy-FING-30';

function norm(p: string): string {
  return p.replace(/\\/g, '/');
}

function fakeFs(files: Record<string, string>, opts: { throwOnRead?: boolean } = {}): FsLike {
  const mapa = new Map(Object.entries(files).map(([k, v]) => [norm(k), v]));
  return {
    exists: (p) => mapa.has(norm(p)),
    readFile: (p) => {
      if (opts.throwOnRead) throw new Error('EACCES');
      const c = mapa.get(norm(p));
      if (c === undefined) throw new Error('ENOENT');
      return c;
    },
  };
}

function linha(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    ts: '2026-11-03T10:00:00.000Z',
    step: 1,
    type: 'note',
    message: 'ok',
    ...over,
  });
}

describe('parseEvents', () => {
  it('lê eventos válidos', () => {
    const r = parseEvents(`${linha()}\n${linha({ step: null, type: 'command', agent: 'qa' })}\n`);
    expect(r.events).toHaveLength(2);
    expect(r.skipped).toBe(0);
    expect(r.events[1]?.agent).toBe('qa');
  });

  it('ignora e conta linhas inválidas sem lançar', () => {
    const r = parseEvents(
      [linha(), '{quebrado', linha({ type: 'xpto' }), linha({ ts: 'ontem' }), '', linha()].join('\n'),
    );
    expect(r.events).toHaveLength(2);
    expect(r.skipped).toBe(3);
  });

  it('ignora campos extras', () => {
    const r = parseEvents(linha({ extra: 1 }));
    expect(r.events).toHaveLength(1);
    expect(r.events[0]).not.toHaveProperty('extra');
  });

  it('sanitiza a mensagem', () => {
    const r = parseEvents(linha({ message: 'a\u001b[31mb\nc' }));
    expect(r.events[0]?.message).toBe('a[31mb c');
  });

  it('suporta CRLF', () => {
    const r = parseEvents(`${linha()}\r\n${linha()}\r\n`);
    expect(r.events).toHaveLength(2);
  });

  it('texto vazio devolve vazio', () => {
    expect(parseEvents('')).toEqual({ events: [], skipped: 0 });
  });
});

describe('readEvents', () => {
  it('arquivo ausente devolve vazio', () => {
    expect(readEvents(DIR, fakeFs({}))).toEqual({ events: [], skipped: 0 });
  });

  it('erro de leitura devolve vazio', () => {
    const fs = fakeFs({ [`${DIR}/${EVENTS_FILE}`]: linha() }, { throwOnRead: true });
    expect(readEvents(DIR, fs)).toEqual({ events: [], skipped: 0 });
  });

  it('lê e ordena por ts', () => {
    const fs = fakeFs({
      [`${DIR}/${EVENTS_FILE}`]: [
        linha({ ts: '2026-11-03T10:05:00.000Z', message: 'b' }),
        linha({ ts: '2026-11-03T10:01:00.000Z', message: 'a' }),
      ].join('\n'),
    });
    expect(readEvents(DIR, fs).events.map((e) => e.message)).toEqual(['a', 'b']);
  });
});

describe('eventsForStep / tailEvents', () => {
  const { events } = parseEvents(
    [
      linha({ ts: '2026-11-03T10:03:00.000Z', step: 2, message: 'c' }),
      linha({ ts: '2026-11-03T10:01:00.000Z', step: 1, message: 'a' }),
      linha({ ts: '2026-11-03T10:02:00.000Z', step: 2, message: 'b' }),
    ].join('\n'),
  );

  it('filtra por etapa em ordem cronológica', () => {
    expect(eventsForStep(events, 2).map((e) => e.message)).toEqual(['b', 'c']);
    expect(eventsForStep(events, 9)).toEqual([]);
  });

  it('tail devolve os últimos n em ordem', () => {
    expect(tailEvents(events, 2).map((e) => e.message)).toEqual(['b', 'c']);
    expect(tailEvents(events, 0)).toEqual([]);
    expect(tailEvents(events, 99)).toHaveLength(3);
  });
});
