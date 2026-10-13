import { NextRequest, NextResponse } from 'next/server';
import { quoteHistoryService } from '@/core/container';
import { investmentErrorResponse, unauthorized } from '../../errors';

// GET /api/investments/quotes/history?symbol=PETR4&market=BR&range=3mo - Histórico de fechamentos do ticker
export async function GET(request: NextRequest) {
  try {
    if (!request.headers.get('x-user-id')) return unauthorized();

    const { searchParams } = new URL(request.url);
    const data = await quoteHistoryService.getHistory({
      symbol: searchParams.get('symbol'),
      market: searchParams.get('market'),
      range: searchParams.get('range') ?? undefined,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return investmentErrorResponse(error, 'GET /api/investments/quotes/history');
  }
}
