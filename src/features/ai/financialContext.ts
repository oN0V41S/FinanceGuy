import type { Transaction } from '@/features/transactions/validations';
import type { Goal } from '@/features/goals/validations';
import type { Investment } from '@/features/investments/validations';
import { summarizeByCategory } from '@/features/investments/portfolioSummary';
import type { Category } from '@/features/categories/validations';
import type { FinancialContextDto, MoneySplit } from './types';
import type { QuestionPeriod } from './questionPeriod';

const TIME_ZONE = 'America/Sao_Paulo';
const MAX_LABEL_LENGTH = 60;
// Controles C0/C1 e separadores de linha/parágrafo Unicode.
const CONTROL_CHARS = new RegExp("[\u0000-\u001F\u007F-\u009F\u2028\u2029]", "g");
const MAX_RECENT_TRANSACTIONS = 40;
const MAX_PREVIOUS_CATEGORIES = 8;
const MAX_PREVIOUS_TOP_TRANSACTIONS = 5;
const MAX_FOCUS_TRANSACTIONS = 40;
const MAX_GOALS = 20;
const MAX_INVESTMENTS = 30;
const MAX_PORTFOLIO_SLICES = 8;
const OUTRAS_SLICE_NAME = 'Outras';
export const MAX_CONTEXT_JSON_CHARS = 12000;

export interface FinancialContextInput {
  transactions: Transaction[];
  goals: Goal[];
  investments: Investment[];
}

export interface BrtPeriod {
  today: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  startDate: string; // 1º dia de 5 meses atrás
  endDate: string; // último dia do mês atual
  months: string[]; // série mensal: 6 meses padrão + meses do período pedido, ascendente
  detailMonths: string[]; // meses com detalhe em previousMonths (exclui o mês atual)
}

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const pad = (n: number): string => String(n).padStart(2, '0');

/** Datas "de hoje" no fuso de São Paulo, independentes do fuso do servidor (UTC na Vercel). */
export function getBrtPeriod(now: Date, range?: QuestionPeriod | null): BrtPeriod {
  const parts = dateFormatter.formatToParts(now);
  const pick = (type: string): number => Number(parts.find((p) => p.type === type)?.value);
  const year = pick('year');
  const month = pick('month');
  const day = pick('day');

  const months: string[] = [];
  for (let offset = 5; offset >= 0; offset--) {
    const index = year * 12 + (month - 1) - offset;
    months.push(`${Math.floor(index / 12)}-${pad((index % 12) + 1)}`);
  }

  const toIndex = (m: string): number => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;
  const currentKey = `${year}-${pad(month)}`;
  let detailMonths = months.filter((m) => m !== currentKey).slice(0, 5);
  let allMonths = months;
  if (range) {
    const from = toIndex(range.startMonth);
    const to = toIndex(range.endMonth);
    const extra = new Set(months);
    detailMonths = [];
    for (let i = from; i <= to; i++) {
      const key = `${Math.floor(i / 12)}-${pad((i % 12) + 1)}`;
      extra.add(key);
      if (key !== currentKey) detailMonths.push(key);
    }
    allMonths = [...extra].sort();
  }

  const endKey = allMonths[allMonths.length - 1];
  const endYear = Number(endKey.slice(0, 4));
  const endMonthNum = Number(endKey.slice(5, 7));
  const lastDay = new Date(Date.UTC(endYear, endMonthNum, 0)).getUTCDate();

  return {
    today: `${year}-${pad(month)}-${pad(day)}`,
    month: `${year}-${pad(month)}`,
    startDate: `${allMonths[0]}-01`,
    endDate: `${endKey}-${pad(lastDay)}`,
    months: allMonths,
    detailMonths,
  };
}

/** Texto digitado pelo usuário vira rótulo seguro: sem controles/quebras, sem < >, curto. */
export function sanitizeLabel(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;

  const cleaned = value
    .replace(CONTROL_CHARS, ' ')
    .replace(/</g, '‹')
    .replace(/>/g, '›')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LABEL_LENGTH)
    .trim();

  return cleaned === '' ? null : cleaned;
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const toDateKey = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? '').slice(0, 10);
};

const emptySplit = (): { paid: number; pending: number } => ({ paid: 0, pending: 0 });

const finishSplit = (s: { paid: number; pending: number }): MoneySplit => ({
  paid: round2(s.paid),
  pending: round2(s.pending),
  total: round2(s.paid + s.pending),
});

/**
 * Seção `portfolioByCategory` (FING-27): top 8 fatias de `summarizeByCategory`
 * (a mesma função do painel da UI) + o resto agregado em "Outras". Nomes passam
 * por `sanitizeLabel` (anti prompt-injection); sem ids nem cores no prompt.
 */
function buildPortfolioByCategory(
  investments: Investment[],
  categories?: Category[] | null,
): FinancialContextDto['portfolioByCategory'] {
  if (!categories) return undefined;

  const { slices } = summarizeByCategory(investments, categories);
  if (slices.length === 0) return undefined;

  const top = slices.slice(0, MAX_PORTFOLIO_SLICES);
  const rest = slices.slice(MAX_PORTFOLIO_SLICES);
  const entries: NonNullable<FinancialContextDto['portfolioByCategory']> = top.map((slice) => ({
    name: sanitizeLabel(slice.name) ?? 'Outros',
    total: slice.total,
    pct: slice.pct,
    count: slice.count,
  }));

  if (rest.length > 0) {
    entries.push({
      name: OUTRAS_SLICE_NAME,
      total: round2(rest.reduce((sum, s) => sum + s.total, 0)),
      pct: round2(rest.reduce((sum, s) => sum + s.pct, 0)),
      count: rest.reduce((sum, s) => sum + s.count, 0),
    });
  }

  return entries;
}

export function buildFinancialContext(
  input: FinancialContextInput,
  now: Date,
  range?: QuestionPeriod | null,
  /**
   * Categorias do escopo 'investment' (FING-27): enviadas pelo chamador SOMENTE quando
   * `wantsPortfolio(question)`; a seção é omitida quando ausentes (ou se a carteira estiver vazia).
   */
  portfolioCategories?: Category[] | null,
): FinancialContextDto {
  const period = getBrtPeriod(now, range);

  const income = emptySplit();
  const expense = emptySplit();
  const categories = new Map<string, { category: string; type: 'income' | 'expense'; total: number }>();
  const monthly = new Map<string, { income: number; expense: number }>(period.months.map((m) => [m, { income: 0, expense: 0 }]));
  type TxItem = FinancialContextDto['recentTransactions'][number];
  const prevDetail = new Map(
    period.detailMonths.map((m) => [
        m,
        {
          income: emptySplit(),
          expense: emptySplit(),
          categories: new Map<string, { category: string; type: 'income' | 'expense'; total: number }>(),
          txs: [] as Array<{ date: string; value: number; item: TxItem }>,
        },
      ]),
  );
  const currentMonthTransactions: Array<{ date: string; value: number; item: FinancialContextDto['recentTransactions'][number] }> = [];

  for (const t of input.transactions) {
    const date = toDateKey(t.date);
    const monthKey = date.slice(0, 7);
    const bucket = monthly.get(monthKey);
    if (!bucket) continue;

    const value = Number(t.value) || 0;
    const isIncome = t.type === 'income';
    if (isIncome) bucket.income += value;
    else bucket.expense += value;

    if (monthKey !== period.month) {
      const d = prevDetail.get(monthKey);
      if (d) {
        const paidPrev = Boolean(t.paid);
        const typePrev = isIncome ? 'income' : 'expense';
        const splitPrev = isIncome ? d.income : d.expense;
        if (paidPrev) splitPrev.paid += value;
        else splitPrev.pending += value;
        const key = `${typePrev}:${t.category}`;
        const ex = d.categories.get(key);
        if (ex) ex.total += value;
        else d.categories.set(key, { category: t.category, type: typePrev, total: value });
        d.txs.push({
          date,
          value,
          item: { date, type: typePrev, category: t.category, value: round2(value), paid: paidPrev, title: sanitizeLabel(t.title) ?? t.category },
        });
      }
      continue;
    }

    const paid = Boolean(t.paid);
    const split = isIncome ? income : expense;
    if (paid) split.paid += value;
    else split.pending += value;

    const type = isIncome ? 'income' : 'expense';
    const categoryKey = `${type}:${t.category}`;
    const existing = categories.get(categoryKey);
    if (existing) existing.total += value;
    else categories.set(categoryKey, { category: t.category, type, total: value });

    currentMonthTransactions.push({
      date,
      value,
      item: {
        date,
        type,
        category: t.category,
        value: round2(value),
        paid,
        title: sanitizeLabel(t.title) ?? t.category,
      },
    });
  }

  currentMonthTransactions.sort((a, b) => (a.date === b.date ? b.value - a.value : a.date < b.date ? 1 : -1));
  const recent = currentMonthTransactions.slice(0, MAX_RECENT_TRANSACTIONS).map((e) => e.item);

  let focusOmitted = 0;
  const previousMonths: FinancialContextDto['previousMonths'] = [...prevDetail.entries()].map(([month, d]) => {
    d.txs.sort((a, b) => (a.value === b.value ? (a.date < b.date ? 1 : -1) : b.value - a.value));
    return {
      month,
      income: finishSplit(d.income),
      expense: finishSplit(d.expense),
      balance: {
        realized: round2(d.income.paid - d.expense.paid),
        projected: round2(d.income.paid + d.income.pending - (d.expense.paid + d.expense.pending)),
      },
      byCategory: [...d.categories.values()]
        .map((c) => ({ ...c, total: round2(c.total) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, MAX_PREVIOUS_CATEGORIES),
      topTransactions: d.txs.slice(0, MAX_PREVIOUS_TOP_TRANSACTIONS).map((e) => e.item),
    };
  });

  let focus: FinancialContextDto['focus'];
  if (range && range.startMonth === range.endMonth) {
    const [fy, fm] = range.startMonth.split('-').map(Number);
    const firstDay = range.startDay ?? 1;
    const lastDay = range.endDay ?? new Date(Date.UTC(fy, fm, 0)).getUTCDate();
    const startDate = `${range.startMonth}-${pad(firstDay)}`;
    const endDate = `${range.startMonth}-${pad(lastDay)}`;
    const fIncome = emptySplit();
    const fExpense = emptySplit();
    const items: FinancialContextDto['recentTransactions'] = [];
    for (const t of input.transactions) {
      const date = toDateKey(t.date);
      if (date < startDate || date > endDate) continue;
      const value = Number(t.value) || 0;
      const paid = Boolean(t.paid);
      const isIncome = t.type === 'income';
      const split = isIncome ? fIncome : fExpense;
      if (paid) split.paid += value;
      else split.pending += value;
      items.push({ date, type: isIncome ? 'income' : 'expense', category: t.category, value: round2(value), paid, title: sanitizeLabel(t.title) ?? t.category });
    }
    items.sort((a, b) => (a.date === b.date ? b.value - a.value : a.date < b.date ? -1 : 1));
    focus = { startDate, endDate, income: finishSplit(fIncome), expense: finishSplit(fExpense), transactions: items.slice(0, MAX_FOCUS_TRANSACTIONS) };
    focusOmitted = Math.max(0, items.length - MAX_FOCUS_TRANSACTIONS);
  }

  const goalsAll = input.goals.map((g) => {
    const target = Number(g.targetValue) || 0;
    const current = Number(g.currentValue) || 0;
    return {
      name: sanitizeLabel(g.name) ?? 'Meta',
      target: round2(target),
      current: round2(current),
      progressPct: target > 0 ? round2((current / target) * 100) : 0,
      deadline: sanitizeLabel(g.deadlineLabel),
    };
  });

  const investmentsAll = [...input.investments]
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    .map((i) => ({
      name: sanitizeLabel(i.name) ?? 'Investimento',
      type: sanitizeLabel(i.type) ?? 'Outros',
      value: round2(Number(i.value) || 0),
      ticker: null as string | null,
      status: 'ativo',
    }));

  // Seção sob demanda (FING-27 §2.4): só existe quando o chamador pediu o tema da carteira.
  const portfolioByCategory = buildPortfolioByCategory(input.investments, portfolioCategories);

  const dto: FinancialContextDto = {
    today: period.today,
    currency: 'BRL',
    currentMonth: {
      month: period.month,
      income: finishSplit(income),
      expense: finishSplit(expense),
      balance: {
        realized: round2(income.paid - expense.paid),
        projected: round2(income.paid + income.pending - (expense.paid + expense.pending)),
      },
      byCategory: [...categories.values()]
        .map((c) => ({ ...c, total: round2(c.total) }))
        .sort((a, b) => b.total - a.total),
    },
    last6Months: period.months.map((m) => {
      const b = monthly.get(m) ?? { income: 0, expense: 0 };
      return { month: m, income: round2(b.income), expense: round2(b.expense), balance: round2(b.income - b.expense) };
    }),
    ...(focus ? { focus } : {}),
    previousMonths,
    recentTransactions: recent,
    goals: goalsAll.slice(0, MAX_GOALS),
    investments: investmentsAll.slice(0, MAX_INVESTMENTS),
    ...(portfolioByCategory ? { portfolioByCategory } : {}),
    omitted: {
      transactions: currentMonthTransactions.length - recent.length + focusOmitted,
      goals: Math.max(0, goalsAll.length - MAX_GOALS),
      investments: Math.max(0, investmentsAll.length - MAX_INVESTMENTS),
    },
  };

  return enforceSizeLimit(dto);
}

/** Corta itens (transações, depois investimentos, depois a carteira por categoria e, por fim, metas) até o JSON caber no teto. */
function enforceSizeLimit(dto: FinancialContextDto): FinancialContextDto {
  const size = (): number => JSON.stringify(dto).length;

  while (size() > MAX_CONTEXT_JSON_CHARS && dto.recentTransactions.length > 0) {
    dto.recentTransactions.pop();
    dto.omitted.transactions += 1;
  }
  // Meses anteriores: remove a menor transação do mês mais antigo primeiro.
  while (size() > MAX_CONTEXT_JSON_CHARS) {
    const target = dto.previousMonths.find((m) => m.topTransactions.length > 0);
    if (!target) break;
    target.topTransactions.pop();
    dto.omitted.transactions += 1;
  }
  // Períodos longos: sacrifica categorias e, por último, o detalhe dos meses mais antigos.
  while (size() > MAX_CONTEXT_JSON_CHARS) {
    const target = dto.previousMonths.find((m) => m.byCategory.length > 0);
    if (!target) break;
    target.byCategory = [];
  }
  while (size() > MAX_CONTEXT_JSON_CHARS && dto.previousMonths.length > 0) {
    dto.previousMonths.shift();
  }
  while (size() > MAX_CONTEXT_JSON_CHARS && dto.investments.length > 0) {
    dto.investments.pop();
    dto.omitted.investments += 1;
  }
  // Carteira por categoria: sacrificada antes das metas (FING-27 §2.4).
  while (size() > MAX_CONTEXT_JSON_CHARS && dto.portfolioByCategory && dto.portfolioByCategory.length > 0) {
    dto.portfolioByCategory.pop();
  }
  while (size() > MAX_CONTEXT_JSON_CHARS && dto.goals.length > 0) {
    dto.goals.pop();
    dto.omitted.goals += 1;
  }
  while (size() > MAX_CONTEXT_JSON_CHARS && dto.focus && dto.focus.transactions.length > 0) {
    dto.focus.transactions.pop();
    dto.omitted.transactions += 1;
  }

  return dto;
}
