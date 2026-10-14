import { deriveChanges, deriveHints, MAX_CANDIDATES, splitSegment, TargetResolver } from '../targetResolver';
import type { EntityAdapter, TargetCandidate } from '../entityAdapters/types';
import { NOW } from '../../__fixtures__/agentFakes';

const cand = (id: string): TargetCandidate => ({ id, label: id, record: {} });

function resolverWith(search: jest.Mock) {
  return new TargetResolver({ transaction: { search } as unknown as EntityAdapter });
}

describe('splitSegment', () => {
  it('divide o update em "para"/"pra"', () => {
    expect(splitSegment('altere o mercado para 150', 'update')).toEqual({ targetText: 'altere o mercado', changesText: '150' });
    expect(splitSegment('muda aluguel pra 2000', 'update').changesText).toBe('2000');
  });
  it('sem "para" ou outra operação mantém tudo como alvo', () => {
    expect(splitSegment('altere o mercado', 'update')).toEqual({ targetText: 'altere o mercado', changesText: '' });
    expect(splitSegment('remova o mercado para x', 'delete').changesText).toBe('');
  });
});

describe('deriveHints', () => {
  it('ignora palavras de comando e usa nome, valor e data', () => {
    const h = deriveHints('altere a despesa mercado de 120 de ontem', NOW);
    expect(h.query).toBe('mercado');
    expect(h.amount).toBe(120);
    expect(h.date).toBe('2026-10-13');
  });
  it('sem palavras úteis não há query', () => {
    expect(deriveHints('remova a despesa', NOW).query).toBeUndefined();
  });
});

describe('deriveChanges', () => {
  it('extrai valor, categoria e pago', () => {
    const parts = splitSegment('altere o mercado para 150 reais categoria Lazer pago', 'update');
    const c = deriveChanges(parts, NOW);
    expect(c.value).toBe(150);
  });
  it('vazio quando não há mudanças', () => {
    expect(deriveChanges({ targetText: 'x', changesText: '' }, NOW)).toEqual({});
  });
  it('título quando o alvo fala em título/nome', () => {
    const c = deriveChanges({ targetText: 'mude o título do mercado', changesText: 'Supermercado' }, NOW);
    expect(c.title).toBe('Supermercado');
  });
});

describe('TargetResolver.resolve', () => {
  it('none sem adapter ou sem dicas (sem buscar)', async () => {
    const search = jest.fn();
    const r = resolverWith(search);
    expect(await r.resolve('u', 'investment', { query: 'x' })).toEqual({ kind: 'none' });
    expect(await r.resolve('u', 'transaction', {})).toEqual({ kind: 'none' });
    expect(search).not.toHaveBeenCalled();
  });

  it('one / many / none conforme a busca e limita a 5', async () => {
    const search = jest.fn();
    const r = resolverWith(search);
    search.mockResolvedValueOnce([cand('a')]);
    expect(await r.resolve('u', 'transaction', { query: 'x' })).toEqual({ kind: 'one', candidate: cand('a') });
    search.mockResolvedValueOnce(Array.from({ length: 8 }, (_, i) => cand(`c${i}`)));
    const many = await r.resolve('u', 'transaction', { query: 'x' });
    expect(many.kind === 'many' && many.candidates).toHaveLength(MAX_CANDIDATES);
    search.mockResolvedValueOnce([]);
    expect(await r.resolve('u', 'transaction', { query: 'x' })).toEqual({ kind: 'none' });
  });

  it('afrouxa para só o nome quando valor/data não acham nada', async () => {
    const search = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([cand('a')]);
    const res = await resolverWith(search).resolve('u', 'transaction', { query: 'x', amount: 9 });
    expect(res.kind).toBe('one');
    expect(search).toHaveBeenLastCalledWith('u', { query: 'x' });
  });
});
