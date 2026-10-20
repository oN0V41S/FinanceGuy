import { Prisma } from '@prisma/client';
import type { JsonValue } from './IPendingAction.repository';

/** Converte JSON de domínio para o input do Prisma (null vira DbNull em colunas Json?). */
export function toNullableJson(
  value: JsonValue | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.DbNull;
  return value as Prisma.InputJsonValue;
}

export function toJson(value: JsonValue): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
