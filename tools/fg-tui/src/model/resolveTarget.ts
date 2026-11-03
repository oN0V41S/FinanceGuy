import type { FsLike, GitLike, WorktreeRef } from './types.js';

export type ResolveResult =
  | { kind: 'one'; ref: WorktreeRef }
  | { kind: 'many'; refs: WorktreeRef[] }
  | { kind: 'none' }
  | { kind: 'not-found'; message: string };

export function resolveTarget(input: {
  dir?: string;
  code?: string;
  repoRoot: string;
  git: GitLike;
  fs: FsLike;
}): ResolveResult {
  void input;
  throw new Error('not implemented');
}
