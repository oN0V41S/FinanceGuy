import type { PipelineState } from './schema.js';

export type { PipelineState } from './schema.js';

export type ReadResult =
  | { ok: true; state: PipelineState }
  | {
      ok: false;
      kind: 'missing' | 'unreadable' | 'invalid-json' | 'invalid-schema';
      message: string;
    };

/** Porta de leitura do sistema de arquivos (caminhos absolutos). */
export interface FsLike {
  exists(p: string): boolean;
  readFile(p: string): string;
}

/** Porta de leitura do git. */
export interface GitLike {
  worktreeListPorcelain(repoRoot: string): string;
}

export interface WorktreeRef {
  path: string;
  branch: string | null;
  code: string | null;
  state: string | null;
}

export type PhaseStatus = 'done' | 'current' | 'pending' | 'failed';

export interface PhaseItem {
  id: string;
  label: string;
  status: PhaseStatus;
}

export interface BoardCard {
  index: number;
  agent: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  model: string | null;
  sessionShort: string | null;
  commitShort: string | null;
  stale: boolean;
}

export interface BoardColumn {
  id: 'pending' | 'running' | 'done' | 'failed';
  title: string;
  cards: BoardCard[];
}

export type GateKind = 'push' | 'failed';

export interface Gate {
  kind: GateKind;
  title: string;
  message: string;
  command?: string;
}

export interface Finding {
  severity: 'critico' | 'alto' | 'medio' | 'baixo' | 'desconhecido';
  file: string | null;
  line: number | null;
  description: string;
}

export interface Board {
  code: string;
  slug: string;
  state: string;
  updatedAt: string;
  phases: PhaseItem[];
  columns: BoardColumn[];
  findings: Finding[];
  gate: Gate | null;
}
