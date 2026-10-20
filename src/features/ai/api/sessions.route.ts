import type { NextRequest } from 'next/server';
import { aiSessionService } from '@/core/container';
import { aiErrorResponse } from './errors';
import { jsonError, jsonOk, readBody, requireUserId, validId, type ActionParams } from './actions/common';
import { RenameSessionSchema } from '../validations';

const NOT_FOUND = 'Conversa não encontrada.';

// GET /api/ai/sessions - Lista as conversas do usuário (barra lateral)
export async function GET(request: NextRequest) {
  try {
    const userId = requireUserId(request);
    if (typeof userId !== 'string') return userId;
    return jsonOk({ sessions: await aiSessionService.listSessions(userId) });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

// PATCH /api/ai/sessions/[id] - Renomeia uma conversa
export async function PATCH(request: NextRequest, { params }: ActionParams) {
  try {
    const userId = requireUserId(request);
    if (typeof userId !== 'string') return userId;
    const { id } = await params;
    if (!validId(id)) return jsonError(NOT_FOUND, 404);
    const body = await readBody(request, RenameSessionSchema);
    if ('error' in body) return body.error;
    const ok = await aiSessionService.renameSession(userId, id, body.data.title);
    return ok ? jsonOk({ ok: true }) : jsonError(NOT_FOUND, 404);
  } catch (error) {
    return aiErrorResponse(error);
  }
}

// DELETE /api/ai/sessions/[id] - Exclui uma conversa (mensagens e ações em cascata)
export async function DELETE(request: NextRequest, { params }: ActionParams) {
  try {
    const userId = requireUserId(request);
    if (typeof userId !== 'string') return userId;
    const { id } = await params;
    if (!validId(id)) return jsonError(NOT_FOUND, 404);
    const ok = await aiSessionService.deleteSession(userId, id);
    return ok ? jsonOk({ ok: true }) : jsonError(NOT_FOUND, 404);
  } catch (error) {
    return aiErrorResponse(error);
  }
}

// POST /api/ai/sessions/[id]/activate - Troca para a conversa e devolve as mensagens
export async function activate(request: NextRequest, { params }: ActionParams) {
  try {
    const userId = requireUserId(request);
    if (typeof userId !== 'string') return userId;
    const { id } = await params;
    if (!validId(id)) return jsonError(NOT_FOUND, 404);
    const dto = await aiSessionService.activateSession(userId, id);
    return dto ? jsonOk(dto) : jsonError(NOT_FOUND, 404);
  } catch (error) {
    return aiErrorResponse(error);
  }
}
