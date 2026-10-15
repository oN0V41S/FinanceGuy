import type { z } from 'zod';
import type { ActionFieldDto, AgentEntity, AgentOp, MissingFieldDto } from '../../types';

export type FieldMap = Record<string, unknown>;

/** Dicas (derivadas do texto do usuário) para localizar o alvo de alterar/remover. */
export interface TargetHints {
  query?: string;
  amount?: number;
  /** YYYY-MM-DD */
  date?: string;
}

/** Candidata encontrada no escopo do usuário. O `id` NUNCA sai do servidor (nem para o LLM, nem para o DTO). */
export interface TargetCandidate {
  id: string;
  label: string;
  record: FieldMap;
}

export interface EvaluateOptions {
  today: string;
  defaultResponsible?: string;
  hasTarget: boolean;
}

export interface Evaluation {
  /** Campos normalizados (padrões aplicados). */
  fields: FieldMap;
  missing: MissingFieldDto[];
  errors: Record<string, string>;
  valid: boolean;
}

export interface ToolSchemas {
  create?: z.ZodType;
  update?: z.ZodType;
}

/** Fronteira por entidade: schema, busca, escrita e apresentação. Toda escrita é escopada por `userId`. */
export interface EntityAdapter {
  readonly entity: AgentEntity;
  /** Schemas (Zod) dos argumentos que o LLM pode propor, por operação. */
  readonly toolSchemas: ToolSchemas;
  /** Mantém só chaves permitidas e normaliza tipos (valor, data, tipo, pago). Valores em branco são descartados. */
  sanitize(raw: Record<string, unknown>): FieldMap;
  evaluate(op: AgentOp, payload: FieldMap, opts: EvaluateOptions): Evaluation;
  toFieldDtos(op: AgentOp, evaluation: Evaluation): ActionFieldDto[];
  recordToFieldDtos(record: FieldMap): ActionFieldDto[];
  /** Resumo em uma linha (PT-BR) para texto acessível e "Próximos passos". */
  describe(op: AgentOp, payload: FieldMap, before?: FieldMap): string;
  search(userId: string, hints: TargetHints): Promise<TargetCandidate[]>;
  getById(userId: string, id: string): Promise<FieldMap | null>;
  create(userId: string, fields: FieldMap): Promise<{ id: string; after: FieldMap }>;
  update(userId: string, id: string, changes: FieldMap, current: FieldMap): Promise<{ after: FieldMap }>;
  remove(userId: string, id: string): Promise<void>;
}

export type AdapterRegistry = Partial<Record<AgentEntity, EntityAdapter>>;
