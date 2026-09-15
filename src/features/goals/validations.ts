import { z } from 'zod';

// Complete Schema
export const GoalSchema = z.object({
  id: z.string().min(1, 'ID deve ser uma string não vazia'),
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo (máximo 100 caracteres)'),
  targetValue: z.number().positive('Valor alvo deve ser positivo'),
  currentValue: z.number().min(0, 'Valor atual não pode ser negativo').optional().default(0),
  deadlineLabel: z.string().max(100).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Schema for Create (without id, createdAt, updatedAt)
export const CreateGoalSchema = GoalSchema.omit({ id: true, createdAt: true, updatedAt: true });

// Schema for Update (all optional)
export const UpdateGoalSchema = GoalSchema.partial();

// TS Types inferred
export type Goal = z.infer<typeof GoalSchema>;
export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>;

// Tipo para input do repository (exclui campos gerados pelo DB, adiciona userId)
export type GoalInput = Omit<Goal, 'id' | 'createdAt' | 'updatedAt'> & { userId: string };
