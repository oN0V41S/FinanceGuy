import type { PipelineEvent } from './events.js';
import type { PipelineState } from './types.js';

export interface Metrics {
  total: number;
  done: number;
  failed: number;
  running: number;
  reviewCycles: number;
  /** % de etapas concluídas sem `step_failed` antes (null sem eventos ou sem concluídas). */
  firstTryGreenPct: number | null;
  /** Média de `step_started` → `step_done` (ms), null sem pares. */
  avgStepMs: number | null;
  /** Primeiro → último evento (ms), null com menos de 2 eventos. */
  wallMs: number | null;
  /** Máximo de etapas rodando ao mesmo tempo (eventos; mínimo = rodando agora). */
  parallelPeak: number;
}

function ts(e: PipelineEvent): number {
  return Date.parse(e.ts);
}

/** Métricas de eficácia derivadas do estado e dos eventos (puro, somente leitura). */
export function computeMetrics(state: PipelineState, events: readonly PipelineEvent[]): Metrics {
  const count = (status: PipelineState['steps'][number]['status']): number =>
    state.steps.filter((step) => step.status === status).length;
  const sorted = [...events].sort((a, b) => ts(a) - ts(b));

  const failedBefore = new Set<number>();
  const startedAt = new Map<number, number>();
  const durations: number[] = [];
  let firstTry = 0;
  let finished = 0;
  let live = 0;
  let peak = 0;

  for (const e of sorted) {
    if (e.step === null) continue;
    if (e.type === 'step_started') {
      startedAt.set(e.step, ts(e));
      live += 1;
      peak = Math.max(peak, live);
    } else if (e.type === 'step_failed') {
      failedBefore.add(e.step);
      live = Math.max(0, live - 1);
    } else if (e.type === 'step_done') {
      finished += 1;
      if (!failedBefore.has(e.step)) firstTry += 1;
      const start = startedAt.get(e.step);
      if (start !== undefined) durations.push(ts(e) - start);
      live = Math.max(0, live - 1);
    }
  }

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return {
    total: state.steps.length,
    done: count('done'),
    failed: count('failed'),
    running: count('running'),
    reviewCycles: state.review.cycles,
    firstTryGreenPct: finished === 0 ? null : Math.round((firstTry / finished) * 100),
    avgStepMs: durations.length === 0 ? null : Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    wallMs: sorted.length < 2 || first === undefined || last === undefined ? null : ts(last) - ts(first),
    parallelPeak: Math.max(peak, count('running')),
  };
}
