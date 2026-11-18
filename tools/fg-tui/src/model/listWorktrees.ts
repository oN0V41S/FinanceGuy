import { readState, stateFilePath } from './readState.js';
import type { FsLike, GitLike, WorktreeRef } from './types.js';

interface RawWorktree {
  path: string;
  branch: string | null;
}

const BRANCH_PREFIX = 'refs/heads/';

function parsePorcelain(output: string): RawWorktree[] {
  const result: RawWorktree[] = [];
  let current: RawWorktree | null = null;

  for (const line of output.split(/\r?\n/)) {
    if (line.startsWith('worktree ')) {
      current = { path: line.slice('worktree '.length).trim(), branch: null };
      result.push(current);
    } else if (current && line.startsWith('branch ')) {
      const ref = line.slice('branch '.length).trim();
      current.branch = ref.startsWith(BRANCH_PREFIX) ? ref.slice(BRANCH_PREFIX.length) : ref;
    } else if (line.trim() === '') {
      current = null;
    }
  }
  return result;
}

/** Lista as worktrees do repositório que contêm `.fg-pipeline.json`. Nunca lança. */
export function listWorktrees(repoRoot: string, git: GitLike, fs: FsLike): WorktreeRef[] {
  let output: string;
  try {
    output = git.worktreeListPorcelain(repoRoot);
  } catch {
    return [];
  }

  const refs: WorktreeRef[] = [];
  for (const wt of parsePorcelain(output)) {
    let hasState = false;
    try {
      hasState = fs.exists(stateFilePath(wt.path));
    } catch {
      hasState = false;
    }
    if (!hasState) continue;

    const read = readState(wt.path, fs);
    refs.push({
      path: wt.path,
      branch: wt.branch,
      code: read.ok ? read.state.code : null,
      state: read.ok ? read.state.state : null,
    });
  }
  return refs;
}
