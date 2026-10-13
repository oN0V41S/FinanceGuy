import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { transactionService } from '@/core/container';

const QuerySchema = z.object({
  before: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida. Use o formato YYYY-MM-DD')
    .refine((value) => {
      const [y, m, d] = value.split('-').map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
    }, 'Data inexistente'),
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  responsible: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().max(100).optional(),
  paid: z.enum(['true', 'false']).optional(),
});

// GET /api/transactions/opening-balance?before=YYYY-MM-DD[&type&category&responsible&search&paid]
// Saldo (receitas − despesas) das transações estritamente anteriores a `before`.
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Usuário não identificado' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const parsed = QuerySchema.safeParse({
      before: params.get('before') ?? undefined,
      type: params.get('type') ?? undefined,
      category: params.get('category') ?? undefined,
      responsible: params.get('responsible') ?? undefined,
      search: params.get('search') ?? undefined,
      paid: params.get('paid') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Parâmetros inválidos' },
        { status: 400 },
      );
    }

    const { paid, search, ...rest } = parsed.data;
    const filters = {
      userId, // sempre do header injetado pelo middleware, nunca do query string
      ...rest,
      ...(search ? { search } : {}),
      ...(paid !== undefined ? { paid: paid === 'true' } : {}),
    };

    const { data, fromCache } = await transactionService.getOpeningBalance(filters);

    return NextResponse.json(
      { data },
      {
        headers: {
          'Cache-Control': 'private, max-age=300',
          'X-Cache': fromCache ? 'HIT' : 'MISS',
        },
      },
    );
  } catch (error: unknown) {
    console.error('Erro ao calcular saldo inicial:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
