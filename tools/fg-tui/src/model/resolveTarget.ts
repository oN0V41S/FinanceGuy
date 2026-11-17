import { listWorktrees } from './listWorktrees.js';
import { STATE_FILE, readState, stateFilePath, type FsProbe } from './readState.js';
import type { FsLike, GitLike, WorktreeRef } from './types.js';

export type ResolveResult =
  | { kind: 'one'; ref: WorktreeRef }
  | { kind: 'many'; refs: WorktreeRef[] }
  | { kind: 'none' }
  | { kind: 'not-found'; message: string; reason?: 'no-state' };

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '');
}

function resolveDir(dir: string, repoRoot: string, git: GitLike, fs: FsLike & FsProbe): ResolveResult {
  let isDir = true;
  let isLink = false;
  try {
    if (fs.isDirectory) isDir = fs.isDirectory(dir);
    isLink = fs.isSymlink?.(dir) === true;
  } catch {
    isDir = false;
  }
  if (isLink) {
    return {
      kind: 'not-found',
      message: `"${dir}" é um link simbólico e foi recusado por segurança. Informe o caminho real da worktree com --dir.`,
    };
  }
  if (!isDir) {
    return {
      kind: 'not-found',
      message: `O diretório "${dir}" não existe ou não é um diretório. Confira o caminho de --dir (veja as worktrees com "git worktree list").`,
    };
  }

  let hasState = false;
  try {
    hasState = fs.exists(stateFilePath(dir));
  } catch {
    hasState = false;
  }
  if (!hasState) {
    return {
      kind: 'not-found',
      message: `Nenhum ${STATE_FILE} encontrado em "${dir}". Informe uma worktree com pipeline ativa ou use "pnpm fg tui --demo".`,
      reason: 'no-state',
    };
  }

  const known = listWorktrees(repoRoot, git, fs).find(
    (ref) => normalizePath(ref.path) === normalizePath(dir),
  );
  const read = readState(dir, fs);
  return {
    kind: 'one',
    ref: {
      path: dir,
      branch: known?.branch ?? null,
      code: read.ok ? read.state.code : null,
      state: read.ok ? read.state.state : null,
    },
  };
}

function resolveCode(code: string, refs: WorktreeRef[]): ResolveResult {
  const wanted = code.toUpperCase();
  const matches = refs.filter(
    (ref) => (ref.code ?? '').toUpperCase() === wanted || (ref.branch ?? '').toUpperCase() === wanted,
  );
  const [first] = matches;
  if (matches.length === 0 || !first) {
    return {
      kind: 'not-found',
      message: `Nenhuma pipeline encontrada para ${wanted}. Verifique o código ou use --dir <caminho>.`,
    };
  }
  if (matches.length === 1) return { kind: 'one', ref: first };
  return { kind: 'many', refs: matches };
}

/** Escolhe a worktree alvo: `--dir` vence tudo; depois `FING-N`; senão descoberta automática. */
export function resolveTarget(input: {
  dir?: string;
  code?: string;
  repoRoot: string;
  git: GitLike;
  fs: FsLike & FsProbe;
}): ResolveResult {
  const { dir, code, repoRoot, git, fs } = input;

  if (dir !== undefined && dir.length > 0) return resolveDir(dir, repoRoot, git, fs);

  const refs = listWorktrees(repoRoot, git, fs);
  if (code !== undefined && code.length > 0) return resolveCode(code, refs);

  const [first] = refs;
  if (refs.length === 0 || !first) return { kind: 'none' };
  if (refs.length === 1) return { kind: 'one', ref: first };
  return { kind: 'many', refs };
}
