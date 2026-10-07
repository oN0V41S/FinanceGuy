import { NextRequest, NextResponse } from 'next/server';
import { marketInvestmentService } from '@/core/container';
import { investmentErrorResponse, unauthorized } from '../../errors';

// POST /api/investments/[id]/redeem - Confirma o resgate (total ou parcial) e grava no histórico
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return unauthorized();

    const { id } = await params;
    const body = await request.json();
    const data = await marketInvestmentService.redeem(id, body, userId);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return investmentErrorResponse(error, 'POST /api/investments/[id]/redeem');
  }
}
