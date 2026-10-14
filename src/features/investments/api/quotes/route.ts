import { NextRequest, NextResponse } from 'next/server';
import { quoteService } from '@/core/container';
import { investmentErrorResponse, unauthorized } from '../errors';

// GET /api/investments/quotes?symbol=PETR4&market=BR - Cotação atual de um ativo
export async function GET(request: NextRequest) {
  try {
    if (!request.headers.get('x-user-id')) return unauthorized();

    const { searchParams } = new URL(request.url);
    const data = await quoteService.getQuote({
      symbol: searchParams.get('symbol'),
      market: searchParams.get('market'),
    });

    return NextResponse.json({ data });
  } catch (error) {
    return investmentErrorResponse(error, 'GET /api/investments/quotes');
  }
}
