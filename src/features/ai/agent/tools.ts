import { z } from 'zod';
import type { AgentEntity, AgentOp, LlmToolDeclaration } from '../types';
import type { AdapterRegistry } from './entityAdapters/types';

/** Dicas de alvo para a tool de remoção (o servidor nunca expõe ids ao modelo). */
const DELETE_TARGET_SCHEMA = z.object({
  query: z.string().optional().describe('Palavra do título da transação a remover'),
  amount: z.number().optional().describe('Valor da transação a remover'),
  date: z.string().optional().describe('Data da transação a remover, YYYY-MM-DD'),
});

const DESCRIPTIONS: Record<string, string> = {
  'transaction:create':
    'Propõe a criação de uma transação (receita ou despesa). Apenas propõe: o usuário confirma na tela. Preencha somente o que o texto do usuário informa; nunca invente valores. Para parcelamento ("em 3x") ou recorrência ("todo mês por 12 meses") use total_installments (e is_recurring); nunca crie uma chamada por parcela.',
  'transaction:update':
    'Propõe a alteração de uma transação já encontrada pelo sistema. Informe apenas os campos que mudam. Apenas propõe: o usuário confirma na tela.',
  'transaction:delete':
    'Propõe a remoção de uma transação. Apenas propõe: o usuário confirma na tela. Nunca informe ids.',
};

export function toolName(entity: AgentEntity, op: AgentOp): string {
  return `propose_${entity}_${op}`;
}

export interface ParsedToolName {
  entity: AgentEntity;
  op: AgentOp;
}

/** Inverso de `toolName`; null para nomes que não são tools registradas. */
export function parseToolName(name: string): ParsedToolName | null {
  const match = /^propose_(transaction)_(create|update|delete)$/.exec(name);
  return match ? { entity: match[1] as AgentEntity, op: match[2] as AgentOp } : null;
}

const STRIP_KEYS = new Set(['$schema', 'default']);

function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !STRIP_KEYS.has(key))
        .map(([key, v]) => [key, clean(v)]),
    );
  }
  return value;
}

function toParameters(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
  return clean(json) as Record<string, unknown>;
}

/** Declarações de tools a partir dos schemas dos adapters registrados (hoje, só transação). */
export function buildToolDeclarations(adapters: AdapterRegistry): LlmToolDeclaration[] {
  const declarations: LlmToolDeclaration[] = [];
  const adapter = adapters.transaction;
  if (!adapter) return declarations;
  const ops: Array<[AgentOp, z.ZodType | undefined]> = [
    ['create', adapter.toolSchemas.create],
    ['update', adapter.toolSchemas.update],
    ['delete', DELETE_TARGET_SCHEMA],
  ];
  for (const [op, schema] of ops) {
    if (!schema) continue;
    declarations.push({
      name: toolName('transaction', op),
      description: DESCRIPTIONS[`transaction:${op}`],
      parameters: toParameters(schema),
    });
  }
  return declarations;
}
