import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/core/container';
import { CategoryError } from '@/features/categories/categories.service';
import { STATUS_BY_CODE } from '@/features/categories/api/handleError';

/** Categoria inexistente/incompatível em transações segue 422; demais códigos usam o mapa de categorias. */
function categoryErrorStatus(error: CategoryError): number {
  return error.code === 'NOT_FOUND' || error.code === 'INCOMPATIBLE_TYPE' ? 422 : STATUS_BY_CODE[error.code];
}

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
    const scope = request.nextUrl.searchParams.get('scope');

    // scope=future — "esta e futuras": atualiza a parcela selecionada e as seguintes.
    if (scope === 'future') {
      const body = await request.json();
      const count = await transactionService.updateFutureTransactions(id, userId, body);
      return NextResponse.json({ data: { updated: count } });
    }

    const body = await request.json();

    const updated = await transactionService.updateTransaction(id, { ...body, userId });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validação falhou', issues: error.issues ?? error.errors },
        { status: 400 }
      );
    }

    if (error instanceof CategoryError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: categoryErrorStatus(error) });
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
    const scope = request.nextUrl.searchParams.get('scope');

    // scope=future — "esta e futuras": deleta a parcela selecionada e as seguintes.
    if (scope === 'future') {
      const count = await transactionService.deleteFutureTransactions(id, userId);
      return NextResponse.json({ success: true, count });
    }

    await transactionService.deleteTransaction(id, userId);

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
