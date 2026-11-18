import type { Category } from '@/features/categories/validations';
import { SEM_CATEGORIA_COLOR, SEM_CATEGORIA_NAME, summarizeByCategory } from '../portfolioSummary';
import type { Investment } from '../validations';

const category = (over: Partial<Category>): Category => ({
  id: 'cat-1',
  name: 'Renda Fixa',
  type: 'both',
  color: '#3B82F6',
  icon: null,
  isDefault: true,
  scope: 'investment',
  ...over,
});

const investment = (over: Partial<Investment>): Investment => ({
  id: 'inv-1',
  name: 'CDB 1',
  type: 'Renda Fixa',
  value: 100,
  status: 'ACTIVE',
  categoryId: null,
  category: null,
  ...over,
});

const categorias: Category[] = [
  category({ id: 'c-rf', name: 'Renda Fixa', color: '#3B82F6' }),
  category({ id: 'c-cripto', name: 'Cripto', color: '#EAB308' }),
  category({ id: 'c-vb', name: 'Renda Variável', color: '#8B5CF6' }),
];

describe('summarizeByCategory', () => {
  it('agrupa por categoria, ordena por total desc e soma pct 100', () => {
    const summary = summarizeByCategory(
      [
        investment({ id: 'i1', categoryId: 'c-rf', value: 300 }),
        investment({ id: 'i2', categoryId: 'c-rf', value: 100 }),
        investment({ id: 'i3', categoryId: 'c-cripto', value: 100 }),
      ],
      categorias,
    );

    expect(summary.total).toBe(500);
    expect(summary.slices).toEqual([
      { categoryId: 'c-rf', name: 'Renda Fixa', color: '#3B82F6', total: 400, pct: 80, count: 2 },
      { categoryId: 'c-cripto', name: 'Cripto', color: '#EAB308', total: 100, pct: 20, count: 1 },
    ]);
    expect(summary.slices.reduce((sum, s) => sum + s.pct, 0)).toBe(100);
  });

  it('ignora resgatados (REDEEMED) e valores zero/negativos', () => {
    const summary = summarizeByCategory(
      [
        investment({ id: 'i1', categoryId: 'c-rf', value: 200 }),
        investment({ id: 'i2', categoryId: 'c-rf', value: 999, status: 'REDEEMED' }),
        investment({ id: 'i3', categoryId: 'c-cripto', value: 0 }),
        investment({ id: 'i4', categoryId: 'c-cripto', value: -50 }),
      ],
      categorias,
    );

    expect(summary).toEqual({
      total: 200,
      slices: [{ categoryId: 'c-rf', name: 'Renda Fixa', color: '#3B82F6', total: 200, pct: 100, count: 1 }],
    });
  });

  it('cria "Sem categoria" em cinza apenas quando há ativos sem categoria', () => {
    const comSemCategoria = summarizeByCategory(
      [investment({ id: 'i1', categoryId: 'c-rf', value: 100 }), investment({ id: 'i2', value: 100 })],
      categorias,
    );
    expect(comSemCategoria.slices[1]).toEqual({
      categoryId: null,
      name: SEM_CATEGORIA_NAME,
      color: SEM_CATEGORIA_COLOR,
      total: 100,
      pct: 50,
      count: 1,
    });

    const todosCategorizados = summarizeByCategory(
      [investment({ id: 'i1', categoryId: 'c-rf', value: 100 })],
      categorias,
    );
    expect(todosCategorizados.slices).toHaveLength(1);
    expect(todosCategorizados.slices.some((s) => s.name === SEM_CATEGORIA_NAME)).toBe(false);
  });

  it('total zero (sem ativos válidos) devolve slices vazio', () => {
    expect(summarizeByCategory([], categorias)).toEqual({ total: 0, slices: [] });
    expect(
      summarizeByCategory([investment({ value: 10, status: 'REDEEMED' }), investment({ value: 0 })], categorias),
    ).toEqual({ total: 0, slices: [] });
  });

  it('a maior fatia absorve o resto do arredondamento (soma exatamente 100)', () => {
    const summary = summarizeByCategory(
      [
        investment({ id: 'i1', categoryId: 'c-rf', value: 1 }),
        investment({ id: 'i2', categoryId: 'c-cripto', value: 1 }),
        investment({ id: 'i3', categoryId: 'c-vb', value: 1 }),
      ],
      categorias,
    );

    expect(summary.slices.map((s) => s.pct)).toEqual([33.34, 33.33, 33.33]);
    expect(summary.slices.reduce((sum, s) => sum + s.pct, 0)).toBe(100);
  });

  it('categoryId fora da lista usa o join embutido; sem join nenhum, vira "Sem categoria"', () => {
    const summary = summarizeByCategory(
      [
        investment({
          id: 'i1',
          categoryId: 'c-desconhecida',
          category: { id: 'c-desconhecida', name: 'Cripto', color: '#EAB308' },
          value: 100,
        }),
        investment({ id: 'i2', categoryId: 'c-outra-sem-join', category: null, value: 50 }),
      ],
      categorias,
    );

    expect(summary.slices).toEqual([
      { categoryId: 'c-desconhecida', name: 'Cripto', color: '#EAB308', total: 100, pct: 66.67, count: 1 },
      { categoryId: null, name: SEM_CATEGORIA_NAME, color: SEM_CATEGORIA_COLOR, total: 50, pct: 33.33, count: 1 },
    ]);
  });

  it('categoria sem cor mantém color null e não muta os inputs', () => {
    const investimentos = [investment({ id: 'i1', categoryId: 'c-rf', value: 40 })];
    const semCor = [category({ id: 'c-rf', name: 'Renda Fixa', color: null })];

    const summary = summarizeByCategory(investimentos, semCor);

    expect(summary.slices[0].color).toBeNull();
    expect(investimentos[0]).toEqual(investment({ id: 'i1', categoryId: 'c-rf', value: 40 }));
    expect(semCor[0]).toEqual(category({ id: 'c-rf', name: 'Renda Fixa', color: null }));
  });

  it('empate de total desempata por nome (ordem determinística)', () => {
    const summary = summarizeByCategory(
      [
        investment({ id: 'i1', categoryId: 'c-cripto', value: 100 }),
        investment({ id: 'i2', categoryId: 'c-rf', value: 100 }),
      ],
      categorias,
    );
    expect(summary.slices.map((s) => s.name)).toEqual(['Cripto', 'Renda Fixa']);
  });
});
