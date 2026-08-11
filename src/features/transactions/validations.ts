import {z} from 'zod';

// Enums
export const TransactionTypeEnum = z.enum(['income', 'expense']);
export const CategoryEnum = z.enum([
    'Alimentação',
    'Transporte',
    'Casa',
    'Saúde',
    'Educação',
    'Lazer',
    'Salário',
    'Investimentos',
    'Outros',
]);

// Complete Schema
export const TransactionSchema = z.object({
    id: z.string().min(1, 'ID deve ser uma string não vazia'),
    type: TransactionTypeEnum,
    title: z.string().trim().max(100, 'Título muito longo (máximo 100 caracteres)').optional(),
    description: z.string().max(255, 'Descrição muito longa (máximo 255 caracteres)').optional(),
    value: z.number().positive('Valor deve ser positivo'),
    date: z.string().refine(
        (val) => !isNaN(Date.parse(val)),
        'Data deve estar em (YYYY-MM-DD)'
    ),
    category: CategoryEnum,
    responsible: z.string().min(1, 'Responsável é Obrigatório').max(100),
    installment_number: z.number().positive().optional(),
    total_installments: z.number().positive().optional(),
    is_recurring: z.boolean().optional().default(false),
    parent_transaction_id: z.string().optional().nullable(),
    paid: z.boolean().optional().default(false),
    created_at: z.date().optional(),
    updated_at: z.date().optional()
});

// Schema for Create (without id, created_at, updated_at)
export const CreateTransactionSchema = TransactionSchema.omit({ id: true, created_at: true, updated_at: true });

// Schema for Update (all optional)
export const UpdateTransactionSchema = TransactionSchema.partial();

// Schema for Finance Sumary
export const FinancialSummarySchema = z.object({
    income: z.number().min(0),
    expense: z.number().min(0),
    balance: z.number(),
});

// TS Types inferred
export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type FinancialSummary = z.infer<typeof FinancialSummarySchema>;

// Tipo para input do repository (exclui campos gerados pelo DB, adiciona userId)
export type TransactionInput = Omit<Transaction, 'id' | 'created_at' | 'updated_at'> & { userId: string };
