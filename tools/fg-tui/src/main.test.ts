import { describe, expect, it } from 'vitest';
import { parseArgs, run, type RunIo } from './main.js';
import { demoState } from './model/demo.js';

const CWD = '/repo/FinanceGuy-FING-30';
const STATE_PATH = `${CWD}/.fg-pipeline.json`;

function toPosix(p: string): string {
  return p.split(String.fromCharCode(92)).join('/');
}

// No Windows, resolve() prefixa a unidade (C:); casa pelo sufixo posix.
function lookup(files: Record<string, string>, p: string): string | undefined {
  const key = Object.keys(files).find((k) => toPosix(p).endsWith(k));
  return key === undefined ? undefined : files[key];
}

interface Harness {
  io: RunIo;
  out: string[];
  err: string[];
}

function harness(options: { files?: Record<string, string>; tty?: boolean; worktrees?: string } = {}): Harness {
  const files = options.files ?? {};
  const out: string[] = [];
  const err: string[] = [];
  const tty = options.tty === true;
  const io: RunIo = {
    fs: {
      exists: (p) => lookup(files, p) !== undefined,
      readFile: (p) => lookup(files, p) ?? '',
    },
    git: { worktreeListPorcelain: () => options.worktrees ?? '' },
    stdout: { write: (t) => out.push(t), columns: 100, isTTY: tty },
    stderr: { write: (t) => err.push(t) },
    stdinIsTTY: tty,
    cwd: CWD,
    now: () => new Date(),
  };
  return { io, out, err };
}

const stateFiles = (): Record<string, string> => ({ [STATE_PATH]: JSON.stringify(demoState()) });

describe('main (critério 9)', () => {
  it('--dump imprime JSON válido do board', async () => {
    const h = harness({ files: stateFiles() });
    const code = await run(['--dump', '--dir', CWD], h.io);
    expect(code).toBe(0);
    const board = JSON.parse(h.out.join('')) as { code: string; columns: unknown[] };
    expect(board.code).toBe('FING-99');
    expect(board.columns).toHaveLength(4);
  });

  it('sem TTY (stdout ou stdin) comporta-se como --dump', async () => {
    const h = harness({ files: stateFiles(), tty: false });
    const code = await run(['--dir', CWD], h.io);
    expect(code).toBe(0);
    expect(() => JSON.parse(h.out.join(''))).not.toThrow();
  });

  it('--once renderiza o board uma vez e sai com código 0', async () => {
    const h = harness({ files: stateFiles(), tty: true });
    const code = await run(['--once', '--dir', CWD], h.io);
    expect(code).toBe(0);
    const text = h.out.join('');
    expect(text).toContain('FING-99');
    expect(() => JSON.parse(text)).toThrow();
  });

  it('--demo funciona sem nenhuma worktree', async () => {
    const h = harness({ tty: true });
    expect(await run(['--demo', '--once'], h.io)).toBe(0);
    expect(h.out.join('')).toContain('FING-99');
    const dump = harness();
    expect(await run(['--demo', '--dump'], dump.io)).toBe(0);
    expect(() => JSON.parse(dump.out.join(''))).not.toThrow();
  });

  it('erro esperado imprime mensagem pt-BR e sai com 1, sem stack trace', async () => {
    const none = harness();
    expect(await run([], none.io)).toBe(1);
    expect(none.err.join('')).toContain('Nenhuma pipeline ativa');
    expect(none.err.join('')).not.toMatch(/\n\s+at /);

    const bad = harness();
    expect(await run(['--dir', '/inexistente'], bad.io)).toBe(1);
    expect(bad.err.join('')).not.toMatch(/\n\s+at /);
    expect(bad.err.join('').length).toBeGreaterThan(0);

    const usage = harness();
    expect(await run(['--nada'], usage.io)).toBe(2);
    expect(usage.err.join('')).toContain('Uso:');
  });

  it('sanitiza sequências de controle do estado no --dump', async () => {
    const state = demoState();
    state.slug = 'x\u001b[2Jy';
    const h = harness({ files: { [STATE_PATH]: JSON.stringify(state) } });
    expect(await run(['--dump', '--dir', CWD], h.io)).toBe(0);
    expect(h.out.join('')).not.toContain('\u001b');
  });
});

describe('main multi-worktree (V2.7 item 17)', () => {
  const A = '/repo/A';
  const B = '/repo/B';
  const multiFiles = (): Record<string, string> => ({
    [`${A}/.fg-pipeline.json`]: JSON.stringify({ ...demoState(), code: 'FING-1' }),
    [`${B}/.fg-pipeline.json`]: JSON.stringify({ ...demoState(), code: 'FING-2' }),
  });

  it('parseArgs aceita --dir repetido e --root', () => {
    const parsed = parseArgs(['--dir', 'a', '--dir=b', '--root', 'r']);
    expect(parsed.ok && parsed.args.dirs).toEqual(['a', 'b']);
    expect(parsed.ok && parsed.args.root).toBe('r');
    expect(parseArgs(['--root']).ok).toBe(false);
  });

  it('--dump com várias worktrees devolve array JSON na ordem', async () => {
    const h = harness({ files: multiFiles() });
    expect(await run(['--dump', '--dir', A, '--dir', B], h.io)).toBe(0);
    const boards = JSON.parse(h.out.join('')) as Array<{ code: string }>;
    expect(Array.isArray(boards)).toBe(true);
    expect(boards.map((b) => b.code)).toEqual(['FING-1', 'FING-2']);
  });

  it('--dump com uma única worktree mantém objeto (compatível com V1)', async () => {
    const h = harness({ files: multiFiles() });
    expect(await run(['--dump', '--dir', A], h.io)).toBe(0);
    expect(Array.isArray(JSON.parse(h.out.join('')))).toBe(false);
  });

  it('--once com várias worktrees imprime uma linha-resumo por pipeline', async () => {
    const h = harness({ files: multiFiles(), tty: true });
    expect(await run(['--once', '--dir', A, '--dir', B], h.io)).toBe(0);
    const lines = h.out.join('').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('FING-1 · ');
  });

  it('--dir inválido entre vários devolve exit 1 sem stack', async () => {
    const h = harness({ files: multiFiles() });
    h.io.fs.isDirectory = (p) => !p.includes('inexistente');
    expect(await run(['--dump', '--dir', A, '--dir', '/inexistente'], h.io)).toBe(1);
    expect(h.err.join('')).not.toMatch(/\n\s+at /);
  });

  it('--root sem pipelines devolve mensagem de nenhuma pipeline', async () => {
    const h = harness({ files: multiFiles() });
    h.io.fs.isDirectory = () => true;
    expect(await run(['--dump', '--root', '/vazio'], h.io)).toBe(1);
    expect(h.err.join('')).toContain('Nenhuma pipeline ativa');
  });
});
