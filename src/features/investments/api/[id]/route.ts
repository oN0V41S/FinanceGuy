import { NextRequest, NextResponse } from 'next/server';
import { investmentService } from '@/core/container';

// PUT /api/investments/[id] - Atualizar investimento existente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Usuário não identificado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updated = await investmentService.updateInvestment(id, body, userId);

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validação falhou', details: error.errors },
        { status: 400 }
      );
    }

    if (error?.message?.includes('não encontrado')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('Erro ao atualizar investimento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE /api/investments/[id] - Deletar investimento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Usuário não identificado' }, { status: 401 });
    }

    const { id } = await params;

    await investmentService.deleteInvestment(id, userId);

    return NextResponse.json({ data: { success: true } });
  } catch (error: any) {
    if (error?.message?.includes('não encontrado')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('Erro ao deletar investimento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
