import { join } from 'node:path';
import { readState, stateFilePath, type FsProbe } from './readState.js';
import { resolveTarget } from './resolveTarget.js';
import type { FsLike, GitLike, PipelineState, ReadResult, WorktreeRef } from './types.js';

/** Sonda opcional: nomes das entradas diretas de um diretório (ausente em fakes: `--root` fica vazio). */
export interface FsDirs {
  listDir?(p: string): string[];
}

export type AggregateResult =
  | { kind: 'ok'; refs: WorktreeRef[] }
  | { kind: 'none' }
  | { kind: 'not-found'; message: string };

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '');
}

function isSymlink(fs: FsProbe, p: string): boolean {
  try {
    return fs.isSymlink?.(p) === true;
  } catch {
    return false;
  }
}

function isDirectory(fs: FsProbe, p: string): boolean {
  try {
    return fs.isDirectory ? fs.isDirectory(p) : true;
  } catch {
    return false;
  }
}

function scanRoot(
  root: string,
  repoRoot: string,
  git: GitLike,
  fs: FsLike & FsProbe & FsDirs,
): { refs: WorktreeRef[] } | { message: string } {
  if (isSymlink(fs, root)) {
    return { message: `"${root}" é um link simbólico e foi recusado por segurança. Informe o caminho real em --root.` };
  }
  if (!isDirectory(fs, root)) {
    return { message: `A pasta "${root}" não existe ou não é um diretório. Confira o caminho de --root.` };
  }
  let names: string[] = [];
  try {
    names = fs.listDir?.(root) ?? [];
  } catch {
    return { message: `Não foi possível listar a pasta "${root}". Confira as permissões de --root.` };
  }

  const refs: WorktreeRef[] = [];
  // Só subpastas diretas; sem recursão. Symlinks e itens sem estado são ignorados.
  for (const name of [...names].sort()) {
    const sub = join(root, name);
    if (isSymlink(fs, sub) || !isDirectory(fs, sub)) continue;
    let hasState = false;
    try {
      hasState = fs.exists(stateFilePath(sub));
    } catch {
      hasState = false;
    }
    if (!hasState) continue;
    const resolved = resolveTarget({ dir: sub, repoRoot, git, fs });
    if (resolved.kind === 'one') refs.push(resolved.ref);
  }
  return { refs };
}

/** Resolve vários alvos a partir de `--dir` (repetível) e `--root`. Duplicatas são removidas. */
export function resolveTargets(input: {
  dirs: string[];
  root?: string;
  repoRoot: string;
  git: GitLike;
  fs: FsLike & FsProbe & FsDirs;
}): AggregateResult {
  const { dirs, root, repoRoot, git, fs } = input;
  const refs: WorktreeRef[] = [];
  const seen = new Set<string>();
  const add = (ref: WorktreeRef): void => {
    const key = normalizePath(ref.path);
    if (seen.has(key)) return;
    seen.add(key);
    refs.push(ref);
  };

  for (const dir of dirs) {
    const resolved = resolveTarget({ dir, repoRoot, git, fs });
    if (resolved.kind === 'not-found') return { kind: 'not-found', message: resolved.message };
    if (resolved.kind === 'one') add(resolved.ref);
  }

  if (root !== undefined && root.length > 0) {
    const scanned = scanRoot(root, repoRoot, git, fs);
    if ('message' in scanned) return { kind: 'not-found', message: scanned.message };
    scanned.refs.forEach(add);
  }

  return refs.length === 0 ? { kind: 'none' } : { kind: 'ok', refs };
}

// ---------------------------------------------------------------------------
// Resumo por pipeline (aba "Todas")
// ---------------------------------------------------------------------------

export interface PipelineSummary {
  code: string;
  state: string;
  /** Ex.: `etapa 2 (frontend)`; `null` quando não há etapa em andamento/pendente. */
  currentStep: string | null;
  done: number;
  total: number;
}

function currentStepLabel(state: PipelineState): string | null {
  const step = state.steps.find((s) => s.status === 'running') ?? state.steps.find((s) => s.status === 'pending');
  return step ? `etapa ${step.index} (${step.agent})` : null;
}

export function summarizeState(state: PipelineState): PipelineSummary {
  return {
    code: state.code,
    state: state.state,
    currentStep: currentStepLabel(state),
    done: state.steps.filter((s) => s.status === 'done').length,
    total: state.steps.length,
  };
}

/** Resumo de uma leitura; `null` quando o estado não pôde ser lido. */
export function summarizeResult(result: ReadResult): PipelineSummary | null {
  return result.ok ? summarizeState(result.state) : null;
}

/** `FING-N · state · etapa atual · k/n`. */
export function formatSummary(summary: PipelineSummary): string {
  return [summary.code, summary.state, summary.currentStep ?? '—', `${summary.done}/${summary.total}`].join(' · ');
}

/** Leitura única de todos os alvos (usada pelo `--dump`). Nunca lança. */
export function readSummaries(refs: WorktreeRef[], fs: FsLike & FsProbe): Array<PipelineSummary | null> {
  return refs.map((ref) => summarizeResult(readState(ref.path, fs)));
}
