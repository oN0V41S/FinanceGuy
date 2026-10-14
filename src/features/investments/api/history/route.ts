import { NextRequest, NextResponse } from 'next/server';
import { marketInvestmentService } from '@/core/container';
import { investmentErrorResponse, unauthorized } from '../errors';

// GET /api/investments/history[?investmentId=] - Histórico de compras e resgates do usuário
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return unauthorized();

    const investmentId = new URL(request.url).searchParams.get('investmentId') ?? undefined;
    const data = await marketInvestmentService.getInvestmentHistoryForUser(userId, investmentId);

    return NextResponse.json({ data });
  } catch (error) {
    return investmentErrorResponse(error, 'GET /api/investments/history');
  }
}
