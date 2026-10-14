import type { AgentEntity, AgentOp } from '../types';
import type { AdapterRegistry, FieldMap, TargetCandidate, TargetHints } from './entityAdapters/types';
import { extractTransactionFields } from './extract';
import { normalize, sanitizeText } from './text';

export const MAX_CANDIDATES = 5;

export type ResolveResult =
  | { kind: 'none' }
  | { kind: 'one'; candidate: TargetCandidate }
  | { kind: 'many'; candidates: TargetCandidate[] };

const SPLIT_CHANGE = /\s+(?:para|pra)\s+/i;

/** Palavras que descrevem o comando ou o tipo de item, não o alvo. */
const NON_TARGET = new Set([
  'alterar', 'altere', 'mudar', 'mude', 'editar', 'edite', 'atualizar', 'atualize', 'corrigir', 'corrija',
  'remover', 'remova', 'excluir', 'exclua', 'apagar', 'apague', 'deletar', 'delete',
  'transacao', 'transacoes', 'despesa', 'despesas', 'receita', 'receitas', 'gasto', 'gastos',
  'lancamento', 'lancamentos', 'compra', 'valor', 'data', 'categoria', 'titulo', 'nome', 'pago', 'paga',
  'pendente', 'hoje', 'ontem', 'anteontem', 'reais', 'real', 'dia', 'por', 'favor',
  'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'com', 'um', 'uma', 'o', 'a', 'os', 'as',
  'e', 'que', 'meu', 'minha', 'ao', 'aos', 'pro', 'r$',
]);

export interface SegmentParts {
  /** Parte que identifica o alvo. */
  targetText: string;
  /** Parte que descreve o que muda (vazia quando não há "para"/"pra"). */
  changesText: string;
}

export function splitSegment(text: string, op: AgentOp): SegmentParts {
  const clean = sanitizeText(text);
  if (op !== 'update') return { targetText: clean, changesText: '' };
  const match = SPLIT_CHANGE.exec(clean);
  if (!match) return { targetText: clean, changesText: '' };
  return {
    targetText: clean.slice(0, match.index).trim(),
    changesText: clean.slice(match.index + match[0].length).trim(),
  };
}

function queryFrom(text: string): string | undefined {
  const words = sanitizeText(text)
    .split(' ')
    .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((token) => token.length > 0 && !/\d/.test(token) && !NON_TARGET.has(normalize(token)));
  if (words.length === 0) return undefined;
  return words.join(' ').slice(0, 60);
}

/** Dicas de busca derivadas do texto do alvo (sem LLM). */
export function deriveHints(targetText: string, now: Date): TargetHints {
  const fields = extractTransactionFields(targetText, now);
  const hints: TargetHints = {};
  const query = queryFrom(targetText);
  if (query) hints.query = query;
  if (fields.value !== undefined) hints.amount = fields.value;
  if (fields.date) hints.date = fields.date;
  return hints;
}

/** Campos do que muda, extraídos do texto depois de "para"/"pra" (regras, sem LLM). */
export function deriveChanges(parts: SegmentParts, now: Date): FieldMap {
  if (!parts.changesText) return {};
  const extracted = extractTransactionFields(parts.changesText, now);
  const changes: FieldMap = {};
  if (extracted.value !== undefined) changes.value = extracted.value;
  if (extracted.date) changes.date = extracted.date;
  if (extracted.category) changes.category = extracted.category;
  if (extracted.paid !== undefined) changes.paid = extracted.paid;
  if (extracted.type) changes.type = extracted.type;
  if (/\b(?:titulo|nome)\b/.test(normalize(parts.targetText)) && !changes.value && !changes.date) {
    changes.title = parts.changesText.slice(0, 100);
  }
  return changes;
}

function hasHints(hints: TargetHints): boolean {
  return Boolean(hints.query) || hints.amount !== undefined || Boolean(hints.date);
}

export class TargetResolver {
  constructor(private readonly adapters: AdapterRegistry) {}

  /** Busca até 5 candidatas do usuário. Os ids permanecem no servidor. */
  async resolve(userId: string, entity: AgentEntity, hints: TargetHints): Promise<ResolveResult> {
    const adapter = this.adapters[entity];
    if (!adapter || !hasHints(hints)) return { kind: 'none' };

    let found = await adapter.search(userId, hints);
    if (found.length === 0 && hints.query && (hints.amount !== undefined || hints.date)) {
      found = await adapter.search(userId, { query: hints.query });
    }
    const candidates = found.slice(0, MAX_CANDIDATES);
    if (candidates.length === 0) return { kind: 'none' };
    if (candidates.length === 1) return { kind: 'one', candidate: candidates[0] };
    return { kind: 'many', candidates };
  }
}
