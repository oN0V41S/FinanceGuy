import { NextResponse } from 'next/server';
import {
  AiBusyError,
  AiConnectionError,
  AiContextLoadError,
  AiRateLimitedError,
  AiRefusalError,
  AiTimeoutError,
  AiUnavailableError,
  AiUpstreamError,
} from '../errors';
import type { AskErrorBody, RateLimitScope } from '../types';

export const RATE_LIMIT_MESSAGES: Record<RateLimitScope, string> = {
  minute: 'Você fez muitas perguntas em pouco tempo. Tente novamente em alguns segundos.',
  day: 'Você atingiu o limite diário de perguntas do assistente. Volte amanhã.',
};

const BUSY_RETRY_AFTER_SECONDS = 30;

function errorResponse(message: string, status: number, retryAfterSeconds?: number): NextResponse<AskErrorBody> {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  if (retryAfterSeconds !== undefined) headers['Retry-After'] = String(retryAfterSeconds);
  return NextResponse.json({ error: message }, { status, headers });
}

export function rateLimitedResponse(scope: RateLimitScope, retryAfterSeconds: number): NextResponse<AskErrorBody> {
  return errorResponse(RATE_LIMIT_MESSAGES[scope], 429, retryAfterSeconds);
}

/** Traduz erros de domínio em HTTP + mensagem amigável. Erros desconhecidos nunca vazam a mensagem. */
export function aiErrorResponse(error: unknown): NextResponse<AskErrorBody> {
  if (error instanceof AiRateLimitedError) return rateLimitedResponse(error.scope, error.retryAfterSeconds);
  if (error instanceof AiUnavailableError) return errorResponse('O assistente está indisponível no momento.', 503);
  if (error instanceof AiBusyError) {
    return errorResponse('O assistente está com alta demanda. Tente novamente em instantes.', 503, BUSY_RETRY_AFTER_SECONDS);
  }
  if (error instanceof AiConnectionError) {
    return errorResponse('Não foi possível falar com o assistente agora. Tente novamente.', 503);
  }
  if (error instanceof AiTimeoutError) return errorResponse('O assistente demorou para responder. Tente novamente.', 504);
  if (error instanceof AiUpstreamError) {
    return errorResponse('Não consegui concluir a resposta. Tente uma pergunta mais específica.', 502);
  }
  if (error instanceof AiRefusalError) {
    return errorResponse('Não consegui responder a essa pergunta. Tente reformulá-la.', 422);
  }
  if (error instanceof AiContextLoadError) {
    return errorResponse('Não foi possível carregar seus dados financeiros agora.', 500);
  }

  console.error('[ai.api] Erro inesperado', { name: error instanceof Error ? error.name : 'UnknownError' });
  return errorResponse('Erro interno do servidor', 500);
}
