import { NextRequest, NextResponse } from 'next/server';
import { marketInvestmentService } from '@/core/container';
import { investmentErrorResponse, unauthorized } from '../../../errors';

// POST /api/investments/[id]/redeem/preview - Simula o resgate (imposto estimado) sem persistir
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return unauthorized();

    const { id } = await params;
    const body = await request.json();
    const data = await marketInvestmentService.previewRedeem(id, body, userId);

    return NextResponse.json({ data });
  } catch (error) {
    return investmentErrorResponse(error, 'POST /api/investments/[id]/redeem/preview');
  }
}
