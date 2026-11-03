import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { render, renderToString, Text, useApp, useInput } from 'ink';
import { App } from './components/App.js';
import { ErrorView } from './components/ErrorView.js';
import { WorktreePicker, describeWorktree } from './components/WorktreePicker.js';
import { readSnapshot, useWatchState } from './hooks/useWatchState.js';
import { demoState } from './model/demo.js';
import { mapToBoard } from './model/mapToBoard.js';
import type { FsProbe } from './model/readState.js';
import { resolveTarget } from './model/resolveTarget.js';
import { sanitizeText, stripControl } from './model/sanitizeText.js';
import type { Board, FsLike, GitLike, PipelineState, ReadResult, WorktreeRef } from './model/types.js';

export const USAGE = 'Uso: fg tui [FING-N] [--dir <caminho>] [--demo] [--once] [--dump]';

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
  dir?: string;
  code?: string;
  repo?: string;
}

export type ParseResult = { ok: true; args: CliArgs } | { ok: false; message: string };

export function parseArgs(argv: string[]): ParseResult {
  const args: CliArgs = { demo: false, once: false, dump: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? '';
    const eq = token.startsWith('--') ? token.indexOf('=') : -1;
    const flag = eq > 0 ? token.slice(0, eq) : token;
    const inlineValue = eq > 0 ? token.slice(eq + 1) : undefined;

    if (flag === '--demo') args.demo = true;
    else if (flag === '--once') args.once = true;
    else if (flag === '--dump') args.dump = true;
    else if (flag === '--dir' || flag === '--repo') {
      const value = inlineValue ?? argv[i + 1];
      if (inlineValue === undefined) i += 1;
      if (value === undefined || value.trim() === '' || value.startsWith('--')) {
        return { ok: false, message: `O argumento ${flag} precisa de um caminho. ${USAGE}` };
      }
      if (flag === '--dir') args.dir = value;
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

export const realFs: FsLike & FsProbe = {
  exists: (p) => existsSync(p),
  readFile: (p) => readFileSync(p, 'utf8'),
  isSymlink: (p) => {
    try {
      return lstatSync(p).isSymbolicLink();
    } catch {
      return false;
    }
  },
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
  fs: FsLike & FsProbe;
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

export function describeReadFailure(result: Extract<ReadResult, { ok: false }>): string {
  switch (result.kind) {
    case 'missing':
      return 'Esta worktree não tem estado de pipeline (`.fg-pipeline.json`).';
    case 'invalid-json':
      return 'Estado ainda sendo gravado, tentando de novo…';
    case 'invalid-schema':
      return `O estado da pipeline está em formato inesperado: ${sanitizeText(result.message)}`;
    case 'unreadable':
      return `Não foi possível ler o estado da pipeline: ${sanitizeText(result.message)}`;
  }
}

function safeBoard(result: ReadResult, now: Date): { board: Board } | { error: string } {
  if (!result.ok) return { error: describeReadFailure(result) };
  try {
    return { board: mapToBoard(result.state, now) };
  } catch (error) {
    return { error: `Falha ao montar o quadro da pipeline: ${sanitizeText(error instanceof Error ? error.message : String(error))}` };
  }
}

function manyMessage(refs: WorktreeRef[]): string {
  const lines = refs.map((ref) => `  ${sanitizeText(describeWorktree(ref))}  (${sanitizeText(ref.path)})`);
  return [
    'Várias pipelines encontradas:',
    ...lines,
    'Escolha uma com `pnpm fg tui FING-N` ou `--dir <caminho>`.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Componentes de topo (ligam hook + modelo aos componentes visuais)
// ---------------------------------------------------------------------------

function ErrorScreen({ message }: { message: string }): ReactElement {
  const { exit } = useApp();
  useInput((input) => {
    if (input === 'q') exit();
  });
  return (
    <>
      <ErrorView message={message} />
      <Text dimColor>q sai</Text>
    </>
  );
}

const CLOCK_TICK_MS = 5000;

function LiveApp({ dir, fs }: { dir: string; fs: FsLike }): ReactElement {
  const { result, activity, unstable, reload } = useWatchState(dir, fs);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const view = useMemo(() => {
    const now = new Date();
    void tick;
    return { now, built: safeBoard(result, now) };
  }, [result, tick]);

  if ('error' in view.built) return <ErrorScreen message={view.built.error} />;
  return <App board={view.built.board} activity={activity} unstable={unstable} now={view.now} onReload={reload} />;
}

function PickerRoot({ refs, fs }: { refs: WorktreeRef[]; fs: FsLike }): ReactElement {
  const [chosen, setChosen] = useState<WorktreeRef | null>(refs.length === 1 ? (refs[0] ?? null) : null);
  if (chosen === null) return <WorktreePicker refs={refs} onSelect={setChosen} />;
  return <LiveApp dir={chosen.path} fs={fs} />;
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

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
  const dir = args.dir !== undefined ? resolve(io.cwd, args.dir) : undefined;
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
