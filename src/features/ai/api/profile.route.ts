import type { NextRequest } from 'next/server';
import { aiSessionService } from '@/core/container';
import { aiErrorResponse } from './errors';
import { jsonOk, readBody, requireUserId } from './actions/common';
import { ProfileSchema } from '../validations';

const MAX_PROFILE_BODY_BYTES = 8192;

// GET /api/ai/profile - Descrição do usuário usada como contexto pelo assistente
export async function GET(request: NextRequest) {
  try {
    const userId = requireUserId(request);
    if (typeof userId !== 'string') return userId;
    return jsonOk({ profile: await aiSessionService.getProfile(userId) });
  } catch (error) {
    return aiErrorResponse(error);
  }
}

// PUT /api/ai/profile - Salva (ou limpa) a descrição. O conteúdo nunca é logado.
export async function PUT(request: NextRequest) {
  try {
    const userId = requireUserId(request);
    if (typeof userId !== 'string') return userId;
    const body = await readBody(request, ProfileSchema, MAX_PROFILE_BODY_BYTES);
    if ('error' in body) return body.error;
    await aiSessionService.setProfile(userId, body.data.profile);
    return jsonOk({ profile: body.data.profile });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
