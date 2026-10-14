import type { TransactionService } from '@/features/transactions/transactions.service';
import type { GoalService } from '@/features/goals/goal.service';
import type { InvestmentService } from '@/features/investments/investment.service';
import { AiContextLoadError } from './errors';
import { buildFinancialContext, getBrtPeriod } from './financialContext';
import { buildSystemPrompt, buildUserMessage } from './systemPrompt';
import type { AskResult, ILlmProvider } from './types';

export interface AiServiceDeps {
  transactions: Pick<TransactionService, 'getAllTransactions'>;
  goals: Pick<GoalService, 'getAllGoals'>;
  investments: Pick<InvestmentService, 'getAllInvestments'>;
  llm: ILlmProvider;
  now?: () => Date;
}

const NO_DATA_ANSWER =
  'Ainda não encontrei dados para analisar. Cadastre transações, metas ou investimentos e pergunte novamente.';

export class AiService {
  private readonly now: () => Date;

  constructor(private readonly deps: AiServiceDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  async ask(userId: string, question: string): Promise<AskResult> {
    // Sem userId o repositório devolveria dados de TODOS os usuários: barra antes de qualquer consulta.
    if (!userId) {
      throw new Error('Usuário não identificado');
    }

    const now = this.now();
    const period = getBrtPeriod(now);

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

    const context = buildFinancialContext({ transactions: transactions.data, goals, investments }, now);

    const startedAt = Date.now();
    const response = await this.deps.llm.complete({
      system: buildSystemPrompt(),
      messages: [{ role: 'user', content: buildUserMessage(JSON.stringify(context), question) }],
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
