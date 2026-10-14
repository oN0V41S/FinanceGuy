import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/core/container';

// GET /api/transactions/years
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Usuário não identificado' }, { status: 401 });
    }

    const years = await transactionService.getAvailableYears(userId);

    return NextResponse.json(
      { data: years },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
