import { describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import { MultiApp } from './MultiApp.js';
import { demoState } from '../model/demo.js';
import type { WatchFn } from '../hooks/useWatchState.js';
import type { FsLike, WorktreeRef } from '../model/types.js';

const TAB = '\t';
const SHIFT_TAB = '\u001B[Z';
const DOWN = '\u001B[B';

function aguardar(ms = 40): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function norm(p: string): string {
  return p.split(String.fromCharCode(92)).join('/');
}

const A = '/w/a';
const B = '/w/b';
const refs: WorktreeRef[] = [
  { path: A, branch: null, code: 'FING-1', state: null },
  { path: B, branch: null, code: 'FING-2', state: null },
];

function makeFs(): FsLike {
  const files: Record<string, string> = {
    [`${A}/.fg-pipeline.json`]: JSON.stringify({ ...demoState(), code: 'FING-1', slug: 'alfa' }),
    [`${B}/.fg-pipeline.json`]: JSON.stringify({ ...demoState(), code: 'FING-2', slug: 'beta' }),
  };
  return {
    exists: (p) => norm(p) in files,
    readFile: (p) => files[norm(p)] ?? '',
  };
}

function makeWatch() {
  const stats = { opened: 0, closed: 0 };
  const watch: WatchFn = () => {
    stats.opened += 1;
    return {
      close: () => {
        stats.closed += 1;
      },
    };
  };
  return { stats, watch };
}

describe('MultiApp', () => {
  it('mostra abas "Todas" + uma por worktree e o resumo por pipeline', async () => {
    const { watch } = makeWatch();
    const { lastFrame, unmount } = render(<MultiApp refs={refs} fs={makeFs()} watchOptions={{ watch, intervalMs: 5000 }} />);
    await aguardar();
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Todas');
    expect(frame).toContain('FING-1');
    expect(frame).toContain('FING-2');
    expect(frame).toMatch(/FING-1 · \S+ · .* · \d+\/\d+/);
    unmount();
  });

  it('Tab avança para a worktree e Shift+Tab volta, circulando', async () => {
    const { watch } = makeWatch();
    const { lastFrame, stdin, unmount } = render(
      <MultiApp refs={refs} fs={makeFs()} watchOptions={{ watch, intervalMs: 5000 }} />,
    );
    await aguardar();
    stdin.write(TAB);
    await aguardar();
    expect(lastFrame()).toContain('alfa');
    stdin.write(TAB);
    await aguardar();
    expect(lastFrame()).toContain('beta');
    stdin.write(TAB);
    await aguardar();
    expect(lastFrame()).not.toContain('beta');
    stdin.write(SHIFT_TAB);
    await aguardar();
    expect(lastFrame()).toContain('beta');
    unmount();
  });

  it('Enter na aba Todas abre a worktree selecionada', async () => {
    const { watch } = makeWatch();
    const { lastFrame, stdin, unmount } = render(
      <MultiApp refs={refs} fs={makeFs()} watchOptions={{ watch, intervalMs: 5000 }} />,
    );
    await aguardar();
    stdin.write(DOWN);
    await aguardar();
    stdin.write('\r');
    await aguardar();
    expect(lastFrame()).toContain('beta');
    unmount();
  });

  it('Esc em uma aba de worktree volta à aba Todas', async () => {
    const { watch } = makeWatch();
    const { lastFrame, stdin, unmount } = render(
      <MultiApp refs={refs} fs={makeFs()} watchOptions={{ watch, intervalMs: 5000 }} />,
    );
    await aguardar();
    stdin.write(TAB);
    await aguardar();
    expect(lastFrame()).not.toContain('Enter abre');
    stdin.write('');
    await aguardar(100);
    expect(lastFrame()).toContain('Enter abre');
    unmount();
  });

  it('fecha todos os watchers no unmount', async () => {
    const { stats, watch } = makeWatch();
    const { stdin, unmount } = render(<MultiApp refs={refs} fs={makeFs()} watchOptions={{ watch, intervalMs: 5000 }} />);
    await aguardar();
    expect(stats.opened).toBe(2);
    stdin.write(TAB); // sai da aba Todas: fecha os 2 watchers dela e abre os da worktree
    await aguardar();
    expect(stats.closed).toBeGreaterThanOrEqual(2);
    unmount();
    await aguardar();
    expect(stats.closed).toBe(stats.opened);
  });

  it('estado ilegível aparece como erro na linha, sem derrubar as abas', async () => {
    const { watch } = makeWatch();
    const fs: FsLike = {
      exists: (p) => norm(p).endsWith('.fg-pipeline.json'),
      readFile: (p) => (norm(p).startsWith(A) ? '{quebrado' : JSON.stringify({ ...demoState(), code: 'FING-2' })),
    };
    const { lastFrame, unmount } = render(<MultiApp refs={refs} fs={fs} watchOptions={{ watch, intervalMs: 5000 }} />);
    await aguardar();
    const frame = lastFrame() ?? '';
    expect(frame).toContain('FING-1');
    expect(frame).toMatch(/FING-2 · \S+/);
    unmount();
  });
});
