import { NextResponse } from 'next/server';
import { CategoryError, type CategoryErrorCode } from '../categories.service';

export const STATUS_BY_CODE: Record<CategoryErrorCode, number> = {
  NOT_FOUND: 404,
  DUPLICATE: 409,
  REASSIGN_REQUIRED: 409,
  LIMIT: 422,
  INVALID_REASSIGN: 422,
  INCOMPATIBLE_TYPE: 422,
  FORBIDDEN: 403,
};

/** Converte erros de domínio/validação em respostas HTTP com mensagens amigáveis. */
export function handleCategoryError(error: unknown, context: string): NextResponse {
  if (error instanceof CategoryError) {
    return NextResponse.json(
      { error: error.message, code: error.code, ...(error.details ? { details: error.details } : {}) },
      { status: STATUS_BY_CODE[error.code] }
    );
  }

  const zod = error as { name?: string; errors?: unknown; issues?: unknown };
  if (zod?.name === 'ZodError') {
    return NextResponse.json(
      { error: 'Validação falhou', details: zod.errors ?? zod.issues },
      { status: 400 }
    );
  }

  console.error(`Erro ao ${context}:`, error);
  return NextResponse.json(
    { error: 'Não foi possível concluir agora. Tente novamente em instantes.' },
    { status: 500 }
  );
}

/** Resposta para JSON malformado no corpo da requisição. */
export function invalidJsonResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Não conseguimos ler os dados enviados. Revise e tente novamente.' },
    { status: 400 }
  );
}

/** Lê o corpo JSON; retorna null se malformado. */
export async function readJsonBody(request: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false };
  }
}
