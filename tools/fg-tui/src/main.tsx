import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { useState, type ReactElement } from 'react';
import { render, renderToString } from 'ink';
import { App } from './components/App.js';
import { LiveApp } from './components/LiveApp.js';
import { MultiApp } from './components/MultiApp.js';
import { WorktreePicker, describeWorktree } from './components/WorktreePicker.js';
import { readSnapshot } from './hooks/useWatchState.js';
import { formatSummary, resolveTargets, summarizeResult, type FsDirs } from './model/aggregate.js';
import { demoState } from './model/demo.js';
import type { FsProbe } from './model/readState.js';
import { resolveTarget } from './model/resolveTarget.js';
import { describeReadFailure, safeBoard } from './model/safeBoard.js';
import { sanitizeText, stripControl } from './model/sanitizeText.js';
import type { FsLike, GitLike, PipelineState, WorktreeRef } from './model/types.js';

export const USAGE = 'Uso: fg tui [FING-N] [--dir <caminho>]... [--root <pasta>] [--demo] [--once] [--dump]';

export const NO_PIPELINE_MESSAGE =
  'Nenhuma pipeline ativa encontrada. Inicie com `/fg-pipeline <tarefa>` ou veja um exemplo com `pnpm fg tui --demo`.';

const DEMO_ACTIVITY: string[] = [
  'Etapa 1 (backend-engineer) concluída e commitada.',
  'Etapa 2 (frontend) em andamento: componentes do Kanban.',
  'Etapa 3 (quality-assurance-analyst) aguardando a etapa 2.',
];

// ---------------------------------------------------------------------------
// Argumentos
// ---------------------------------------------------------------------------

export interface CliArgs {
  demo: boolean;
  once: boolean;
  dump: boolean;
  /** `--dir` é repetível. */
  dirs: string[];
  root?: string;
  code?: string;
  repo?: string;
}

export type ParseResult = { ok: true; args: CliArgs } | { ok: false; message: string };

export function parseArgs(argv: string[]): ParseResult {
  const args: CliArgs = { demo: false, once: false, dump: false, dirs: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? '';
    const eq = token.startsWith('--') ? token.indexOf('=') : -1;
    const flag = eq > 0 ? token.slice(0, eq) : token;
    const inlineValue = eq > 0 ? token.slice(eq + 1) : undefined;

    if (flag === '--demo') args.demo = true;
    else if (flag === '--once') args.once = true;
    else if (flag === '--dump') args.dump = true;
    else if (flag === '--dir' || flag === '--repo' || flag === '--root') {
      const value = inlineValue ?? argv[i + 1];
      if (inlineValue === undefined) i += 1;
      if (value === undefined || value.trim() === '' || value.startsWith('--')) {
        return { ok: false, message: `O argumento ${flag} precisa de um caminho. ${USAGE}` };
      }
      if (flag === '--dir') args.dirs.push(value);
      else if (flag === '--root') args.root = value;
      else args.repo = value;
    } else if (/^FING-\d+$/i.test(token)) {
      args.code = token.toUpperCase();
    } else {
      return { ok: false, message: `Argumento não reconhecido: ${token}. ${USAGE}` };
    }
  }
  return { ok: true, args };
}

// ---------------------------------------------------------------------------
// Portas reais (única parte do pacote que usa child_process)
// ---------------------------------------------------------------------------

export const realFs: FsLike & FsProbe & FsDirs = {
  exists: (p) => existsSync(p),
  readFile: (p) => readFileSync(p, 'utf8'),
  isSymlink: (p) => {
    try {
      return lstatSync(p).isSymbolicLink();
    } catch {
      return false;
    }
  },
  size: (p) => statSync(p).size,
  listDir: (p) => readdirSync(p),
  isDirectory: (p) => {
    try {
      return statSync(p).isDirectory();
    } catch {
      return false;
    }
  },
};

export const realGit: GitLike = {
  worktreeListPorcelain: (repoRoot) => {
    try {
      return execFileSync('git', ['-C', repoRoot, 'worktree', 'list', '--porcelain'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 10_000,
      });
    } catch {
      // git indisponível ou fora de um repositório: o model trata saída vazia como "nenhuma".
      return '';
    }
  },
};

export interface RunIo {
  fs: FsLike & FsProbe & FsDirs;
  git: GitLike;
  stdout: { write(text: string): unknown; columns?: number; isTTY?: boolean };
  stderr: { write(text: string): unknown };
  stdinIsTTY: boolean;
  /** Base para caminhos relativos (`--dir`, `--repo`). */
  cwd: string;
  now: () => Date;
}

export function realIo(): RunIo {
  return {
    fs: realFs,
    git: realGit,
    stdout: process.stdout,
    stderr: process.stderr,
    stdinIsTTY: process.stdin.isTTY === true,
    // `pnpm exec` troca o cwd para o pacote; INIT_CWD guarda o diretório de origem.
    cwd: process.env['INIT_CWD'] ?? process.cwd(),
    now: () => new Date(),
  };
}

// ---------------------------------------------------------------------------
// Mensagens de erro (pt-BR, acionáveis)
// ---------------------------------------------------------------------------

export { describeReadFailure };

function manyMessage(refs: WorktreeRef[]): string {
  const lines = refs.map((ref) => `  ${sanitizeText(describeWorktree(ref))}  (${sanitizeText(ref.path)})`);
  return [
    'Várias pipelines encontradas:',
    ...lines,
    'Escolha uma com `pnpm fg tui FING-N` ou `--dir <caminho>`.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Componentes de topo
// ---------------------------------------------------------------------------

function PickerRoot({ refs, fs }: { refs: WorktreeRef[]; fs: FsLike }): ReactElement {
  const [chosen, setChosen] = useState<WorktreeRef | null>(refs.length === 1 ? (refs[0] ?? null) : null);
  if (chosen === null) return <WorktreePicker refs={refs} onSelect={setChosen} />;
  return <LiveApp dir={chosen.path} fs={fs} />;
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

async function runMulti(
  args: CliArgs,
  repoRoot: string,
  io: RunIo,
  mode: { dump: boolean; interactive: boolean; columns: number },
): Promise<number> {
  const resolved = resolveTargets({
    dirs: args.dirs.map((d) => resolve(io.cwd, d)),
    ...(args.root !== undefined ? { root: resolve(io.cwd, args.root) } : {}),
    repoRoot,
    git: io.git,
    fs: io.fs,
  });
  if (resolved.kind === 'none') {
    io.stderr.write(`${NO_PIPELINE_MESSAGE}\n`);
    return 1;
  }
  if (resolved.kind === 'not-found') {
    io.stderr.write(`${sanitizeText(resolved.message)}\n`);
    return 1;
  }

  if (mode.interactive) {
    await render(<MultiApp refs={resolved.refs} fs={io.fs} />).waitUntilExit();
    return 0;
  }

  // --dump / --once: leitura única de cada worktree.
  const now = io.now();
  const boards = resolved.refs.map((ref) => ({ ref, built: safeBoard(readSnapshot(ref.path, io.fs).result, now) }));
  const failed = boards.find((b) => 'error' in b.built);
  if (failed !== undefined && 'error' in failed.built) {
    io.stderr.write(`${sanitizeText(failed.ref.path)}: ${failed.built.error}\n`);
    return 1;
  }
  if (mode.dump) {
    const out = boards.map((b) => ('board' in b.built ? b.built.board : null));
    io.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
    return 0;
  }
  const lines = boards.map((b) => {
    const summary = summarizeResult(readSnapshot(b.ref.path, io.fs).result);
    return summary === null ? sanitizeText(b.ref.path) : sanitizeText(formatSummary(summary));
  });
  io.stdout.write(`${lines.join('\n')}\n`);
  return 0;
}

function demoClock(updatedAt: string): Date {
  const t = Date.parse(updatedAt);
  // Ancora o relógio no estado de exemplo para a demo não aparecer "parada".
  return Number.isNaN(t) ? new Date() : new Date(t + 10_000);
}

/** Executa a TUI. Devolve o exit code (0 ok, 1 erro esperado, 2 uso inválido). */
export async function run(argv: string[], io: RunIo = realIo()): Promise<number> {
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    io.stderr.write(`${sanitizeText(parsed.message)}\n`);
    return 2;
  }
  const { args } = parsed;
  const tty = io.stdout.isTTY === true && io.stdinIsTTY;
  const dump = args.dump || (!tty && !args.once);
  const once = args.once && !args.dump;
  const interactive = !dump && !once;
  const columns = io.stdout.columns ?? 80;

  // --demo: nenhuma worktree necessária.
  if (args.demo) {
    let state: PipelineState;
    try {
      state = demoState();
    } catch (error) {
      io.stderr.write(`Não foi possível carregar a demonstração: ${sanitizeText(error instanceof Error ? error.message : String(error))}\n`);
      return 1;
    }
    const now = demoClock(state.updatedAt);
    const built = safeBoard({ ok: true, state }, now);
    if ('error' in built) {
      io.stderr.write(`${built.error}\n`);
      return 1;
    }
    if (dump) {
      io.stdout.write(`${JSON.stringify(built.board, null, 2)}\n`);
      return 0;
    }
    const element = (
      <App board={built.board} activity={DEMO_ACTIVITY} now={now} width={columns} interactive={interactive} />
    );
    if (once) {
      io.stdout.write(`${renderToString(element, { columns })}\n`);
      return 0;
    }
    await render(element).waitUntilExit();
    return 0;
  }

  const repoRoot = resolve(io.cwd, args.repo ?? '.');

  // Vários alvos: --dir repetido e/ou --root (board agregado).
  if (args.dirs.length > 1 || args.root !== undefined) {
    return runMulti(args, repoRoot, io, { dump, interactive, columns });
  }

  const dir = args.dirs[0] !== undefined ? resolve(io.cwd, args.dirs[0]) : undefined;
  const target = resolveTarget({
    ...(dir !== undefined ? { dir } : {}),
    ...(args.code !== undefined ? { code: args.code } : {}),
    repoRoot,
    git: io.git,
    fs: io.fs,
  });

  if (target.kind === 'none') {
    io.stderr.write(`${NO_PIPELINE_MESSAGE}\n`);
    return 1;
  }
  if (target.kind === 'not-found') {
    io.stderr.write(`${sanitizeText(target.message)}\n`);
    return 1;
  }
  if (target.kind === 'many' && !interactive) {
    io.stderr.write(`${stripControl(manyMessage(target.refs))}\n`);
    return 1;
  }

  if (!interactive) {
    // --dump / --once: leitura única, sem watcher nem raw mode.
    const ref = target.kind === 'one' ? target.ref : null;
    if (ref === null) return 1;
    const snapshot = readSnapshot(ref.path, io.fs);
    const now = io.now();
    const built = safeBoard(snapshot.result, now);
    if ('error' in built) {
      io.stderr.write(`${built.error}\n`);
      return 1;
    }
    if (dump) {
      io.stdout.write(`${JSON.stringify(built.board, null, 2)}\n`);
      return 0;
    }
    const element = <App board={built.board} activity={snapshot.activity} now={now} width={columns} interactive={false} />;
    io.stdout.write(`${renderToString(element, { columns })}\n`);
    return 0;
  }

  const refs = target.kind === 'one' ? [target.ref] : target.refs;
  await render(<PickerRoot refs={refs} fs={io.fs} />).waitUntilExit();
  return 0;
}

// ---------------------------------------------------------------------------
// Ponto de entrada (só quando executado diretamente, não quando importado em testes)
// ---------------------------------------------------------------------------

function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  return fileURLToPath(import.meta.url) === resolve(entry) || import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isEntryPoint()) {
  run(process.argv.slice(2))
    .then((code) => {
      process.exit(code);
    })
    .catch((error: unknown) => {
      process.stderr.write(`Erro inesperado na TUI: ${error instanceof Error ? error.message : String(error)}\n`);
      process.exit(1);
    });
}
