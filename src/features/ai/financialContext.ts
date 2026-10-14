import type { Transaction } from '@/features/transactions/validations';
import type { Goal } from '@/features/goals/validations';
import type { Investment } from '@/features/investments/validations';
import type { FinancialContextDto, MoneySplit } from './types';
import type { QuestionPeriod } from './questionPeriod';

const TIME_ZONE = 'America/Sao_Paulo';
const MAX_LABEL_LENGTH = 60;
// Controles C0/C1 e separadores de linha/parágrafo Unicode.
const CONTROL_CHARS = new RegExp("[\u0000-\u001F\u007F-\u009F\u2028\u2029]", "g");
const MAX_RECENT_TRANSACTIONS = 40;
const MAX_PREVIOUS_CATEGORIES = 8;
const MAX_PREVIOUS_TOP_TRANSACTIONS = 5;
const MAX_GOALS = 20;
const MAX_INVESTMENTS = 30;
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

export function buildFinancialContext(input: FinancialContextInput, now: Date, range?: QuestionPeriod | null): FinancialContextDto {
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
    previousMonths,
    recentTransactions: recent,
    goals: goalsAll.slice(0, MAX_GOALS),
    investments: investmentsAll.slice(0, MAX_INVESTMENTS),
    omitted: {
      transactions: currentMonthTransactions.length - recent.length,
      goals: Math.max(0, goalsAll.length - MAX_GOALS),
      investments: Math.max(0, investmentsAll.length - MAX_INVESTMENTS),
    },
  };

  return enforceSizeLimit(dto);
}

/** Corta itens (transações, depois investimentos, depois metas) até o JSON caber no teto. */
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
  while (size() > MAX_CONTEXT_JSON_CHARS && dto.goals.length > 0) {
    dto.goals.pop();
    dto.omitted.goals += 1;
  }

  return dto;
}
