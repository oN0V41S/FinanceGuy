import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/core/container'; // Importa a instância já configurada

// Instanciação com Injeção de Dependência
// A instância 'transactionService' já está configurada no container.ts

// GET /api/transactions - Listar transações do usuário logado
export async function GET(request: NextRequest) {
  try {
    // Captura o userId injetado pelo Middleware
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Usuário não identificado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const paidParam = searchParams.get('paid');
    const filters = {
      userId, // Filtro obrigatório para segurança
      type: searchParams.get('type') || undefined,
      category: searchParams.get('category') || undefined,
      responsible: searchParams.get('responsible') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      paid: paidParam !== null ? paidParam === 'true' : undefined,
    };

    const { data, fromCache } = await transactionService.getAllTransactions(filters);
    const { data: summary } = await transactionService.getFinancialSummary(filters);

    return NextResponse.json(
      {
        data,
        summary,
        total: data.length,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300',
          'X-Cache': fromCache ? 'HIT' : 'MISS',
        },
      }
    );
  } catch (error: any) {
    console.error('Erro ao buscar transações:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/transactions - Criar transação (Simples ou Parcelada)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    // Validação robusta para garantir que userId é uma string não vazia e não "undefined" ou "null"
    if (typeof userId !== 'string' || userId.trim() === '' || userId === 'undefined' || userId === 'null') {
      console.error('Erro: userId inválido ou ausente no cabeçalho x-user-id. Recebido:', userId);
      return NextResponse.json({ error: 'Usuário não autorizado ou ID inválido' }, { status: 401 });
    }

    const body = await request.json();
    
    // O service agora cuida da lógica de parcelamento e vinculação ao userId
    const result = await transactionService.createTransaction({ ...body, userId });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validação falhou', details: error.errors }, { status: 400 });
    }
    
    console.error('Erro ao criar transação:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}