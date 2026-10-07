import { z } from 'zod';
import { round2 } from './calculations';
import { MarketEnum } from './quotes/types';

// Enums
export const InvestmentTypeEnum = z.enum(['Renda Fixa', 'Renda Variável']);
export const InvestmentStatusEnum = z.enum(['ACTIVE', 'REDEEMED']);

// Complete Schema
export const InvestmentSchema = z.object({
  id: z.string().min(1, 'ID deve ser uma string não vazia'),
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo (máximo 100 caracteres)'),
  type: InvestmentTypeEnum,
  value: z.number().positive('Valor deve ser positivo'),
  quantity: z.string().max(100).optional(),
  term: z.string().max(100).optional(),
  // Ativo de mercado (opcionais para manter investimentos manuais legados)
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .max(20)
    .regex(/^[A-Z0-9.\-=^]+$/, 'Ticker inválido')
    .optional(),
  market: MarketEnum.optional(),
  currency: z.string().trim().toUpperCase().max(5).optional(),
  purchaseDate: z.coerce.date().optional(),
  unitPrice: z.number().positive('Preço unitário deve ser positivo').optional(),
  shares: z.number().positive('Quantidade deve ser positiva').optional(),
  status: InvestmentStatusEnum.optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Schema for Create (without id, createdAt, updatedAt).
// Ativo de mercado (ticker informado): exige mercado, data, preço e quantidade; o valor investido é calculado.
export const CreateInvestmentSchema = InvestmentSchema.omit({ id: true, createdAt: true, updatedAt: true, status: true })
  .extend({ value: z.number().positive('Valor deve ser positivo').optional() })
  .superRefine((data, ctx) => {
    if (data.ticker) {
      const required = ['market', 'purchaseDate', 'unitPrice', 'shares'] as const;
      for (const field of required) {
        if (data[field] === undefined) {
          ctx.addIssue({ code: 'custom', path: [field], message: 'Campo obrigatório para ativos de mercado' });
        }
      }
      if (data.purchaseDate && data.purchaseDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
        ctx.addIssue({ code: 'custom', path: ['purchaseDate'], message: 'Data de compra não pode ser futura' });
      }
    } else if (data.value === undefined) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Valor é obrigatório' });
    }
  })
  .transform((data) => ({
    ...data,
    value: data.value ?? round2((data.shares ?? 0) * (data.unitPrice ?? 0)),
  }));

// Schema for Update (all optional)
export const UpdateInvestmentSchema = InvestmentSchema.partial();

// Resgate (preview e confirmação)
export const RedeemSchema = z.object({
  quantity: z.number().positive('Quantidade deve ser positiva'),
  /** Preço de venda; se omitido, usa a cotação atual. */
  unitPrice: z.number().positive('Preço deve ser positivo').optional(),
  taxRate: z.number().min(0, 'Alíquota deve estar entre 0 e 100').max(100, 'Alíquota deve estar entre 0 e 100'),
  date: z.coerce.date().optional(),
  note: z.string().trim().max(255).optional(),
});

// TS Types inferred
export type Investment = z.infer<typeof InvestmentSchema>;
export type CreateInvestmentInput = z.infer<typeof CreateInvestmentSchema>;
export type UpdateInvestmentInput = z.infer<typeof UpdateInvestmentSchema>;
export type RedeemRequest = z.infer<typeof RedeemSchema>;

// Tipo para input do repository (exclui campos gerados pelo DB, adiciona userId)
export type InvestmentInput = Omit<Investment, 'id' | 'createdAt' | 'updatedAt'> & { userId: string };
