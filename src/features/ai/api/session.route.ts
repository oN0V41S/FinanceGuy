import type { NextRequest } from 'next/server';
import { aiSessionService } from '@/core/container';
import { aiErrorResponse } from './errors';
import { jsonOk, requireUserId } from './actions/common';

// GET /api/ai/session - Hidrata a conversa ativa do usuário (cria se não existir)
export async function GET(request: NextRequest) {
  try {
    const userId = requireUserId(request);
    if (typeof userId !== 'string') return userId;
    return jsonOk(await aiSessionService.getSessionDto(userId));
  } catch (error) {
    return aiErrorResponse(error);
  }
}

// POST /api/ai/session - Arquiva a conversa ativa e inicia uma nova
export async function POST(request: NextRequest) {
  try {
    const userId = requireUserId(request);
    if (typeof userId !== 'string') return userId;
    await aiSessionService.startNew(userId);
    return jsonOk(await aiSessionService.getSessionDto(userId));
  } catch (error) {
    return aiErrorResponse(error);
  }
}
