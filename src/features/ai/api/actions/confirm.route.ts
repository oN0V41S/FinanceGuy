import type { NextRequest } from 'next/server';
import { aiActionExecutor } from '@/core/container';
import { ConfirmActionsSchema } from '../../validations';
import { aiErrorResponse } from '../errors';
import { jsonOk, readBody, requireUserId } from './common';

// POST /api/ai/actions/confirm - Confirma 1..5 ações em ordem (resultado por item)
export async function POST(request: NextRequest) {
  try {
    const userId = requireUserId(request);
    if (typeof userId !== 'string') return userId;

    const body = await readBody(request, ConfirmActionsSchema);
    if ('error' in body) return body.error;

    return jsonOk(await aiActionExecutor.confirm(userId, body.data.ids));
  } catch (error) {
    return aiErrorResponse(error);
  }
}
