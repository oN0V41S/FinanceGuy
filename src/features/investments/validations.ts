import { z } from 'zod';

// Enums
export const InvestmentTypeEnum = z.enum(['Renda Fixa', 'Renda Variável']);

// Complete Schema
export const InvestmentSchema = z.object({
  id: z.string().min(1, 'ID deve ser uma string não vazia'),
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo (máximo 100 caracteres)'),
  type: InvestmentTypeEnum,
  value: z.number().positive('Valor deve ser positivo'),
  quantity: z.string().max(100).optional(),
  term: z.string().max(100).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Schema for Create (without id, createdAt, updatedAt)
export const CreateInvestmentSchema = InvestmentSchema.omit({ id: true, createdAt: true, updatedAt: true });

// Schema for Update (all optional)
export const UpdateInvestmentSchema = InvestmentSchema.partial();

// TS Types inferred
export type Investment = z.infer<typeof InvestmentSchema>;
export type CreateInvestmentInput = z.infer<typeof CreateInvestmentSchema>;
export type UpdateInvestmentInput = z.infer<typeof UpdateInvestmentSchema>;

// Tipo para input do repository (exclui campos gerados pelo DB, adiciona userId)
export type InvestmentInput = Omit<Investment, 'id' | 'createdAt' | 'updatedAt'> & { userId: string };
