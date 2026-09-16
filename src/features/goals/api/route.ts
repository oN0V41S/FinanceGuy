import { NextRequest, NextResponse } from 'next/server';
import { goalService } from '@/core/container';

// GET /api/goals - Listar metas do usuário logado
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Usuário não identificado' }, { status: 401 });
    }

    const data = await goalService.getAllGoals(userId);

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Erro ao buscar metas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/goals - Criar meta
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Usuário não identificado' }, { status: 401 });
    }

    const body = await request.json();

    const result = await goalService.createGoal(body, userId);

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validação falhou', details: error.errors }, { status: 400 });
    }

    console.error('Erro ao criar meta:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
