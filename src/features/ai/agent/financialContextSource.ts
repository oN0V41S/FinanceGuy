import type { GoalService } from '@/features/goals/goal.service';
import type { InvestmentService } from '@/features/investments/investment.service';
import type { TransactionService } from '@/features/transactions/transactions.service';
import { AiContextLoadError } from '../errors';
import { buildFinancialContext, getBrtPeriod } from '../financialContext';
import { resolveQuestionPeriod } from '../questionPeriod';
import type { FinancialContextDto, FinancialContextSource } from '../types';

export interface FinancialContextSourceDeps {
  transactions: Pick<TransactionService, 'getAllTransactions'>;
  goals: Pick<GoalService, 'getAllGoals'>;
  investments: Pick<InvestmentService, 'getAllInvestments'>;
  now?: () => Date;
}

/** Fonte do contexto financeiro (mesmo DTO do fluxo de leitura), para ser decorada com `withContextCache`. */
export function createFinancialContextSource(deps: FinancialContextSourceDeps): FinancialContextSource {
  const clock = deps.now ?? (() => new Date());
  return {
    async getContext(userId: string, question: string): Promise<FinancialContextDto> {
      if (!userId) throw new Error('Usuário não identificado');
      const now = clock();
      const range = resolveQuestionPeriod(question, now);
      const period = getBrtPeriod(now, range);
      try {
        const [transactions, goals, investments] = await Promise.all([
          deps.transactions.getAllTransactions({ userId, startDate: period.startDate, endDate: period.endDate }),
          deps.goals.getAllGoals(userId),
          deps.investments.getAllInvestments(userId),
        ]);
        return buildFinancialContext({ transactions: transactions.data, goals, investments }, now, range);
      } catch (error) {
        console.error('[ai.agent] Falha ao carregar contexto', { name: error instanceof Error ? error.name : 'UnknownError' });
        throw new AiContextLoadError();
      }
    },
  };
}
