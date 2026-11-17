import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { useWatchEvents } from './useWatchEvents.js';
import type { FsLike } from '../model/types.js';

const DIR = '/repo/wt';
const ARQ = `${DIR}/.fg-pipeline.events.jsonl`;

function criarFs(arquivos: Map<string, string>): FsLike {
  return {
    exists: (p) => arquivos.has(p.replace(/\\/g, '/')),
    readFile: (p) => {
      const c = arquivos.get(p.replace(/\\/g, '/'));
      if (c === undefined) throw new Error('ENOENT');
      return c;
    },
  };
}

function linha(message: string, step = 1): string {
  return `${JSON.stringify({ ts: '2026-11-03T10:00:00.000Z', step, type: 'note', message })}\n`;
}

const semWatch = (): { close(): void } => ({ close: () => undefined });

describe('useWatchEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('arquivo ausente → vazio', () => {
    function S(): ReactElement {
      const { events, skipped } = useWatchEvents(DIR, criarFs(new Map()), { watch: semWatch });
      return <Text>{`n=${events.length} s=${skipped}`}</Text>;
    }
    const { lastFrame, unmount } = render(<S />);
    expect(lastFrame()).toContain('n=0 s=0');
    unmount();
  });

  it('lê eventos, atualiza no polling e não re-renderiza sem mudança', async () => {
    const arquivos = new Map([[ARQ, linha('a')]]);
    const fsMem = criarFs(arquivos);
    const onRender = vi.fn();
    function S(): ReactElement {
      const { events } = useWatchEvents(DIR, fsMem, { intervalMs: 1000, debounceMs: 100, watch: semWatch });
      onRender();
      return <Text>{`n=${events.length}`}</Text>;
    }
    const { lastFrame, unmount } = render(<S />);
    expect(lastFrame()).toContain('n=1');
    const base = onRender.mock.calls.length;
    await vi.advanceTimersByTimeAsync(3500);
    expect(onRender.mock.calls.length).toBe(base);
    arquivos.set(ARQ, linha('a') + linha('b'));
    await vi.advanceTimersByTimeAsync(1100);
    expect(lastFrame()).toContain('n=2');
    unmount();
  });

  it('watcher: ignora outros arquivos, reage ao de eventos e fecha no unmount', async () => {
    const arquivos = new Map([[ARQ, linha('a')]]);
    const fechar = vi.fn();
    let emitir: (f: string | null) => void = () => undefined;
    const watch = (_d: string, cb: (f: string | null) => void): { close(): void } => {
      emitir = cb;
      return { close: fechar };
    };
    const fsMem = criarFs(arquivos);
    function S(): ReactElement {
      const { events } = useWatchEvents(DIR, fsMem, { intervalMs: 60_000, debounceMs: 100, watch });
      return <Text>{`n=${events.length}`}</Text>;
    }
    const { lastFrame, unmount } = render(<S />);
    arquivos.set(ARQ, linha('a') + linha('b'));
    emitir('outro.txt');
    await vi.advanceTimersByTimeAsync(200);
    expect(lastFrame()).toContain('n=1');
    emitir('.fg-pipeline.events.jsonl');
    await vi.advanceTimersByTimeAsync(200);
    expect(lastFrame()).toContain('n=2');
    unmount();
    expect(fechar).toHaveBeenCalledTimes(1);
  });

  it('fs.watch lançando → segue só com polling', async () => {
    const arquivos = new Map<string, string>();
    const fsMem = criarFs(arquivos);
    function S(): ReactElement {
      const { events } = useWatchEvents(DIR, fsMem, {
        intervalMs: 1000,
        watch: () => {
          throw new Error('ENOENT');
        },
      });
      return <Text>{`n=${events.length}`}</Text>;
    }
    const { lastFrame, unmount } = render(<S />);
    arquivos.set(ARQ, linha('x'));
    await vi.advanceTimersByTimeAsync(1100);
    expect(lastFrame()).toContain('n=1');
    unmount();
  });
});
