import { describe, expect, it } from 'vitest';
import { mapToBoard } from './mapToBoard.js';
import type { PipelineState } from './types.js';

const AGORA = new Date('2026-11-01T10:10:00.000Z');

function estado(overrides: Partial<PipelineState> = {}): PipelineState {
  return {
    code: 'FING-30',
    slug: 'fg-tui',
    notionPageUrl: 'https://notion.so/x',
    specPath: 'docs/specs/FING-30-fg-tui.md',
    worktree: '../FinanceGuy-FING-30',
    baseSha: 'abc1234',
    state: 'step_2_running',
    steps: [
      { index: 1, agent: 'devops', sessionID: 'ses_aaaaaaaaaaaa', model: 'm1', commit: 'abcdef1234567890', status: 'done' },
      { index: 2, agent: 'qa', sessionID: 'ses_bbbbbbbbbbbb', model: 'm2', commit: null, status: 'running' },
      { index: 3, agent: 'backend', sessionID: null, model: null, commit: null, status: 'pending' },
    ],
    review: { cycles: 0, findings: [] },
    updatedAt: '2026-11-01T10:09:00.000Z',
    ...overrides,
  };
}

function coluna(board: ReturnType<typeof mapToBoard>, id: string): number[] {
  const col = board.columns.find((c) => c.id === id);
  return col ? col.cards.map((c) => c.index) : [];
}

describe('mapToBoard - colunas', () => {
  it('dado step_2_running com 3 etapas, então agrupa cada etapa na coluna do seu status', () => {
    const board = mapToBoard(estado(), AGORA);
    expect(board.columns.map((c) => c.id)).toEqual(['pending', 'running', 'done', 'failed']);
    expect(coluna(board, 'done')).toEqual([1]);
    expect(coluna(board, 'running')).toEqual([2]);
    expect(coluna(board, 'pending')).toEqual([3]);
    expect(coluna(board, 'failed')).toEqual([]);
  });

  it('usa os títulos pt-BR das colunas', () => {
    const board = mapToBoard(estado(), AGORA);
    expect(board.columns.map((c) => c.title)).toEqual(['Pendente', 'Rodando', 'Concluída', 'Falhou']);
  });

  it('mantém a ordem por index dentro da coluna, mesmo com steps desordenados', () => {
    const steps: PipelineState['steps'] = [
      { index: 3, agent: 'c', sessionID: null, model: null, commit: null, status: 'pending' },
      { index: 1, agent: 'a', sessionID: null, model: null, commit: null, status: 'pending' },
      { index: 2, agent: 'b', sessionID: null, model: null, commit: null, status: 'pending' },
    ];
    expect(coluna(mapToBoard(estado({ steps }), AGORA), 'pending')).toEqual([1, 2, 3]);
  });

  it('dado steps vazio, então as quatro colunas existem e estão vazias', () => {
    const board = mapToBoard(estado({ steps: [] }), AGORA);
    expect(board.columns).toHaveLength(4);
    for (const c of board.columns) expect(c.cards).toEqual([]);
  });

  it('abrevia o commit e a sessão, e preserva null quando ausentes', () => {
    const board = mapToBoard(estado(), AGORA);
    const concluida = board.columns.find((c) => c.id === 'done')?.cards[0];
    expect(concluida?.commitShort).toBe('abcdef1');
    expect(concluida?.sessionShort).not.toBeNull();
    const pendente = board.columns.find((c) => c.id === 'pending')?.cards[0];
    expect(pendente?.commitShort).toBeNull();
    expect(pendente?.sessionShort).toBeNull();
    expect(pendente?.model).toBeNull();
  });

  it('copia código, slug, estado e updatedAt para o board', () => {
    const board = mapToBoard(estado(), AGORA);
    expect(board).toMatchObject({
      code: 'FING-30',
      slug: 'fg-tui',
      state: 'step_2_running',
      updatedAt: '2026-11-01T10:09:00.000Z',
    });
  });
});

describe('mapToBoard - PhaseBar', () => {
  function fase(board: ReturnType<typeof mapToBoard>, label: string): string | undefined {
    return board.phases.find((p) => p.label === label)?.status;
  }

  it('expõe as 8 fases fixas na ordem', () => {
    const board = mapToBoard(estado(), AGORA);
    expect(board.phases.map((p) => p.label)).toEqual([
      'Card Notion',
      'Spec aprovada',
      'Worktree',
      'Setup',
      'Implementação',
      'Revisão',
      'Commitado',
      'Push',
    ]);
  });

  it('dado step_2_running, então Implementação é current e as 4 anteriores são done', () => {
    const board = mapToBoard(estado(), AGORA);
    expect(fase(board, 'Implementação')).toBe('current');
    for (const label of ['Card Notion', 'Spec aprovada', 'Worktree', 'Setup']) {
      expect(fase(board, label)).toBe('done');
    }
    for (const label of ['Revisão', 'Commitado', 'Push']) {
      expect(fase(board, label)).toBe('pending');
    }
  });

  it('dado review_cycle_1, então Revisão é current e Implementação é done', () => {
    const board = mapToBoard(estado({ state: 'review_cycle_1' }), AGORA);
    expect(fase(board, 'Revisão')).toBe('current');
    expect(fase(board, 'Implementação')).toBe('done');
  });

  it('dado notion_ready, então só Card Notion é current e o resto pendente', () => {
    const board = mapToBoard(estado({ state: 'notion_ready', steps: [] }), AGORA);
    expect(fase(board, 'Card Notion')).toBe('current');
    expect(board.phases.filter((p) => p.status === 'current')).toHaveLength(1);
    expect(board.phases.filter((p) => p.status === 'done')).toHaveLength(0);
  });

  it('dado pushed, então Push é current e as 7 anteriores são done', () => {
    const board = mapToBoard(estado({ state: 'pushed' }), AGORA);
    expect(fase(board, 'Push')).toBe('current');
    expect(board.phases.filter((p) => p.status === 'done')).toHaveLength(7);
  });

  it('dado estado desconhecido, então não lança e nenhuma fase é current', () => {
    const board = mapToBoard(estado({ state: 'estado_do_futuro' }), AGORA);
    expect(board.phases.some((p) => p.status === 'current')).toBe(false);
    expect(board.state).toBe('estado_do_futuro');
  });

  it('dado failed com failedAt em step_2_running, então Implementação é failed', () => {
    const board = mapToBoard(
      estado({ state: 'failed', failedAt: 'step_2_running', reason: 'testes falharam' }),
      AGORA,
    );
    expect(fase(board, 'Implementação')).toBe('failed');
  });

  it('dado failed com failedAt desconhecido, então não lança e nenhuma fase é failed', () => {
    const board = mapToBoard(estado({ state: 'failed', failedAt: 'xyz', reason: 'r' }), AGORA);
    expect(board.phases.some((p) => p.status === 'failed')).toBe(false);
  });
});

describe('mapToBoard - stale (parado)', () => {
  function cardRodando(updatedAt: string): boolean | undefined {
    const board = mapToBoard(estado({ updatedAt }), AGORA);
    return board.columns.find((c) => c.id === 'running')?.cards[0]?.stale;
  }

  it('dado running com updatedAt de 6 min atrás, então stale é true', () => {
    expect(cardRodando('2026-11-01T10:04:00.000Z')).toBe(true);
  });

  it('dado running com updatedAt de 1 min atrás, então stale é false', () => {
    expect(cardRodando('2026-11-01T10:09:00.000Z')).toBe(false);
  });

  it('limite: exatamente 5 min não é stale; 5 min e 1 s é stale', () => {
    expect(cardRodando('2026-11-01T10:05:00.000Z')).toBe(false);
    expect(cardRodando('2026-11-01T10:04:59.000Z')).toBe(true);
  });

  it('etapa concluída ou pendente nunca é stale, mesmo com updatedAt antigo', () => {
    const board = mapToBoard(estado({ updatedAt: '2026-11-01T08:00:00.000Z' }), AGORA);
    const outras = board.columns.filter((c) => c.id !== 'running').flatMap((c) => c.cards);
    expect(outras.length).toBeGreaterThan(0);
    for (const card of outras) expect(card.stale).toBe(false);
  });
});

describe('mapToBoard - achados e portão', () => {
  it('normaliza os findings do estado', () => {
    const board = mapToBoard(
      estado({
        review: {
          cycles: 1,
          findings: [{ severity: 'alto', file: 'a.ts', line: 3, description: 'problema' }],
        },
      }),
      AGORA,
    );
    expect(board.findings).toEqual([
      { severity: 'alto', file: 'a.ts', line: 3, description: 'problema' },
    ]);
  });

  it('dado committed, então o board traz o gate de push', () => {
    const board = mapToBoard(estado({ state: 'committed' }), AGORA);
    expect(board.gate?.kind).toBe('push');
  });

  it('dado estado em andamento, então gate é null', () => {
    expect(mapToBoard(estado(), AGORA).gate).toBeNull();
  });
});

describe('mapToBoard - V3 (DAG e métricas)', () => {
  it('etapa pendente com dependência aberta expõe blockedBy; sem dependsOn fica vazio', () => {
    const steps: PipelineState['steps'] = [
      { index: 1, agent: 'a', sessionID: null, model: null, commit: null, status: 'running' },
      { index: 2, agent: 'b', sessionID: null, model: null, commit: null, status: 'pending', dependsOn: [1] },
      { index: 3, agent: 'c', sessionID: null, model: null, commit: null, status: 'pending' },
    ];
    const board = mapToBoard(estado({ steps }), AGORA);
    const cards = board.columns.flatMap((c) => c.cards);
    expect(cards.find((c) => c.index === 2)).toMatchObject({ dependsOn: [1], blockedBy: [1] });
    expect(cards.find((c) => c.index === 3)).toMatchObject({ dependsOn: [], blockedBy: [] });
    expect(board.ready).toEqual([3]);
    expect(board.dagCycle).toBe(false);
  });

  it('ciclo em dependsOn marca dagCycle', () => {
    const steps: PipelineState['steps'] = [
      { index: 1, agent: 'a', sessionID: null, model: null, commit: null, status: 'pending', dependsOn: [2] },
      { index: 2, agent: 'b', sessionID: null, model: null, commit: null, status: 'pending', dependsOn: [1] },
    ];
    expect(mapToBoard(estado({ steps }), AGORA).dagCycle).toBe(true);
  });

  it('inclui métricas derivadas do estado (e dos eventos, quando informados)', () => {
    const board = mapToBoard(estado(), AGORA);
    expect(board.metrics).toMatchObject({ total: 3, done: 1, running: 1 });
  });
});
