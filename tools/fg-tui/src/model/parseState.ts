export type ParsedState =
  | { kind: 'known'; name: string }
  | { kind: 'step'; index: number; phase: 'running' | 'done' }
  | { kind: 'review'; cycle: number }
  | { kind: 'unknown'; raw: string };

const KNOWN_STATES: readonly string[] = [
  'notion_ready',
  'spec_approved',
  'worktree_ready',
  'setup_done',
  'committed',
  'pushed',
  'failed',
];

const STEP_RE = /^step_(\d+)_(running|done)$/;
const REVIEW_RE = /^review_cycle_(\d+)$/;

/** Classifica o campo `state` do pipeline sem nunca lançar (estados novos viram `unknown`). */
export function parseState(s: string): ParsedState {
  if (KNOWN_STATES.includes(s)) return { kind: 'known', name: s };

  const step = STEP_RE.exec(s);
  if (step) {
    const phase = step[2] === 'done' ? 'done' : 'running';
    return { kind: 'step', index: Number(step[1]), phase };
  }

  const review = REVIEW_RE.exec(s);
  if (review) return { kind: 'review', cycle: Number(review[1]) };

  return { kind: 'unknown', raw: s };
}
