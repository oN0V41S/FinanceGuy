import { describe, expect, it } from 'vitest';
import { parseState } from './parseState.js';

describe('parseState', () => {
  it('dado step_2_running, então reconhece etapa 2 em execução', () => {
    expect(parseState('step_2_running')).toEqual({ kind: 'step', index: 2, phase: 'running' });
  });

  it('dado step_3_done, então reconhece etapa 3 concluída', () => {
    expect(parseState('step_3_done')).toEqual({ kind: 'step', index: 3, phase: 'done' });
  });

  it('dado step_10_running (índice com dois dígitos), então reconhece índice 10', () => {
    expect(parseState('step_10_running')).toEqual({ kind: 'step', index: 10, phase: 'running' });
  });

  it('dado review_cycle_1, então reconhece ciclo de revisão 1', () => {
    expect(parseState('review_cycle_1')).toEqual({ kind: 'review', cycle: 1 });
  });

  it.each([
    'notion_ready',
    'spec_approved',
    'worktree_ready',
    'setup_done',
    'committed',
    'pushed',
    'failed',
  ])('dado o estado conhecido %s, então kind é known', (nome) => {
    expect(parseState(nome)).toEqual({ kind: 'known', name: nome });
  });

  it.each(['', 'algo_novo', 'step_x_running', 'step_2_paused', 'review_cycle_', 'STEP_2_RUNNING'])(
    'dado o estado desconhecido "%s", então não lança e devolve unknown com o valor cru',
    (raw) => {
      expect(parseState(raw)).toEqual({ kind: 'unknown', raw });
    },
  );
});
