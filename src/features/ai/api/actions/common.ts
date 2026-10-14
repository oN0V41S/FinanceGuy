import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { z } from 'zod';
import type { AskErrorBody } from '../../types';

const MAX_BODY_BYTES = 4096;
const INVALID_BODY_MESSAGE = 'Corpo da requisição inválido.';
const NO_STORE = { 'Cache-Control': 'no-store' };

export type ActionParams = { params: Promise<{ id: string }> };

export function jsonError(message: string, status: number): NextResponse<AskErrorBody> {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

export function jsonOk<T>(body: T): NextResponse<T> {
  return NextResponse.json(body, { headers: NO_STORE });
}

/** userId SOMENTE do header injetado pelo proxy; nunca do corpo nem da URL. */
export function requireUserId(request: NextRequest): string | NextResponse<AskErrorBody> {
  const userId = request.headers.get('x-user-id');
  return userId ? userId : jsonError('Usuário não identificado', 401);
}

export async function readBody<S extends z.ZodType>(
  request: NextRequest,
  schema: S,
  maxBytes: number = MAX_BODY_BYTES,
): Promise<{ data: z.infer<S> } | { error: NextResponse<AskErrorBody> }> {
  const raw = await request.text();
  if (!raw || Buffer.byteLength(raw, 'utf8') > maxBytes) {
    return { error: jsonError(INVALID_BODY_MESSAGE, 400) };
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { error: jsonError(INVALID_BODY_MESSAGE, 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { error: jsonError(parsed.error.issues[0]?.message ?? INVALID_BODY_MESSAGE, 400) };
  }
  return { data: parsed.data };
}

export function validId(id: string | undefined): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 64;
}
