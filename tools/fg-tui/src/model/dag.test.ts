import { describe, expect, it } from 'vitest';
import { analyzeDag } from './dag.js';

const s = (index: number, status: 'pending' | 'running' | 'done' | 'failed', dependsOn?: number[]) => ({
  index,
  status,
  ...(dependsOn !== undefined ? { dependsOn } : {}),
});

describe('analyzeDag', () => {
  it('sem dependsOn, nenhuma etapa fica bloqueada e todas pendentes estão prontas', () => {
    const r = analyzeDag([s(1, 'done'), s(2, 'pending'), s(3, 'pending')]);
    expect(r.cycle).toBe(false);
    expect(r.blockedBy.get(2)).toEqual([]);
    expect(r.ready).toEqual([2, 3]);
  });

  it('etapa pendente fica bloqueada pelas dependências não concluídas', () => {
    const r = analyzeDag([s(1, 'running'), s(2, 'done'), s(3, 'pending', [1, 2])]);
    expect(r.blockedBy.get(3)).toEqual([1]);
    expect(r.ready).toEqual([]);
  });

  it('etapas independentes ficam prontas ao mesmo tempo (paralelismo)', () => {
    const r = analyzeDag([s(1, 'done'), s(2, 'pending', [1]), s(3, 'pending', [1]), s(4, 'pending', [2, 3])]);
    expect(r.ready).toEqual([2, 3]);
    expect(r.blockedBy.get(4)).toEqual([2, 3]);
  });

  it('detecta ciclo e não marca nada como pronto', () => {
    const r = analyzeDag([s(1, 'pending', [2]), s(2, 'pending', [1])]);
    expect(r.cycle).toBe(true);
    expect(r.ready).toEqual([]);
  });

  it('ignora dependência para etapa inexistente ou para si mesma', () => {
    const r = analyzeDag([s(1, 'pending', [1, 9])]);
    expect(r.cycle).toBe(false);
    expect(r.blockedBy.get(1)).toEqual([]);
    expect(r.ready).toEqual([1]);
  });
});
