import { NextRequest, NextResponse } from 'next/server';
import { marketInvestmentService } from '@/core/container';
import { investmentErrorResponse, unauthorized } from '../errors';

// GET /api/investments/portfolio - Investimentos com cotação atual, lucro e rentabilidade
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return unauthorized();

    const data = await marketInvestmentService.getPortfolio(userId);
    return NextResponse.json({ data });
  } catch (error) {
    return investmentErrorResponse(error, 'GET /api/investments/portfolio');
  }
}
