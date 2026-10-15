import type { NextRequest } from 'next/server';
import { aiActionExecutor } from '@/core/container';
import { SelectCandidateSchema } from '../../validations';
import { aiErrorResponse } from '../errors';
import { jsonError, jsonOk, readBody, requireUserId, validId, type ActionParams } from './common';

// POST /api/ai/actions/[id]/select - Escolhe a candidata (índice; o id nunca sai do servidor)
export async function POST(request: NextRequest, { params }: ActionParams) {
  try {
    const userId = requireUserId(request);
    if (typeof userId !== 'string') return userId;
    const { id } = await params;
    if (!validId(id)) return jsonError('Ação não encontrada.', 404);

    const body = await readBody(request, SelectCandidateSchema);
    if ('error' in body) return body.error;

    return jsonOk(await aiActionExecutor.select(userId, id, body.data.index));
  } catch (error) {
    return aiErrorResponse(error);
  }
}
