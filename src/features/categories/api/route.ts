import { NextRequest, NextResponse } from 'next/server';
import { categoriesService } from '@/core/container';
import { CategoryScopeEnum } from '../validations';
import { handleCategoryError, invalidJsonResponse, readJsonBody } from './handleError';

const UNAUTHORIZED = { error: 'Usuário não identificado' };

// GET /api/categories?type=income|expense&scope=transaction|investment - Listar categorias do usuário (semeia os padrões)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    const type = request.nextUrl.searchParams.get('type');
    if (type !== null && type !== 'income' && type !== 'expense') {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    const parsedScope = CategoryScopeEnum.safeParse(request.nextUrl.searchParams.get('scope') ?? 'transaction');
    if (!parsedScope.success) {
      return NextResponse.json({ error: 'Escopo inválido' }, { status: 400 });
    }

    const data = await categoriesService.list(userId, type ?? undefined, parsedScope.data);
    return NextResponse.json({ data });
  } catch (error) {
    return handleCategoryError(error, 'listar categorias');
  }
}

// POST /api/categories - Criar categoria personalizada
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json(UNAUTHORIZED, { status: 401 });

    const parsed = await readJsonBody(request);
    if (!parsed.ok) return invalidJsonResponse();
    const body = parsed.body;
    const data = await categoriesService.create(body, userId);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleCategoryError(error, 'criar categoria');
  }
}
