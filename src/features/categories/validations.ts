import { z } from 'zod';
import { CATEGORY_ICONS } from './defaults';

export const CategoryTypeEnum = z.enum(['income', 'expense', 'both']);

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
  transactionCount: z.number().int().min(0).optional(),
});

export const CreateCategorySchema = z.object({
  name: NameSchema,
  type: CategoryTypeEnum.optional().default('both'),
  color: ColorSchema.nullable().optional(),
  icon: IconSchema.nullable().optional(),
});

export const UpdateCategorySchema = z
  .object({
    name: NameSchema,
    type: CategoryTypeEnum,
    color: ColorSchema.nullable(),
    icon: IconSchema.nullable(),
  })
  .partial();

export const DeleteCategorySchema = z.object({
  reassignTo: z.string().trim().min(1).optional(),
});

export type Category = z.infer<typeof CategorySchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type DeleteCategoryInput = z.infer<typeof DeleteCategorySchema>;
