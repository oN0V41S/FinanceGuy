import { z } from 'zod';

export const MAX_QUESTION_LENGTH = 500;

/** Chaves extras (ex.: userId vindo no corpo) são descartadas: o userId só vem do header injetado pelo proxy. */
export const AskSchema = z.object({
  question: z
    .string({ error: 'Digite uma pergunta' })
    .trim()
    .min(1, 'Digite uma pergunta')
    .max(MAX_QUESTION_LENGTH, `A pergunta deve ter no máximo ${MAX_QUESTION_LENGTH} caracteres`),
});

export type AskInput = z.infer<typeof AskSchema>;
