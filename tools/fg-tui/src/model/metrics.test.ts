import { describe, expect, it } from 'vitest';
import { computeMetrics } from './metrics.js';
import type { PipelineEvent } from './events.js';
import type { PipelineState } from './types.js';

function st(steps: PipelineState['steps'], cycles = 0): PipelineState {
  return {
    code: 'FING-1', slug: 'x', notionPageUrl: '', specPath: '', worktree: '', baseSha: 'a',
    state: 'step_2_running', steps, review: { cycles, findings: [] }, updatedAt: '2026-11-01T10:00:00.000Z',
  };
}
const step = (index: number, status: PipelineState['steps'][number]['status']): PipelineState['steps'][number] => ({
  index, agent: 'a', sessionID: null, model: null, commit: null, status,
});
const ev = (ts: string, type: PipelineEvent['type'], stepIdx: number): PipelineEvent => ({ ts, type, step: stepIdx, message: 'm' });

describe('computeMetrics', () => {
  it('sem eventos: contagens vêm do estado e tempos ficam nulos', () => {
    const m = computeMetrics(st([step(1, 'done'), step(2, 'running'), step(3, 'pending')], 1), []);
    expect(m).toMatchObject({ total: 3, done: 1, failed: 0, running: 1, reviewCycles: 1, firstTryGreenPct: null, avgStepMs: null, wallMs: null, parallelPeak: 1 });
  });

  it('firstTryGreen: etapas concluídas sem step_failed anterior / concluídas', () => {
    const m = computeMetrics(st([step(1, 'done'), step(2, 'done')]), [
      ev('2026-11-01T10:00:00Z', 'step_started', 1), ev('2026-11-01T10:01:00Z', 'step_done', 1),
      ev('2026-11-01T10:01:00Z', 'step_started', 2), ev('2026-11-01T10:02:00Z', 'step_failed', 2),
      ev('2026-11-01T10:03:00Z', 'step_started', 2), ev('2026-11-01T10:04:00Z', 'step_done', 2),
    ]);
    expect(m.firstTryGreenPct).toBe(50);
  });

  it('tempo médio por etapa usa started→done; wall usa primeiro→último evento', () => {
    const m = computeMetrics(st([step(1, 'done'), step(2, 'done')]), [
      ev('2026-11-01T10:00:00Z', 'step_started', 1), ev('2026-11-01T10:01:00Z', 'step_done', 1),
      ev('2026-11-01T10:01:00Z', 'step_started', 2), ev('2026-11-01T10:04:00Z', 'step_done', 2),
    ]);
    expect(m.avgStepMs).toBe(120_000);
    expect(m.wallMs).toBe(240_000);
  });

  it('parallelPeak: máximo de etapas rodando simultaneamente (eventos)', () => {
    const m = computeMetrics(st([step(1, 'done'), step(2, 'done'), step(3, 'done')]), [
      ev('2026-11-01T10:00:00Z', 'step_started', 1), ev('2026-11-01T10:00:10Z', 'step_started', 2),
      ev('2026-11-01T10:00:20Z', 'step_started', 3), ev('2026-11-01T10:01:00Z', 'step_done', 1),
      ev('2026-11-01T10:01:10Z', 'step_done', 2), ev('2026-11-01T10:01:20Z', 'step_done', 3),
    ]);
    expect(m.parallelPeak).toBe(3);
  });
});
