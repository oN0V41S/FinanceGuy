import { describe, expect, it } from 'vitest';
import { PipelineStateSchema, StepSchema } from './schema.js';

function estadoValido(): Record<string, unknown> {
  return {
    code: 'FING-30',
    slug: 'fg-tui',
    notionPageUrl: 'https://notion.so/x',
    specPath: 'docs/specs/FING-30-fg-tui.md',
    worktree: '../FinanceGuy-FING-30',
    baseSha: 'abc1234',
    state: 'step_2_running',
    steps: [
      { index: 1, agent: 'qa', sessionID: null, model: null, commit: null, status: 'done' },
    ],
    review: { cycles: 0, findings: [] },
    updatedAt: '2026-11-01T10:00:00.000Z',
  };
}

describe('PipelineStateSchema', () => {
  it('dado um estado completo, quando validado, então é aceito', () => {
    expect(PipelineStateSchema.safeParse(estadoValido()).success).toBe(true);
  });

  it('dado um campo extra desconhecido, quando validado, então é aceito (schema não estrito)', () => {
    const resultado = PipelineStateSchema.safeParse({ ...estadoValido(), novoCampo: 42 });
    expect(resultado.success).toBe(true);
  });

  it('dado um campo obrigatório ausente, quando validado, então falha apontando o campo', () => {
    const { slug: _slug, ...semSlug } = estadoValido();
    const resultado = PipelineStateSchema.safeParse(semSlug);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.path).toEqual(['slug']);
    }
  });

  it.each(['FING-1', 'FING-30', 'FING-1234'])('aceita code %s', (code) => {
    expect(PipelineStateSchema.safeParse({ ...estadoValido(), code }).success).toBe(true);
  });

  it.each(['fing-30', 'FING-', 'FING-x', 'ABC-30', ''])('rejeita code inválido "%s"', (code) => {
    expect(PipelineStateSchema.safeParse({ ...estadoValido(), code }).success).toBe(false);
  });

  it('aceita failedAt e reason opcionais', () => {
    const resultado = PipelineStateSchema.safeParse({
      ...estadoValido(),
      state: 'failed',
      failedAt: 'step_2_running',
      reason: 'testes falharam',
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita review.cycles negativo', () => {
    const resultado = PipelineStateSchema.safeParse({
      ...estadoValido(),
      review: { cycles: -1, findings: [] },
    });
    expect(resultado.success).toBe(false);
  });
});

describe('StepSchema', () => {
  const etapa = { index: 1, agent: 'qa', sessionID: null, model: null, commit: null, status: 'pending' };

  it('aceita as quatro classes de status', () => {
    for (const status of ['pending', 'running', 'done', 'failed']) {
      expect(StepSchema.safeParse({ ...etapa, status }).success).toBe(true);
    }
  });

  it('rejeita status desconhecido', () => {
    expect(StepSchema.safeParse({ ...etapa, status: 'paused' }).success).toBe(false);
  });

  it('rejeita index 0 (limite: deve ser positivo) e aceita 1', () => {
    expect(StepSchema.safeParse({ ...etapa, index: 0 }).success).toBe(false);
    expect(StepSchema.safeParse({ ...etapa, index: 1 }).success).toBe(true);
  });
});
