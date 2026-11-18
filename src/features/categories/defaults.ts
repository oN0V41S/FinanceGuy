import { normalizeCategoryName } from './normalizeCategoryName';

export type CategoryType = 'income' | 'expense' | 'both';

/** Ícones permitidos (chaves de lucide-react). Allowlist: nunca aceitar chave arbitrária. */
export const CATEGORY_ICONS = [
  'utensils',
  'car',
  'home',
  'heart-pulse',
  'graduation-cap',
  'gamepad-2',
  'wallet',
  'trending-up',
  'tag',
  'shopping-cart',
  'plane',
  'gift',
  'briefcase',
  'smartphone',
  'dumbbell',
  'paw-print',
] as const;

export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

/** Paleta predefinida de cores (hex #RRGGBB) oferecida na UI. */
export const CATEGORY_COLORS = [
  '#F97316',
  '#3B82F6',
  '#8B5CF6',
  '#EF4444',
  '#14B8A6',
  '#EC4899',
  '#22C55E',
  '#EAB308',
  '#64748B',
  '#06B6D4',
] as const;

export type CategoryScope = 'transaction' | 'investment';

export interface DefaultCategory {
  name: string;
  type: CategoryType;
  color: string;
  icon: CategoryIcon;
}

/** Fonte única do seed de categorias padrão (ordem de exibição). */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: 'Alimentação', type: 'expense', color: '#F97316', icon: 'utensils' },
  { name: 'Transporte', type: 'expense', color: '#3B82F6', icon: 'car' },
  { name: 'Casa', type: 'expense', color: '#8B5CF6', icon: 'home' },
  { name: 'Saúde', type: 'expense', color: '#EF4444', icon: 'heart-pulse' },
  { name: 'Educação', type: 'expense', color: '#14B8A6', icon: 'graduation-cap' },
  { name: 'Lazer', type: 'expense', color: '#EC4899', icon: 'gamepad-2' },
  { name: 'Salário', type: 'income', color: '#22C55E', icon: 'wallet' },
  { name: 'Investimentos', type: 'both', color: '#EAB308', icon: 'trending-up' },
  { name: 'Outros', type: 'both', color: '#64748B', icon: 'tag' },
];

/** Categoria fallback: não pode ser excluída nem renomeada. */
export const FALLBACK_CATEGORY_NAME = 'Outros';
export const FALLBACK_CATEGORY_KEY = normalizeCategoryName(FALLBACK_CATEGORY_NAME);

/** Limite de categorias por usuário. */
export const MAX_CATEGORIES_PER_USER = 50;

/** Seed de categorias de investimento (ordem de exibição). O último item é o fallback protegido. */
export const DEFAULT_INVESTMENT_CATEGORIES: readonly DefaultCategory[] = [
  { name: 'Renda Fixa', type: 'both', color: '#3B82F6', icon: 'wallet' },
  { name: 'Renda Variável', type: 'both', color: '#8B5CF6', icon: 'trending-up' },
  { name: 'Aposentadoria/Previdência', type: 'both', color: '#14B8A6', icon: 'briefcase' },
  { name: 'Reserva de emergência', type: 'both', color: '#EF4444', icon: 'heart-pulse' },
  { name: 'Renda passiva', type: 'both', color: '#22C55E', icon: 'gift' },
  { name: 'Cripto', type: 'both', color: '#EAB308', icon: 'smartphone' },
  { name: 'Outros investimentos', type: 'both', color: '#64748B', icon: 'tag' },
];

/** Categoria fallback de investimentos: não pode ser excluída nem renomeada. */
export const FALLBACK_INVESTMENT_CATEGORY_NAME = 'Outros investimentos';
export const FALLBACK_INVESTMENT_CATEGORY_KEY = normalizeCategoryName(FALLBACK_INVESTMENT_CATEGORY_NAME);
