import type { NextRequest } from 'next/server';
import { aiActionExecutor } from '@/core/container';
import { UpdateActionSchema } from '../../validations';
import { aiErrorResponse } from '../errors';
import { jsonError, jsonOk, readBody, requireUserId, validId, type ActionParams } from './common';

// PATCH /api/ai/actions/[id] - Edita os campos da ação (revalida e recalcula o que falta)
export async function PATCH(request: NextRequest, { params }: ActionParams) {
  try {
    const userId = requireUserId(request);
    if (typeof userId !== 'string') return userId;
    const { id } = await params;
    if (!validId(id)) return jsonError('Ação não encontrada.', 404);

    const body = await readBody(request, UpdateActionSchema);
    if ('error' in body) return body.error;

    return jsonOk(await aiActionExecutor.update(userId, id, body.data.fields));
  } catch (error) {
    return aiErrorResponse(error);
  }
}
