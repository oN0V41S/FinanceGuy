import type { TransactionService } from '@/features/transactions/transactions.service';
import type { GoalService } from '@/features/goals/goal.service';
import type { InvestmentService } from '@/features/investments/investment.service';
import type { ICategoryRepository } from '@/features/categories/ICategory.repository';
import type { Category } from '@/features/categories/validations';
import { AiContextLoadError } from './errors';
import { buildFinancialContext, getBrtPeriod } from './financialContext';
import { resolveQuestionPeriod } from './questionPeriod';
import { wantsPortfolio } from './portfolioIntent';
import { buildSystemPrompt, buildUserMessage } from './systemPrompt';
import type { AskResult, ILlmProvider, LlmMessage } from './types';

export interface AiServiceDeps {
  transactions: Pick<TransactionService, 'getAllTransactions'>;
  goals: Pick<GoalService, 'getAllGoals'>;
  investments: Pick<InvestmentService, 'getAllInvestments'>;
  /** Categorias via container (repositório, sem seed no caminho da IA); usadas só com `wantsPortfolio`. */
  categories: Pick<ICategoryRepository, 'findAll'>;
  llm: ILlmProvider;
  now?: () => Date;
}

/** Contexto da conversa: histórico (sem dados financeiros) e perfil descrito pelo usuário. */
export interface AskOptions {
  history?: LlmMessage[];
  profile?: string | null;
}

const NO_DATA_ANSWER =
  'Ainda não encontrei dados para analisar. Cadastre transações, metas ou investimentos e pergunte novamente.';

export class AiService {
  private readonly now: () => Date;

  constructor(private readonly deps: AiServiceDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  async ask(userId: string, question: string, options: AskOptions = {}): Promise<AskResult> {
    // Sem userId o repositório devolveria dados de TODOS os usuários: barra antes de qualquer consulta.
    if (!userId) {
      throw new Error('Usuário não identificado');
    }

    const now = this.now();
    // Sem LLM: o período citado na pergunta (qualquer data) amplia a consulta além da janela padrão.
    const range = resolveQuestionPeriod(question, now);
    const period = getBrtPeriod(now, range);

    let transactions, goals, investments;
    try {
      [transactions, goals, investments] = await Promise.all([
        this.deps.transactions.getAllTransactions({ userId, startDate: period.startDate, endDate: period.endDate }),
        this.deps.goals.getAllGoals(userId),
        this.deps.investments.getAllInvestments(userId),
      ]);
    } catch (error) {
      console.error('[ai.service] Falha ao carregar contexto', { name: error instanceof Error ? error.name : 'UnknownError' });
      throw new AiContextLoadError();
    }

    if (transactions.data.length === 0 && goals.length === 0 && investments.length === 0) {
      return { answer: NO_DATA_ANSWER, truncated: false };
    }

    // Seção de carteira sob demanda (FING-27): falha ao carregar categorias → seção omitida, resposta segue.
    let portfolioCategories: Category[] | undefined;
    if (wantsPortfolio(question)) {
      try {
        portfolioCategories = await this.deps.categories.findAll(userId, 'investment');
      } catch (error) {
        console.error('[ai.service] Falha ao carregar categorias; carteira omitida', {
          name: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    }

    const context = buildFinancialContext(
      { transactions: transactions.data, goals, investments },
      now,
      range,
      portfolioCategories,
    );

    const startedAt = Date.now();
    const response = await this.deps.llm.complete({
      system: buildSystemPrompt(),
      messages: [
        ...(options.history ?? []),
        { role: 'user', content: buildUserMessage(JSON.stringify(context), question, options.profile) },
      ],
    });

    console.info('[ai.service] Pergunta respondida', {
      latencyMs: Date.now() - startedAt,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      stopReason: response.stopReason,
    });

    return { answer: response.text, truncated: response.stopReason === 'max_tokens' };
  }
}
