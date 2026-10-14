import { NextRequest, NextResponse } from 'next/server';
import { aiRateLimiter, aiService } from '@/core/container';
import { AskSchema } from '../validations';
import type { AskErrorBody, AskResponseBody } from '../types';
import { aiErrorResponse, rateLimitedResponse } from './errors';

const MAX_BODY_BYTES = 4096;
const INVALID_BODY_MESSAGE = 'Corpo da requisição inválido.';

function badRequest(message: string): NextResponse<AskErrorBody> {
  return NextResponse.json({ error: message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/ai/ask - Pergunta ao assistente financeiro (contexto: dados do próprio usuário)
export async function POST(request: NextRequest): Promise<NextResponse<AskResponseBody | AskErrorBody>> {
  try {
    // userId SOMENTE do header injetado pelo proxy; nunca do corpo.
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Usuário não identificado' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const raw = await request.text();
    if (!raw || Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return badRequest(INVALID_BODY_MESSAGE);
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return badRequest(INVALID_BODY_MESSAGE);
    }

    const parsed = AskSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? INVALID_BODY_MESSAGE);
    }

    // Requisição inválida não consome cota: o limiter vem depois da validação.
    const limit = await aiRateLimiter.consume(userId);
    if (!limit.allowed) {
      return rateLimitedResponse(limit.scope, limit.retryAfterSeconds);
    }

    const result = await aiService.ask(userId, parsed.data.question);

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
