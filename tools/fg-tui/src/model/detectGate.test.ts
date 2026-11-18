import { describe, expect, it } from 'vitest';
import { detectGate } from './detectGate.js';
import type { PipelineState } from './types.js';

function estado(overrides: Partial<PipelineState> = {}): PipelineState {
  return {
    code: 'FING-30',
    slug: 'fg-tui',
    notionPageUrl: 'https://notion.so/x',
    specPath: 'docs/specs/FING-30-fg-tui.md',
    worktree: '../FinanceGuy-FING-30',
    baseSha: 'abc1234',
    state: 'committed',
    steps: [],
    review: { cycles: 0, findings: [] },
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('detectGate', () => {
  it('dado committed, então devolve o portão de push com o comando git', () => {
    const gate = detectGate(estado({ state: 'committed' }));
    expect(gate).not.toBeNull();
    expect(gate?.kind).toBe('push');
    expect(gate?.command).toBe('git push -u origin FING-30');
    expect(gate?.title).toContain('FING-30');
  });

  it('o comando de push usa o code do estado', () => {
    expect(detectGate(estado({ code: 'FING-7' }))?.command).toBe('git push -u origin FING-7');
  });

  it('dado failed, então devolve o portão failed citando failedAt e reason', () => {
    const gate = detectGate(
      estado({ state: 'failed', failedAt: 'step_2_running', reason: 'testes falharam' }),
    );
    expect(gate?.kind).toBe('failed');
    expect(gate?.message).toContain('step_2_running');
    expect(gate?.message).toContain('testes falharam');
  });

  it('dado failed sem failedAt/reason, então ainda devolve o portão failed sem lançar', () => {
    expect(detectGate(estado({ state: 'failed' }))?.kind).toBe('failed');
  });

  it.each(['notion_ready', 'spec_approved', 'step_2_running', 'review_cycle_1', 'pushed', 'estado_novo'])(
    'dado %s, então não há portão',
    (state) => {
      expect(detectGate(estado({ state }))).toBeNull();
    },
  );
});
