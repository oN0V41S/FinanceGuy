import { getBrtPeriod } from './financialContext';

export interface QuestionPeriod {
  startMonth: string; // YYYY-MM
  endMonth: string; // YYYY-MM
}

export const MAX_PERIOD_MONTHS = 36;

const MONTHS: Record<string, number> = {
  janeiro: 1, jan: 1, fevereiro: 2, fev: 2, marco: 3, mar: 3, abril: 4, abr: 4, maio: 5, mai: 5,
  junho: 6, jun: 6, julho: 7, jul: 7, agosto: 8, ago: 8, setembro: 9, set: 9, outubro: 10, out: 10,
  novembro: 11, nov: 11, dezembro: 12, dez: 12,
};
const MONTH_NAMES = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');

const pad = (n: number): string => String(n).padStart(2, '0');
const key = (index: number): string => `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
const idx = (year: number, month: number): number => year * 12 + (month - 1);
const validYear = (y: number): boolean => y >= 1990 && y <= 2100;

/**
 * Deriva da pergunta (sem LLM) o período que o usuário quer consultar.
 * Retorna null quando a pergunta não cita período: vale a janela padrão.
 */
export function resolveQuestionPeriod(question: string, now: Date): QuestionPeriod | null {
  const text = question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const today = getBrtPeriod(now);
  const [cy, cm] = today.month.split('-').map(Number);
  const current = idx(cy, cm);
  const make = (a: number, b: number): QuestionPeriod => {
    let start = Math.min(a, b);
    const end = Math.max(a, b);
    if (end - start + 1 > MAX_PERIOD_MONTHS) start = end - MAX_PERIOD_MONTHS + 1;
    return { startMonth: key(start), endMonth: key(end) };
  };

  // "últimos N meses"
  let m = text.match(/ultimos?\s+(\d{1,3})\s+mes(?:es)?/);
  if (m) return make(current - (Number(m[1]) - 1), current);

  // "há N meses"
  m = text.match(/\bha\s+(\d{1,3})\s+mes(?:es)?/);
  if (m) return make(current - Number(m[1]), current - Number(m[1]));

  if (/\bmes passado\b|\bultimo mes\b/.test(text)) return make(current - 1, current - 1);
  if (/\bano passado\b/.test(text)) return make(idx(cy - 1, 1), idx(cy - 1, 12));
  if (/\b(este|esse|neste|nesse|deste|desse) ano\b/.test(text)) return make(idx(cy, 1), current);

  // dd/mm/aaaa ou mm/aaaa
  m = text.match(/\b(?:\d{1,2}\/)?(\d{1,2})\/(\d{4})\b/);
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 12 && validYear(Number(m[2]))) {
    return make(idx(Number(m[2]), Number(m[1])), idx(Number(m[2]), Number(m[1])));
  }

  const resolveYearless = (month: number): number => {
    const sameYear = idx(cy, month);
    return sameYear <= current ? sameYear : idx(cy - 1, month);
  };

  // "de março a maio de 2025" / "março até maio"
  m = text.match(new RegExp(String.raw`\b(${MONTH_NAMES})\b(?:\s+de\s+(\d{4}))?\s+(?:a|ate|ao)\s+(${MONTH_NAMES})\b(?:\s+de\s+(\d{4}))?`));
  if (m) {
    const endYear = m[4] ? Number(m[4]) : m[2] ? Number(m[2]) : null;
    const startYear = m[2] ? Number(m[2]) : endYear;
    if (endYear && validYear(endYear)) {
      return make(idx(startYear as number, MONTHS[m[1]]), idx(endYear, MONTHS[m[3]]));
    }
    return make(resolveYearless(MONTHS[m[1]]), resolveYearless(MONTHS[m[3]]));
  }

  // "janeiro de 2025", "mar/2024", "jan 2025"
  m = text.match(new RegExp(String.raw`\b(${MONTH_NAMES})\b\s*(?:de|/|-)?\s*(\d{4})\b`));
  if (m && validYear(Number(m[2]))) return make(idx(Number(m[2]), MONTHS[m[1]]), idx(Number(m[2]), MONTHS[m[1]]));

  // só o mês: "em março"
  m = text.match(new RegExp(String.raw`\b(?:em|de|no mes de|mes de)\s+(${MONTH_NAMES})\b`));
  if (m) return make(resolveYearless(MONTHS[m[1]]), resolveYearless(MONTHS[m[1]]));

  // só o ano: "em 2025"
  m = text.match(/\b(19\d{2}|20\d{2}|2100)\b/);
  if (m && validYear(Number(m[1]))) {
    const y = Number(m[1]);
    return make(idx(y, 1), y === cy ? current : idx(y, 12));
  }

  return null;
}
