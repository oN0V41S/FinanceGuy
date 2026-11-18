import type { Category } from '@/features/categories/validations';
import { round2 } from './calculations';
import type { Investment } from './validations';

/** Ativos sem categoria aparecem em cinza neutro, fora da paleta, para não confundir com categoria real. */
export const SEM_CATEGORIA_NAME = 'Sem categoria';
export const SEM_CATEGORIA_COLOR = '#94A3B8';

export interface PortfolioSlice {
  categoryId: string | null;
  name: string;
  color: string | null;
  total: number;
  pct: number;
  count: number;
}

export interface PortfolioSummary {
  total: number;
  /** Ordenado por total desc (empate: nome). */
  slices: PortfolioSlice[];
}

interface Bucket {
  categoryId: string | null;
  name: string;
  color: string | null;
  total: number;
  count: number;
}

/**
 * Agrupa a carteira por categoria (FING-27 §3). Função pura — usada na UI
 * (`PortfolioByCategory`) e no contexto da IA, garantindo os mesmos números.
 *
 * Regras: só ativos ACTIVE (resgatados ficam fora); valores <= 0 ignorados;
 * "Sem categoria" só surge se houver ativos assim; `pct` soma 100 (a maior
 * fatia absorve o arredondamento); total zero → `slices` vazio.
 */
export function summarizeByCategory(investments: Investment[], categories: Category[]): PortfolioSummary {
  const byCategoryId = new Map(categories.map((c) => [c.id, c]));
  const buckets = new Map<string, Bucket>();

  for (const investment of investments) {
    if (investment.status === 'REDEEMED') continue;
    const value = Number(investment.value) || 0;
    if (value <= 0) continue;

    // Nome/cor vêm da lista de categorias; o join embutido no ativo cobre id fora dela.
    const category = investment.categoryId
      ? byCategoryId.get(investment.categoryId) ?? investment.category ?? null
      : null;
    const key = investment.categoryId && category ? `cat:${investment.categoryId}` : 'sem-categoria';
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.total += value;
      bucket.count += 1;
    } else {
      buckets.set(key, {
        categoryId: investment.categoryId && category ? investment.categoryId : null,
        name: category?.name ?? SEM_CATEGORIA_NAME,
        color: category ? category.color : SEM_CATEGORIA_COLOR,
        total: value,
        count: 1,
      });
    }
  }

  const slices = [...buckets.values()]
    .map((b) => ({ ...b, total: round2(b.total) }))
    .sort((a, b) => (b.total === a.total ? a.name.localeCompare(b.name, 'pt-BR') : b.total - a.total));

  const total = round2(slices.reduce((sum, s) => sum + s.total, 0));
  if (total <= 0 || slices.length === 0) return { total: 0, slices: [] };

  const pcts = slices.map((s) => round2((s.total / total) * 100));
  // A maior fatia absorve o resto do arredondamento: a soma final é exatamente 100.
  const largest = pcts.indexOf(Math.max(...pcts));
  pcts[largest] = round2(pcts[largest] + (100 - pcts.reduce((sum, p) => sum + p, 0)));

  return { total, slices: slices.map((slice, i) => ({ ...slice, pct: pcts[i] })) };
}
