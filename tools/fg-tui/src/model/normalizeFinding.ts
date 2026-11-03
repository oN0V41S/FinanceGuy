import { sanitizeText } from './sanitizeText.js';
import type { Finding } from './types.js';

type Severity = Finding['severity'];

const SEVERITY_ALIASES: Record<string, Severity> = {
  critico: 'critico',
  critical: 'critico',
  alto: 'alto',
  high: 'alto',
  medio: 'medio',
  medium: 'medio',
  baixo: 'baixo',
  low: 'baixo',
};

function pick(raw: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function normalizeSeverity(value: unknown): Severity {
  if (typeof value !== 'string') return 'desconhecido';
  const key = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
  return Object.prototype.hasOwnProperty.call(SEVERITY_ALIASES, key)
    ? (SEVERITY_ALIASES[key] ?? 'desconhecido')
    : 'desconhecido';
}

function normalizeLine(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

/** Converte um achado de revisão tolerante (chaves pt-BR ou inglês) no contrato `Finding`. */
export function normalizeFinding(raw: Record<string, unknown>): Finding {
  const file = pick(raw, ['file', 'arquivo', 'path']);
  const description = pick(raw, ['description', 'descrição', 'descricao', 'message', 'mensagem']);

  return {
    severity: normalizeSeverity(pick(raw, ['severity', 'severidade', 'level', 'nivel', 'nível'])),
    file: typeof file === 'string' && sanitizeText(file).length > 0 ? sanitizeText(file) : null,
    line: normalizeLine(pick(raw, ['line', 'linha'])),
    description:
      typeof description === 'string' && sanitizeText(description).trim().length > 0
        ? sanitizeText(description)
        : '(sem descrição)',
  };
}
