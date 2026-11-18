import { NextRequest, NextResponse } from 'next/server';
import { categoriesService } from '@/core/container';
import { handleCategoryError, invalidJsonResponse, readJsonBody } from '../handleError';

const UNAUTHORIZED = { error: 'Usuário não identificado' };

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/categories/[id] - Renomear/recolorir/alterar tipo (rename propaga às transações)
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    const { id } = await params;
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return invalidJsonResponse();
    const body = parsed.body;
    const data = await categoriesService.update(id, body, userId);
    return NextResponse.json({ data });
  } catch (error) {
    return handleCategoryError(error, 'atualizar categoria');
  }
}

// DELETE /api/categories/[id]?reassignTo=<id> - Exclui; com transações exige reassignTo
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    const { id } = await params;
    const reassignTo = request.nextUrl.searchParams.get('reassignTo') ?? undefined;
    const result = await categoriesService.remove(id, { reassignTo }, userId);
    return NextResponse.json({ data: { success: true, moved: result.moved } });
  } catch (error) {
    return handleCategoryError(error, 'excluir categoria');
  }
}
