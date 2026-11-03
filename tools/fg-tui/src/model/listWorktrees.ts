import type { FsLike, GitLike, WorktreeRef } from './types.js';

export function listWorktrees(repoRoot: string, git: GitLike, fs: FsLike): WorktreeRef[] {
  void repoRoot;
  void git;
  void fs;
  throw new Error('not implemented');
}
