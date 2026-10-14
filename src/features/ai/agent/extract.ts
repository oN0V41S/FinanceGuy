import { suggestCategory } from './categoryHints';
import { normalize, sanitizeText } from './text';

export interface ExtractedTransactionFields {
  type?: 'income' | 'expense';
  value?: number;
  date?: string;
  title?: string;
  category?: string;
  paid?: boolean;
  responsible?: string;
}

const MAX_RESPONSIBLE = 50;
const RESPONSIBLE_RE = /\bresp(?:onsavel|onsável|\.)?\s*(?:[:=-]|é|e|sera|será)?\s*(\p{L}[\p{L}'-]*)(?:\s+(\p{L}[\p{L}'-]*))?/iu;

/** "responsável Maria" / "resp: João Silva" -> nome (1 palavra; 2ª só se capitalizada). Retorna o texto sem o trecho. */
function extractResponsible(text: string): { name?: string; rest: string } {
  const m = RESPONSIBLE_RE.exec(text);
  if (!m) return { rest: text };
  const second = m[2] && /^\p{Lu}/u.test(m[2]) ? m[2] : undefined;
  const name = [m[1], second].filter(Boolean).join(' ').slice(0, MAX_RESPONSIBLE);
  const consumed = second ? m[0] : m[0].slice(0, m[0].length - (m[2] ? m[2].length : 0)).trimEnd();
  const rest = `${text.slice(0, m.index)} ${text.slice(m.index + consumed.length)}`.replace(/\s+/g, ' ').trim();
  return { name, rest };
}

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;
const MAX_TITLE = 100;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatYmd(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Componentes de "hoje" em America/Sao_Paulo (UTC-3, sem horário de verão desde 2019). */
function brtParts(now: Date): { year: number; month: number; day: number } {
  const shifted = new Date(now.getTime() - BRT_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

export function todayBRT(now: Date): string {
  const { year, month, day } = brtParts(now);
  return formatYmd(year, month, day);
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function shiftDays(now: Date, days: number): string {
  const { year, month, day } = brtParts(now);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return formatYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Converte "230,40", "1.234,56", "1234.56", "50" em número; NaN se inválido. */
export function parseMoney(raw: string): number {
  const s = raw.trim();
  if (!/^\d[\d.,]*$/.test(s)) return NaN;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandSep = decimalSep === ',' ? '.' : ',';
    normalized = s.split(thousandSep).join('').replace(decimalSep, '.');
  } else if (lastComma >= 0) {
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot >= 0) {
    normalized = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s;
  } else {
    normalized = s;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

const DATE_FULL = /(?<![\d/])(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})(?![\d/])/;
const DATE_SHORT = /(?<![\d/])(\d{1,2})\/(\d{1,2})(?![\d/])/;
const DAY_ONLY = /\bdia\s+(\d{1,2})\b/;

function extractDate(norm: string, now: Date): string | undefined {
  if (/\banteontem\b/.test(norm)) return shiftDays(now, -2);
  if (/\bontem\b/.test(norm)) return shiftDays(now, -1);
  if (/\bhoje\b/.test(norm)) return shiftDays(now, 0);
  const today = brtParts(now);

  const full = DATE_FULL.exec(norm);
  if (full) {
    const year = full[3].length === 2 ? 2000 + Number(full[3]) : Number(full[3]);
    const [month, day] = [Number(full[2]), Number(full[1])];
    return isValidDate(year, month, day) ? formatYmd(year, month, day) : undefined;
  }
  const short = DATE_SHORT.exec(norm);
  if (short) {
    const [month, day] = [Number(short[2]), Number(short[1])];
    return isValidDate(today.year, month, day) ? formatYmd(today.year, month, day) : undefined;
  }
  const dayOnly = DAY_ONLY.exec(norm);
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    return isValidDate(today.year, today.month, day) ? formatYmd(today.year, today.month, day) : undefined;
  }
  return undefined;
}

const MONEY_TOKEN = '(\\d[\\d.,]*)';

function extractValue(norm: string): number | undefined {
  const withoutDates = norm
    .replace(new RegExp(DATE_FULL.source, 'g'), ' ')
    .replace(new RegExp(DATE_SHORT.source, 'g'), ' ')
    .replace(/\bdia\s+\d{1,2}\b/g, ' ');
  const patterns = [
    new RegExp(`r\\$\\s*${MONEY_TOKEN}`),
    new RegExp(`${MONEY_TOKEN}\\s*(?:reais|real|contos|conto|pila|pilas)\\b`),
    new RegExp(`(?<![\\w.,/])${MONEY_TOKEN}(?![\\w/])`),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(withoutDates);
    if (match) {
      const value = parseMoney(match[1].replace(/[.,]+$/, ''));
      if (!Number.isNaN(value)) return value;
    }
  }
  return undefined;
}

const INCOME_WORDS = ['recebi', 'receita', 'salario', 'ganhei', 'recebimento'];
const EXPENSE_WORDS = ['gastei', 'paguei', 'comprei', 'despesa', 'gasto', 'compra'];

function firstIndex(norm: string, words: string[]): number {
  const m = new RegExp(`\\b(?:${words.join('|')})\\b`).exec(norm);
  return m ? m.index : -1;
}

function extractType(norm: string): 'income' | 'expense' | undefined {
  const inc = firstIndex(norm, INCOME_WORDS);
  const exp = firstIndex(norm, EXPENSE_WORDS);
  if (inc < 0 && exp < 0) return undefined;
  if (inc < 0) return 'expense';
  if (exp < 0) return 'income';
  return inc < exp ? 'income' : 'expense';
}

function extractPaid(norm: string): boolean | undefined {
  if (/\b(?:pendente|a pagar|vence|vencimento|ainda nao (?:paguei|pago))\b/.test(norm)) return false;
  if (/\b(?:paguei|pago|paga|pagos)\b/.test(norm)) return true;
  return undefined;
}

const NOISE_WORDS = new Set(
  [
    'criar', 'crie', 'adicionar', 'adicione', 'registrar', 'registre', 'lancar', 'lance', 'cadastrar', 'cadastre',
    'gastei', 'paguei', 'recebi', 'comprei', 'ganhei', 'pago', 'paga', 'pagos',
    'despesa', 'despesas', 'receita', 'receitas', 'gasto', 'gastos', 'transacao', 'transacoes',
    'lancamento', 'lancamentos', 'compra', 'recebimento',
    'hoje', 'ontem', 'anteontem', 'reais', 'real', 'contos', 'conto', 'pila', 'pilas', 'pendente', 'vence',
    'vencimento',
  ],
);

const EDGE_STOPWORDS = new Set([
  'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'com', 'um', 'uma', 'uns', 'umas',
  'o', 'a', 'os', 'as', 'e', 'para', 'pra', 'pro', 'por', 'que', 'meu', 'minha', 'ao', 'aos',
]);

function bare(token: string): string {
  return normalize(token).replace(/^[^\p{L}\p{N}$]+|[^\p{L}\p{N}$]+$/gu, '');
}

function extractTitle(text: string): string | undefined {
  const tokens = sanitizeText(text).split(' ').filter(Boolean);
  const kept: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const b = bare(tokens[i]);
    if (b === 'dia' && /\d/.test(tokens[i + 1] ?? '')) {
      i++;
      continue;
    }
    if (/\d/.test(b) || b === 'r$' || NOISE_WORDS.has(b) || b === '') continue;
    if (b === 'a' && bare(tokens[i + 1] ?? '') === 'pagar') {
      i++;
      continue;
    }
    kept.push(tokens[i].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''));
  }
  while (kept.length > 0 && EDGE_STOPWORDS.has(bare(kept[0]))) kept.shift();
  while (kept.length > 0 && EDGE_STOPWORDS.has(bare(kept[kept.length - 1]))) kept.pop();
  const joined = kept.join(' ').trim();
  if (joined.length === 0) return undefined;
  const cased = joined.charAt(0).toUpperCase() + joined.slice(1);
  return cased.slice(0, MAX_TITLE).trim();
}

/**
 * Extrai campos de transação por regras (sem LLM). Todo o texto é tratado como dado.
 * Data ausente => undefined (o padrão "hoje" é aplicado em computeMissing).
 */
export function extractTransactionFields(text: string, now: Date): ExtractedTransactionFields {
  const { name: responsible, rest } = extractResponsible(sanitizeText(text));
  const clean = rest;
  const norm = normalize(clean);
  const fields: ExtractedTransactionFields = {};
  if (responsible) fields.responsible = responsible;

  const type = extractType(norm);
  if (type) fields.type = type;
  const value = extractValue(norm);
  if (value !== undefined) fields.value = value;
  const date = extractDate(norm, now);
  if (date) fields.date = date;
  const title = extractTitle(clean);
  if (title) fields.title = title;
  const category = suggestCategory(clean);
  if (category) fields.category = category;
  const paid = extractPaid(norm);
  if (paid !== undefined) fields.paid = paid;
  return fields;
}
