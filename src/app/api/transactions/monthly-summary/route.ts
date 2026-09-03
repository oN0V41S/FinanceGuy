import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/core/container';
import { z } from 'zod';

const PeriodSchema = z.string().regex(
  /^(last6|\d{4}|\d{4}-s[12])$/,
  'Período inválido. Use: last6, YYYY, YYYY-s1 ou YYYY-s2'
);

// GET /api/transactions/monthly-summary?period=last6
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Usuário não identificado' }, { status: 401 });
    }

    const period = request.nextUrl.searchParams.get('period');

    const periodResult = PeriodSchema.safeParse(period);
    if (!periodResult.success) {
      return NextResponse.json(
        { error: periodResult.error.issues[0]?.message ?? 'Período inválido' },
        { status: 400 }
      );
    }

    const data = await transactionService.getMonthlySummary(userId, periodResult.data);

    return NextResponse.json(
      { data },
      {
        headers: {
          'Cache-Control': 'private, max-age=300',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Erro ao buscar resumo mensal:', error);
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
