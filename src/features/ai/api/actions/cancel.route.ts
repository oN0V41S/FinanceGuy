import type { NextRequest } from 'next/server';
import { aiActionExecutor } from '@/core/container';
import { aiErrorResponse } from '../errors';
import { jsonError, jsonOk, requireUserId, validId, type ActionParams } from './common';

// POST /api/ai/actions/[id]/cancel - Cancela uma ação
export async function POST(request: NextRequest, { params }: ActionParams) {
  try {
    const userId = requireUserId(request);
    if (typeof userId !== 'string') return userId;
    const { id } = await params;
    if (!validId(id)) return jsonError('Ação não encontrada.', 404);

    return jsonOk(await aiActionExecutor.cancel(userId, id));
  } catch (error) {
    return aiErrorResponse(error);
  }
}
