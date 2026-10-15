import { after, NextRequest, NextResponse } from 'next/server';
import { aiAgent, aiRateLimiter, aiService, aiSessionService } from '@/core/container';
import { AskSchema } from '../validations';
import type { AskErrorBody, AskResponseBody, LlmMessage } from '../types';
import { aiErrorResponse, rateLimitedResponse } from './errors';

const MAX_BODY_BYTES = 4096;
const NO_STORE = { 'Cache-Control': 'no-store' } as const;
const INVALID_BODY_MESSAGE = 'Corpo da requisição inválido.';

function badRequest(message: string): NextResponse<AskErrorBody> {
  return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE });
}

async function loadHistory(userId: string, requestedId?: string): Promise<LlmMessage[]> {
  try {
    if (!aiSessionService) return [];
    const sessionId = requestedId ?? (await aiSessionService.getOrCreateActive(userId)).sessionId;
    return await aiSessionService.getLlmHistory(userId, sessionId);
  } catch {
    return [];
  }
}

// Título (Gemini, com fallback local) só na 1ª interação. Roda após a resposta (after) para não
// bloquear o usuário por até o timeout do LLM; best-effort: nenhuma falha afeta a resposta.
function scheduleTitle(userId: string, sessionId: string): void {
  const run = async (): Promise<void> => {
    try {
      await aiSessionService?.ensureTitle(userId, sessionId);
    } catch {
      // best-effort
    }
  };
  try {
    after(run);
  } catch {
    // fora de um contexto de request (after indisponível): descarta sem bloquear.
    void run();
  }
}

// POST /api/ai/ask - Pergunta ao assistente financeiro (contexto: dados do próprio usuário)
export async function POST(request: NextRequest): Promise<NextResponse<AskResponseBody | AskErrorBody>> {
  try {
    // userId SOMENTE do header injetado pelo proxy; nunca do corpo.
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Usuário não identificado' }, { status: 401, headers: NO_STORE });
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

    // FING-18: pedidos de escrita são tratados pelo agente (a cota só é consumida se houver chamada ao LLM).
    // Retorna null para perguntas, que seguem o fluxo de leitura abaixo.
    const proposal = await aiAgent?.propose(userId, parsed.data.question, parsed.data.sessionId);
    if (proposal) {
      if (proposal.sessionId) scheduleTitle(userId, proposal.sessionId);
      return NextResponse.json(proposal, { headers: NO_STORE });
    }

    // Requisição inválida não consome cota: o limiter vem depois da validação.
    const limit = await aiRateLimiter.consume(userId);
    if (!limit.allowed) {
      return rateLimitedResponse(limit.scope, limit.retryAfterSeconds);
    }

    // Perfil e histórico da conversa são contexto opcional: falha aqui nunca derruba a resposta.
    const [profile, history] = await Promise.all([
      (aiSessionService?.getProfile(userId) ?? Promise.resolve('')).catch(() => ''),
      loadHistory(userId, parsed.data.sessionId),
    ]);
    const result = await aiService.ask(userId, parsed.data.question, { profile, history });

    // Registra o turno na sessão (best-effort; nunca falha a resposta).
    const sessionId = await aiAgent?.recordTurn(userId, parsed.data.sessionId, parsed.data.question, result);
    if (sessionId) {
      scheduleTitle(userId, sessionId);
      return NextResponse.json({ ...result, kind: 'answer' as const, sessionId }, { headers: NO_STORE });
    }

    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
