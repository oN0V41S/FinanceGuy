import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  PortfolioByCategory,
  SEM_CATEGORIA_KEY,
  investmentCategoryKey,
  matchesCategoryFilter,
} from '../PortfolioByCategory';
import type { Category } from '@/features/categories/validations';
import { formatCurrency } from '@/shared/utils';
import type { Investment } from '../../validations';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data }: { data: { name: string }[] }) => (
    <div data-testid="pie" data-names={data.map((d) => d.name).join('|')} />
  ),
  Cell: () => null,
  Tooltip: () => null,
}));

const makeCategory = (over: Partial<Category>): Category => ({
  id: 'c-rf',
  name: 'Renda Fixa',
  type: 'both',
  color: '#3B82F6',
  icon: null,
  isDefault: true,
  scope: 'investment',
  ...over,
});

const makeInvestment = (over: Partial<Investment>): Investment => ({
  id: 'i1',
  name: 'CDB 1',
  type: 'Renda Fixa',
  value: 100,
  status: 'ACTIVE',
  categoryId: null,
  category: null,
  ...over,
});

/**
 * `Intl` separa "R$" do valor com NBSP (\u00A0) e o matcher não normaliza o
 * esperado — regex com `\s*` casa os dois formatos (mesmo padrão do repo).
 */
function money(value: number): RegExp {
  const escaped = formatCurrency(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped.replace(/\u00A0/g, '\\s*'));
}

const categories: Category[] = [
  makeCategory({ id: 'c-rf', name: 'Renda Fixa', color: '#3B82F6' }),
  makeCategory({ id: 'c-cripto', name: 'Cripto', color: '#EAB308' }),
];

interface RenderProps {
  investments?: Investment[];
  categoryList?: Category[];
  isLoading?: boolean;
  categoriesError?: string | null;
  selectedKey?: string | null;
  onSelect?: (key: string | null) => void;
}

function renderPanel({
  investments = [],
  categoryList = categories,
  isLoading = false,
  categoriesError = null,
  selectedKey = null,
  onSelect = jest.fn(),
}: RenderProps = {}) {
  const utils = render(
    <PortfolioByCategory
      investments={investments}
      categories={categoryList}
      isLoading={isLoading}
      categoriesError={categoriesError}
      selectedKey={selectedKey}
      onSelect={onSelect}
    />
  );
  return { ...utils, onSelect };
}

describe('PortfolioByCategory', () => {
  it('mostra Skeleton enquanto carrega e esconde o gráfico', () => {
    const { container } = renderPanel({ investments: [makeInvestment({ categoryId: 'c-rf' })], isLoading: true });

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('pie')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Filtrar carteira por categoria/i })).not.toBeInTheDocument();
  });

  it('mostra mensagem calma quando não há valores para agrupar', () => {
    renderPanel({ investments: [] });

    expect(screen.getByText('Ainda não há valores para agrupar por categoria.')).toBeInTheDocument();
    expect(screen.queryByTestId('pie')).not.toBeInTheDocument();
  });

  it('renderiza donut com total no centro, lista ranqueada e chips', () => {
    renderPanel({
      investments: [
        makeInvestment({ id: 'i1', categoryId: 'c-rf', value: 300 }),
        makeInvestment({ id: 'i2', categoryId: 'c-rf', value: 100 }),
        makeInvestment({ id: 'i3', categoryId: 'c-cripto', value: 100 }),
      ],
    });

    expect(screen.getByTestId('pie')).toBeInTheDocument();
    expect(screen.getByTestId('portfolio-total')).toHaveTextContent(money(500));

    const rows = screen.getAllByTestId('category-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Renda Fixa');
    expect(rows[0]).toHaveTextContent(money(400));
    expect(rows[0]).toHaveTextContent('80%');
    expect(rows[0]).toHaveTextContent('2 ativos');
    expect(rows[1]).toHaveTextContent('Cripto');
    expect(rows[1]).toHaveTextContent(money(100));
    expect(rows[1]).toHaveTextContent('20%');
    expect(rows[1]).toHaveTextContent('1 ativo');

    // Cores vêm da categoria (nada hard-coded no componente).
    expect(screen.getAllByTestId('category-dot')[0].style.backgroundColor).toBe('rgb(59, 130, 246)');

    const group = screen.getByRole('group', { name: /Filtrar carteira por categoria/i });
    expect(group).toHaveTextContent('Todas');
    expect(group).toHaveTextContent('Renda Fixa');
    expect(group).toHaveTextContent('Cripto');
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'true');
    // Sem ativos sem categoria → o "Sem categoria" não aparece.
    expect(screen.queryByText('Sem categoria')).not.toBeInTheDocument();
  });

  it('degrada para "Sem categoria" e mostra aviso calma quando as categorias falham', () => {
    renderPanel({
      investments: [
        makeInvestment({ id: 'i1', categoryId: 'c-rf', value: 500 }),
        makeInvestment({ id: 'i2', categoryId: null, value: 500 }),
      ],
      categoryList: [],
      categoriesError: 'Não foi possível carregar as categorias.',
    });

    expect(screen.getByText('Não foi possível carregar o resumo agora.')).toBeInTheDocument();
    expect(screen.getByTestId('pie')).toBeInTheDocument();
    const rows = screen.getAllByTestId('category-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Sem categoria');
    expect(rows[0]).toHaveTextContent(money(1000));
  });

  it('mantém só o aviso calmo quando há erro e nenhum valor', () => {
    renderPanel({ investments: [], categoriesError: 'Não foi possível carregar as categorias.' });

    expect(screen.getByText('Não foi possível carregar o resumo agora.')).toBeInTheDocument();
    expect(screen.queryByText('Ainda não há valores para agrupar por categoria.')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pie')).not.toBeInTheDocument();
  });

  it('emite a chave da categoria ao clicar no chip e volta para Todas', () => {
    const { onSelect } = renderPanel({
      investments: [makeInvestment({ categoryId: 'c-rf', value: 100 })],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Renda Fixa' }));
    expect(onSelect).toHaveBeenCalledWith('c-rf');

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('reflete a categoria selecionada no chip (aria-pressed)', () => {
    renderPanel({
      investments: [makeInvestment({ categoryId: 'c-rf', value: 100 })],
      selectedKey: 'c-rf',
    });

    expect(screen.getByRole('button', { name: 'Renda Fixa' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Todas' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('no mobile lista as 5 maiores e expande com "ver todas"', () => {
    const manyCategories = Array.from({ length: 6 }, (_, i) =>
      makeCategory({ id: `c-${i}`, name: `Categoria ${i + 1}`, color: '#3B82F6' })
    );
    const manyInvestments = manyCategories.map((c, i) =>
      makeInvestment({ id: `i-${i}`, categoryId: c.id, value: 100 + i })
    );
    renderPanel({ investments: manyInvestments, categoryList: manyCategories });

    const rows = screen.getAllByTestId('category-row');
    expect(rows).toHaveLength(6);
    expect(rows[5].className).toContain('hidden');
    expect(screen.getAllByTestId('stacked-segment')).toHaveLength(6);

    const toggle = screen.getByRole('button', { name: 'Ver todas' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(screen.getAllByTestId('category-row')[5].className).not.toContain('hidden');
    expect(screen.getByRole('button', { name: 'Mostrar menos' })).toBeInTheDocument();
  });
});

describe('chaves de filtro por categoria', () => {
  it('investmentCategoryKey espelha a lógica do resumo', () => {
    const withJoin = makeInvestment({ categoryId: 'c-rf', category: { id: 'c-rf', name: 'Renda Fixa', color: null } });
    expect(investmentCategoryKey(makeInvestment({ categoryId: null }), categories)).toBe(SEM_CATEGORIA_KEY);
    expect(investmentCategoryKey(makeInvestment({ categoryId: 'c-rf' }), categories)).toBe('c-rf');
    expect(investmentCategoryKey(withJoin, [])).toBe('c-rf');
    expect(investmentCategoryKey(makeInvestment({ categoryId: 'c-removida' }), categories)).toBe(SEM_CATEGORIA_KEY);
  });

  it('matchesCategoryFilter filtra por id ou por "Sem categoria"', () => {
    const semCategoria = makeInvestment({ id: 'i1', categoryId: null });
    const comCategoria = makeInvestment({ id: 'i2', categoryId: 'c-rf' });
    const idOrfao = makeInvestment({ id: 'i3', categoryId: 'c-removida' });

    expect(matchesCategoryFilter(comCategoria, 'c-rf', categories)).toBe(true);
    expect(matchesCategoryFilter(semCategoria, 'c-rf', categories)).toBe(false);
    expect(matchesCategoryFilter(semCategoria, SEM_CATEGORIA_KEY, categories)).toBe(true);
    expect(matchesCategoryFilter(idOrfao, SEM_CATEGORIA_KEY, categories)).toBe(true);
    expect(matchesCategoryFilter(idOrfao, 'c-rf', categories)).toBe(false);
  });
});
