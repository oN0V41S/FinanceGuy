import { z } from 'zod';

export const MAX_QUESTION_LENGTH = 500;

/** Chaves extras (ex.: userId vindo no corpo) são descartadas: o userId só vem do header injetado pelo proxy. */
export const AskSchema = z.object({
  question: z
    .string({ error: 'Digite uma pergunta' })
    .trim()
    .min(1, 'Digite uma pergunta')
    .max(MAX_QUESTION_LENGTH, `A pergunta deve ter no máximo ${MAX_QUESTION_LENGTH} caracteres`),
  /** FING-18: sessão de chat (opcional; sem ela, usa a sessão ativa do usuário). */
  sessionId: z.string().trim().min(1).max(64).optional(),
});

export type AskInput = z.infer<typeof AskSchema>;

// ── FING-18: ações do agente de escrita ──

const ID = z.string().trim().min(1, 'Identificador inválido').max(64, 'Identificador inválido');

export const UpdateActionSchema = z.object({
  fields: z
    .record(
      z.string().max(40),
      z.union([z.string().max(200), z.number(), z.boolean(), z.null()]),
    )
    .refine((fields) => Object.keys(fields).length <= 12, 'Campos demais'),
});

export const SelectCandidateSchema = z.object({
  index: z.number({ error: 'Opção inválida' }).int('Opção inválida').min(0, 'Opção inválida').max(4, 'Opção inválida'),
});

export const ConfirmActionsSchema = z.object({
  ids: z
    .array(ID, { error: 'Informe as ações a confirmar' })
    .min(1, 'Informe as ações a confirmar')
    .max(5, 'Confirme no máximo 5 ações por vez'),
});

export const CancelQueueSchema = z.object({ queueId: ID });
