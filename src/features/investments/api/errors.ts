import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { QuoteUnavailableError } from '../quotes/types';

/** Mapeia erros do domínio de investimentos para respostas HTTP amigáveis (sem vazar detalhes internos). */
export function investmentErrorResponse(error: unknown, context: string): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: 'Validação falhou', details: error.issues }, { status: 400 });
  }

  if (error instanceof QuoteUnavailableError) {
    return NextResponse.json(
      { error: 'Não foi possível obter a cotação agora. Tente novamente em instantes.' },
      { status: 503 }
    );
  }

  if (error instanceof Error) {
    if (error.message.includes('não encontrado')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    // Regras de negócio com mensagem própria (quantidade maior que a posição, já resgatado, etc.)
    if (/Quantidade|Alíquota|resgat|ativo de mercado|Preço/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
  }

  console.error(`Erro em ${context}:`, error instanceof Error ? error.message : 'desconhecido');
  return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
}

export const unauthorized = (): NextResponse =>
  NextResponse.json({ error: 'Usuário não identificado' }, { status: 401 });
