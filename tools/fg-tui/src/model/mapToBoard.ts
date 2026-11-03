import { detectGate } from './detectGate.js';
import { normalizeFinding } from './normalizeFinding.js';
import { parseState } from './parseState.js';
import { sanitizeText } from './sanitizeText.js';
import type {
  Board,
  BoardCard,
  BoardColumn,
  Gate,
  PhaseItem,
  PhaseStatus,
  PipelineState,
} from './types.js';

const STALE_MS = 5 * 60 * 1000;

const PHASE_LABELS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'notion', label: 'Card Notion' },
  { id: 'spec', label: 'Spec aprovada' },
  { id: 'worktree', label: 'Worktree' },
  { id: 'setup', label: 'Setup' },
  { id: 'impl', label: 'Implementação' },
  { id: 'review', label: 'Revisão' },
  { id: 'committed', label: 'Commitado' },
  { id: 'push', label: 'Push' },
];

const KNOWN_PHASE: Record<string, number> = {
  notion_ready: 1,
  spec_approved: 2,
  worktree_ready: 3,
  setup_done: 4,
  committed: 7,
  pushed: 8,
};

/** Número da fase (1..8) correspondente a um valor de `state`, ou null se desconhecido. */
function phaseNumber(stateName: string): number | null {
  const parsed = parseState(stateName);
  switch (parsed.kind) {
    case 'known':
      return KNOWN_PHASE[parsed.name] ?? null;
    case 'step':
      return 5;
    case 'review':
      return 6;
    case 'unknown':
      return null;
  }
}

function buildPhases(state: PipelineState): PhaseItem[] {
  const isFailed = state.state === 'failed';
  const target = phaseNumber(isFailed ? (state.failedAt ?? '') : state.state);

  return PHASE_LABELS.map((phase, i): PhaseItem => {
    const number = i + 1;
    let status: PhaseStatus = 'pending';
    if (target !== null) {
      if (number < target) status = 'done';
      else if (number === target) status = isFailed ? 'failed' : 'current';
    }
    return { id: phase.id, label: phase.label, status };
  });
}

function shorten(value: string | null, size: number): string | null {
  if (value === null || value.length === 0) return null;
  return sanitizeText(value).slice(0, size);
}

function isStale(updatedAt: string, now: Date): boolean {
  const updated = Date.parse(updatedAt);
  if (Number.isNaN(updated)) return false;
  return now.getTime() - updated > STALE_MS;
}

function sanitizeGate(gate: Gate | null): Gate | null {
  if (gate === null) return null;
  return {
    kind: gate.kind,
    title: sanitizeText(gate.title),
    message: sanitizeText(gate.message),
    ...(gate.command !== undefined ? { command: sanitizeText(gate.command) } : {}),
  };
}

const COLUMNS: ReadonlyArray<{ id: BoardColumn['id']; title: string }> = [
  { id: 'pending', title: 'Pendente' },
  { id: 'running', title: 'Rodando' },
  { id: 'done', title: 'Concluída' },
  { id: 'failed', title: 'Falhou' },
];

/** Converte o estado do pipeline no modelo de apresentação do Kanban (puro). */
export function mapToBoard(state: PipelineState, now: Date): Board {
  const stale = isStale(state.updatedAt, now);
  const steps = [...state.steps].sort((a, b) => a.index - b.index);

  const columns: BoardColumn[] = COLUMNS.map((col) => ({
    id: col.id,
    title: col.title,
    cards: steps
      .filter((step) => step.status === col.id)
      .map(
        (step): BoardCard => ({
          index: step.index,
          agent: sanitizeText(step.agent),
          status: step.status,
          model: step.model === null ? null : sanitizeText(step.model),
          sessionShort: shorten(step.sessionID, 8),
          commitShort: shorten(step.commit, 7),
          stale: step.status === 'running' && stale,
        }),
      ),
  }));

  return {
    code: sanitizeText(state.code),
    slug: sanitizeText(state.slug),
    state: sanitizeText(state.state),
    updatedAt: sanitizeText(state.updatedAt),
    phases: buildPhases(state),
    columns,
    findings: state.review.findings.map(normalizeFinding),
    gate: sanitizeGate(detectGate(state)),
  };
}
