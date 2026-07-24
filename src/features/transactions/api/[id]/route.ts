import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/core/container';

// PUT /api/transactions/[id] - Atualizar transação existente
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

    const updated = await transactionService.updateTransaction(id, body);

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validação falhou', issues: error.issues ?? error.errors },
        { status: 400 }
      );
    }

    if (error?.message?.includes('não encontrada')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    console.error('Erro ao atualizar transação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/[id] - Deletar transação
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
    await transactionService.deleteTransaction(id);

    return NextResponse.json({
      success: true,
      message: 'Transação deletada',
      id,
    });
  } catch (error: any) {
    if (error?.message?.includes('não encontrada')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    console.error('Erro ao deletar transação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
