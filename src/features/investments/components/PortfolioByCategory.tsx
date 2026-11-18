'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Pie, PieChart, Cell, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartItemStyle,
  ChartLabelStyle,
  ChartTooltipStyle,
  ChartWrapper,
} from '@/features/dashboard/components/ChartWrapper';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/shared/utils';
import { summarizeByCategory, type PortfolioSlice } from '../portfolioSummary';
import type { Category } from '@/features/categories/validations';
import type { Investment } from '../validations';

/** Chave de filtro/fatia para ativos sem categoria (id `null` ou id órfão). */
export const SEM_CATEGORIA_KEY = 'sem-categoria';

/** Quantidade de linhas exibidas na lista antes do "Ver todas" (mobile). */
const MOBILE_VISIBLE_ROWS = 5;

/** Paleta de fallback quando a categoria não tem cor própria (nunca em classes). */
const FALLBACK_PALETTE = ['#2563EB', '#8B5CF6', '#10B981', '#F59E0B', '#E11D48', '#787679'] as const;

interface DisplaySlice extends PortfolioSlice {
  /** Chave estável usada em chips, células e filtro da grade. */
  key: string;
  color: string;
}

export interface PortfolioByCategoryProps {
  /** Ativos considerados no resumo (a seção envia só os ativos, sem resgatados). */
  investments: Investment[];
  categories: Category[];
  /** true enquanto investimentos ou categorias carregam. */
  isLoading: boolean;
  /** Erro ao carregar categorias: painel degrada e avisa, sem quebrar a página. */
  categoriesError: string | null;
  /** Chaves das fatias filtradas na grade (multisseleção); vazio = Todas. */
  selectedKeys: string[];
  onSelectionChange: (keys: string[]) => void;
}

/**
 * Espelha o agrupamento de `summarizeByCategory`: id resolvível (lista de
 * categorias ou join embutido no ativo) vira a chave da categoria; caso
 * contrário o ativo cai em "Sem categoria".
 */
export function investmentCategoryKey(investment: Investment, categories: Category[]): string {
  if (!investment.categoryId) return SEM_CATEGORIA_KEY;
  const isKnown =
    categories.some((category) => category.id === investment.categoryId) || Boolean(investment.category);
  return isKnown ? investment.categoryId : SEM_CATEGORIA_KEY;
}

export function matchesCategoryFilter(
  investment: Investment,
  filterKey: string,
  categories: Category[]
): boolean {
  return investmentCategoryKey(investment, categories) === filterKey;
}

/** Filtro múltiplo: lista vazia = sem filtro (todos os ativos). */
export function matchesCategoryFilters(
  investment: Investment,
  filterKeys: string[],
  categories: Category[]
): boolean {
  return filterKeys.length === 0 || filterKeys.includes(investmentCategoryKey(investment, categories));
}

function colorFor(slice: PortfolioSlice, index: number): string {
  // "Sem categoria" já vem em cinza do resumo; cores nulas caem na paleta.
  return slice.color ?? FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

function formatPct(pct: number): string {
  return `${pct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

/**
 * Painel "Carteira por categoria" (FING-27 §2.3): donut no desktop e barra
 * empilhada no mobile, lista ranqueada e chips que filtram a grade de cards.
 * Estados: loading (Skeleton), vazio (mensagem calma) e erro de categorias
 * (aviso calma + degradação para "Sem categoria").
 */
export function PortfolioByCategory({
  investments,
  categories,
  isLoading,
  categoriesError,
  selectedKeys,
  onSelectionChange,
}: PortfolioByCategoryProps) {
  const [showAll, setShowAll] = useState(false);
  const summary = useMemo(() => summarizeByCategory(investments, categories), [investments, categories]);
  const slices: DisplaySlice[] = useMemo(
    () => summary.slices.map((slice, index) => ({ ...slice, key: slice.categoryId ?? SEM_CATEGORIA_KEY, color: colorFor(slice, index) })),
    [summary]
  );
  const hasRowsBeyondMobile = slices.length > MOBILE_VISIBLE_ROWS;
  // Ignora chaves de categorias que sumiram (ex.: excluídas) só para exibição.
  const activeKeys = useMemo(
    () => selectedKeys.filter((key) => slices.some((slice) => slice.key === key)),
    [selectedKeys, slices]
  );
  const hasFilter = activeKeys.length > 0;
  const isActive = (key: string) => !hasFilter || activeKeys.includes(key);
  const shownTotal = hasFilter
    ? slices.filter((slice) => activeKeys.includes(slice.key)).reduce((sum, slice) => sum + slice.total, 0)
    : summary.total;

  function toggleKey(key: string) {
    onSelectionChange(activeKeys.includes(key) ? activeKeys.filter((k) => k !== key) : [...activeKeys, key]);
  }

  return (
    <section
      data-testid="portfolio-by-category"
      aria-labelledby="portfolio-by-category-title"
      className="flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container p-4 md:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="portfolio-by-category-title" className="text-lg font-semibold text-on-surface">
            Carteira por categoria
          </h2>
          <p className="text-xs text-on-surface-variant">Agrupamento dos seus ativos pela categoria escolhida.</p>
        </div>
      </div>

      {isLoading ? (
        <div role="status" className="flex flex-col gap-3">
          <span className="sr-only">Carregando resumo da carteira...</span>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : (
        <>
          {categoriesError && (
            <p role="status" className="rounded-md bg-surface-container-low p-3 text-sm text-on-surface-variant">
              Não foi possível carregar o resumo agora.
            </p>
          )}

          {slices.length === 0 ? (
            !categoriesError && (
              <p className="py-6 text-center text-sm text-on-surface-variant">
                Ainda não há valores para agrupar por categoria.
              </p>
            )
          ) : (
            <>
              <div className="flex flex-col items-center gap-5">
                {/* Mobile/tablet: barra empilhada com o total. */}
                <div className="w-full lg:hidden">
                  <div
                    role="img"
                    aria-label={`Distribuição da carteira por categoria, total ${formatCurrency(summary.total)}`}
                    className="flex h-4 w-full overflow-hidden rounded-full bg-surface-container-high"
                  >
                    {slices.map((slice) => (
                      <span
                        key={slice.key}
                        data-testid="stacked-segment"
                        title={slice.name}
                        className={cn('h-full transition-opacity', !isActive(slice.key) && 'opacity-25')}
                        style={{ width: `${slice.pct}%`, backgroundColor: slice.color }}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-center font-mono text-xs text-on-surface-variant">
                    {hasFilter ? 'Selecionado' : 'Total'} {formatCurrency(shownTotal)}
                  </p>
                </div>

                {/* Desktop: donut com o total no centro. */}
                <div className="relative hidden w-[220px] shrink-0 lg:block">
                  <ChartWrapper height={220}>
                    <PieChart>
                      <Pie
                        data={slices}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="total"
                        paddingAngle={2}
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {slices.map((slice) => (
                          <Cell
                            key={slice.key}
                            fill={slice.color}
                            stroke="none"
                            fillOpacity={isActive(slice.key) ? 1 : 0.25}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={ChartTooltipStyle}
                        labelStyle={ChartLabelStyle}
                        itemStyle={ChartItemStyle}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ChartWrapper>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-wide text-on-surface-variant">
                      {hasFilter ? 'Selecionado' : 'Total'}
                    </span>
                    <span data-testid="portfolio-total" className="font-mono text-sm font-semibold text-on-surface">
                      {formatCurrency(shownTotal)}
                    </span>
                  </div>
                </div>

                {/* Lista ranqueada: nome, valor, % e nº de ativos. */}
                <div className="w-full min-w-0">
                  <ul className="flex flex-col gap-2">
                    {slices.map((slice, index) => (
                      <li
                        key={slice.key}
                        data-testid="category-row"
                        className={cn(
                          'flex items-center gap-2 text-sm transition-opacity',
                          !isActive(slice.key) && 'opacity-40',
                          index >= MOBILE_VISIBLE_ROWS && !showAll && 'hidden lg:flex'
                        )}
                      >
                        <span
                          data-testid="category-dot"
                          aria-hidden="true"
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="min-w-0 flex-1 truncate text-on-surface">{slice.name}</span>
                        <span className="hidden shrink-0 font-mono text-xs text-on-surface-variant lg:inline">
                          {slice.count} {slice.count === 1 ? 'ativo' : 'ativos'}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-on-surface">
                          {formatCurrency(slice.total)}
                        </span>
                        <span className="w-14 shrink-0 text-right font-mono text-xs text-on-surface-variant">
                          {formatPct(slice.pct)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {hasRowsBeyondMobile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-expanded={showAll}
                      className="mt-2 w-full lg:hidden"
                      onClick={() => setShowAll((v) => !v)}
                    >
                      {showAll ? 'Mostrar menos' : 'Ver todas'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Chips: multisseleção, filtram a grade de cards sem nova request. */}
              <div role="group" aria-label="Filtrar carteira por categoria" className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={!hasFilter ? 'default' : 'outline'}
                  aria-pressed={!hasFilter}
                  onClick={() => onSelectionChange([])}
                >
                  Todas
                </Button>
                {slices.map((slice) => (
                  <Button
                    key={slice.key}
                    type="button"
                    size="sm"
                    variant={activeKeys.includes(slice.key) ? 'default' : 'outline'}
                    aria-pressed={activeKeys.includes(slice.key)}
                    className="gap-1.5"
                    onClick={() => toggleKey(slice.key)}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    {slice.name}
                  </Button>
                ))}
                {hasFilter && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Limpar filtros"
                    title="Limpar filtros"
                    className="h-8 w-8"
                    onClick={() => onSelectionChange([])}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
