import type { NextRequest } from 'next/server';
import { aiActionExecutor } from '@/core/container';
import { CancelQueueSchema } from '../../validations';
import { aiErrorResponse } from '../errors';
import { jsonOk, readBody, requireUserId } from './common';

// POST /api/ai/actions/cancel - Cancela as ações abertas de uma fila
export async function POST(request: NextRequest) {
  try {
    const userId = requireUserId(request);
    if (typeof userId !== 'string') return userId;

    const body = await readBody(request, CancelQueueSchema);
    if ('error' in body) return body.error;

    return jsonOk(await aiActionExecutor.cancelQueue(userId, body.data.queueId));
  } catch (error) {
    return aiErrorResponse(error);
  }
}
