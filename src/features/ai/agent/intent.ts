import { normalize } from './text';

export type IntentOp = 'create' | 'update' | 'delete';
export type IntentEntity = 'transaction' | 'investment' | 'category';

export interface IntentSegment {
  op: IntentOp;
  entity: IntentEntity;
  text: string;
}

export type ClarifyReason = 'missing_entity' | 'missing_verb' | 'too_many' | 'bulk_filter';

export type Intent =
  | { kind: 'read' }
  | { kind: 'clarify'; reason: ClarifyReason; message: string }
  | { kind: 'write'; segments: IntentSegment[] };

export const MAX_SEGMENTS = 5;

const VERBS: Record<IntentOp, string[]> = {
  create: [
    'criar', 'crie', 'adicionar', 'adicione', 'registrar', 'registre', 'lancar', 'lance',
    'cadastrar', 'cadastre', 'gastei', 'paguei', 'recebi', 'comprei', 'ganhei',
    'incluir', 'inclua', 'inserir', 'insira', 'anotar', 'anote', 'salvar', 'salve', 'colocar', 'coloque',
    'gerar', 'gere', 'nova', 'novo', 'novas', 'novos',
  ],
  update: [
    'alterar', 'altere', 'mudar', 'mude', 'editar', 'edite', 'atualizar', 'atualize', 'corrigir', 'corrija',
    'modificar', 'modifique', 'trocar', 'troque', 'ajustar', 'ajuste', 'renomear', 'renomeie',
  ],
  delete: [
    'remover', 'remova', 'excluir', 'exclua', 'apagar', 'apague', 'deletar', 'delete',
    'eliminar', 'elimine', 'tirar', 'tire',
  ],
};

/** Verbos no passado já implicam uma transação ("gastei 50 no mercado"). */
const IMPLICIT_TRANSACTION_VERBS = ['gastei', 'paguei', 'recebi', 'comprei', 'ganhei'];

/** "nova/novo" só vale como criar quando acompanha a entidade ("nova transação"), não em "novo mês". */
const NEW_WORDS = new Set(['nova', 'novo', 'novas', 'novos']);
const NEW_ENTITY = /\bnov[ao]s?\s+(?:transacao|transacoes|despesa|despesas|receita|receitas|gasto|gastos|lancamento|lancamentos|investimento|investimentos|ativo|ativos|categoria|categorias)\b/;

const ENTITIES: Record<IntentEntity, string[]> = {
  transaction: [
    'transacao', 'transacoes', 'despesa', 'despesas', 'receita', 'receitas',
    'gasto', 'gastos', 'lancamento', 'lancamentos',
  ],
  investment: ['investimento', 'investimentos', 'ativo', 'ativos', 'acao', 'acoes', 'fii', 'fiis', 'cdb', 'tesouro'],
  category: ['categoria', 'categorias'],
};

const INTERROGATIVE_START =
  /^(?:(?:por favor|oi|ola)[\s,]+)?(?:como|quanto|quantos|quantas|qual|quais|quando|por que|porque|onde|o que|quem|que)\b/;
const HYPOTHETICAL = /\bse eu\b/;
const BULK = /\b(?:todas?|todos|tudo)\b/;
const SPLIT = /;|\r?\n|\s+e depois\s+|\s+e tamb[eé]m\s+|(?:^|\s)\d+[.)]\s+/i;

function wordRegex(words: string[]): RegExp {
  return new RegExp(`\\b(?:${words.join('|')})\\b`, 'g');
}

/** "categoria" também é campo de transação/investimento: em "a categoria da transação" o alvo é o que vem depois de da/do. */
const CATEGORY_OF = /^\s+d[aeo]s?\s+(?:(?:ultim[ao]|mesm[ao]|minha|meu)\s+)?/;

interface Found<T extends string> {
  key: T;
  word: string;
  index: number;
}

function findFirst<T extends string>(norm: string, table: Record<T, string[]>): Found<T> | undefined {
  let best: Found<T> | undefined;
  for (const key of Object.keys(table) as T[]) {
    const match = wordRegex(table[key]).exec(norm);
    if (match && (!best || match.index < best.index)) {
      best = { key, word: match[0], index: match.index };
    }
  }
  return best;
}

function findVerb(norm: string): Found<IntentOp> | undefined {
  const found = findFirst(norm, VERBS);
  if (!found || !NEW_WORDS.has(found.word) || NEW_ENTITY.test(norm)) return found;
  // "novo" solto (ex.: "novo mês"): ignora e procura outro verbo.
  const stripped = norm.replace(new RegExp(`\\b(?:${[...NEW_WORDS].join('|')})\\b`, 'g'), ' ');
  return findFirst(stripped, VERBS);
}

function startsWithVerb(norm: string): boolean {
  const first = norm.replace(/^(?:por favor|favor)[\s,]+/, '').split(/[\s,.:!?]+/)[0];
  return Object.values(VERBS).some((list) => list.includes(first));
}

function isQuestion(norm: string): boolean {
  if (HYPOTHETICAL.test(norm)) return true;
  if (INTERROGATIVE_START.test(norm)) return true;
  return norm.includes('?') && !startsWithVerb(norm);
}

function splitSegments(message: string): string[] {
  return message
    .split(SPLIT)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function clarify(reason: ClarifyReason, message: string): Intent {
  return { kind: 'clarify', reason, message };
}

/**
 * Classificação determinística (sem LLM, sem cota) da mensagem do usuário.
 * Perguntas e hipóteses nunca disparam escrita, mesmo com palavra de comando.
 */
function findEntity(norm: string): Found<IntentEntity> | undefined {
  const first = findFirst(norm, ENTITIES);
  if (first?.key !== 'category') return first;
  const rest = norm.slice(first.index + first.word.length);
  const owner = CATEGORY_OF.exec(rest);
  if (!owner) return first;
  const { category: _category, ...owners } = ENTITIES;
  const target = findFirst(rest.slice(owner[0].length), owners);
  return target && target.index === 0 ? { ...target, index: first.index } : first;
}
export function classifyIntent(message: string): Intent {
  const norm = normalize(message).trim();
  if (norm.length === 0 || isQuestion(norm)) return { kind: 'read' };

  const parts = splitSegments(message);
  const analysed = parts.map((text) => {
    const n = normalize(text);
    return { text, n, verb: findVerb(n), entity: findEntity(n) };
  });

  if (!analysed.some((s) => s.verb)) return { kind: 'read' };

  if (analysed.length > MAX_SEGMENTS) {
    return clarify(
      'too_many',
      `Consigo cuidar de até ${MAX_SEGMENTS} ações por vez. Pode me enviar em partes menores?`,
    );
  }

  const segments: IntentSegment[] = [];
  // "Quero criar 2 transações:" + uma linha por item: o cabeçalho (termina em ':') dá o verbo e a entidade.
  const header = analysed.length > 1 && analysed[0].verb && analysed[0].entity && analysed[0].text.endsWith(':') ? analysed[0] : undefined;
  const items = header ? analysed.slice(1) : analysed;
  for (const s of items) {
    if (header && !s.verb) {
      segments.push({ op: header.verb!.key, entity: header.entity!.key, text: s.text });
      continue;
    }
    if (!s.verb) {
      return clarify(
        'missing_verb',
        `Não entendi o que fazer com "${s.text.slice(0, 60)}". Diga se quer criar, alterar ou remover.`,
      );
    }
    const op = s.verb.key;
    if (op !== 'create' && BULK.test(s.n)) {
      return clarify(
        'bulk_filter',
        'Por segurança, não altero nem removo vários itens de uma vez. Diga qual item específico você quer, com valor ou data.',
      );
    }
    let entity = s.entity?.key;
    if (!entity && IMPLICIT_TRANSACTION_VERBS.includes(s.verb.word)) entity = 'transaction';
    if (!entity) {
      return clarify(
        'missing_entity',
        'Sobre o que devo fazer isso? Me diga se é uma transação, um investimento ou uma categoria.',
      );
    }
    segments.push({ op, entity, text: s.text });
  }

  return { kind: 'write', segments };
}
