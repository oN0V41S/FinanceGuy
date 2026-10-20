import { z } from 'zod';
import { CATEGORY_ICONS } from './defaults';

export const CategoryTypeEnum = z.enum(['income', 'expense', 'both']);
export const CategoryScopeEnum = z.enum(['transaction', 'investment']);

const NameSchema = z
  .string()
  .trim()
  .min(1, 'Nome é obrigatório')
  .max(40, 'Nome muito longo (máximo 40 caracteres)')
  .refine((v) => !/[<>]/.test(v), 'Nome não pode conter < ou >');

const ColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use #RRGGBB)');
const IconSchema = z.enum(CATEGORY_ICONS);

export const CategorySchema = z.object({
  id: z.string().min(1),
  name: NameSchema,
  type: CategoryTypeEnum,
  color: ColorSchema.nullable(),
  icon: IconSchema.nullable(),
  isDefault: z.boolean(),
  scope: CategoryScopeEnum.optional(),
  transactionCount: z.number().int().min(0).optional(),
  investmentCount: z.number().int().min(0).optional(),
});

export const CreateCategorySchema = z.object({
  name: NameSchema,
  type: CategoryTypeEnum.optional().default('both'),
  color: ColorSchema.nullable().optional(),
  icon: IconSchema.nullable().optional(),
  scope: CategoryScopeEnum.optional().default('transaction'),
});

export const UpdateCategorySchema = z
  .object({
    name: NameSchema,
    type: CategoryTypeEnum,
    color: ColorSchema.nullable(),
    icon: IconSchema.nullable(),
  })
  .partial();

export const ListCategoriesSchema = z.object({
  scope: CategoryScopeEnum.optional().default('transaction'),
});

export const DeleteCategorySchema = z.object({
  reassignTo: z.string().trim().min(1).optional(),
});

export type Category = z.infer<typeof CategorySchema>;
export type CategoryScopeValue = z.infer<typeof CategoryScopeEnum>;
/** `scope` é opcional para o chamador (default 'transaction' aplicado na validação). */
export type CreateCategoryInput = Omit<z.infer<typeof CreateCategorySchema>, 'scope'> & { scope?: CategoryScopeValue };
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof DeleteCategorySchema>;
