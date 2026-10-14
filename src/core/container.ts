import { ITransactionRepository } from '../features/transactions/ITransaction.repository';
import { PostgresTransactionRepository } from '../features/transactions/postgresTransaction.repository';
import { TransactionService } from '../features/transactions/transactions.service';

import { IUserRepository } from '../features/auth/IUser.repository';
import { PostgresUserRepository } from '../features/auth/postgresUser.repository';
import { AuthService } from '../features/auth/auth.service';

import { IInvestmentRepository } from '../features/investments/IInvestment.repository';
import { PostgresInvestmentRepository } from '../features/investments/postgresInvestment.repository';
import { InvestmentService } from '../features/investments/investment.service';

import { IGoalRepository } from '../features/goals/IGoal.repository';
import { PostgresGoalRepository } from '../features/goals/postgresGoal.repository';
import { GoalService } from '../features/goals/goal.service';

import { AiService } from '../features/ai/ai.service';
import { GeminiLlmProvider } from '../features/ai/gemini.provider';
import { createRateLimiter } from '../features/ai/rateLimiter';
import type { IRateLimiter } from '../features/ai/types';
import { getAgentConfig, getCategoryModel } from '../features/ai/config';
import { AgentService } from '../features/ai/agent/agent.service';
import { CategorySuggester } from '../features/ai/agent/categorySuggester';
import { ActionExecutor } from '../features/ai/agent/action.executor';
import { createTransactionAdapter } from '../features/ai/agent/entityAdapters/transaction';
import { createFinancialContextSource } from '../features/ai/agent/financialContextSource';
import { createQueueCardLookup } from '../features/ai/agent/queueCards';
import { PostgresPendingActionRepository } from '../features/ai/agent/repositories/postgresPendingAction.repository';
import { PostgresAuditLogRepository } from '../features/ai/agent/repositories/postgresAuditLog.repository';
import { PostgresChatSessionRepository } from '../features/ai/agent/repositories/postgresChatSession.repository';
import { OPEN_ACTION_STATUSES } from '../features/ai/agent/repositories/IPendingAction.repository';
import { SessionService } from '../features/ai/session/session.service';
import { createContextCache, withContextCache } from '../features/ai/session/contextCache';
import type { IContextCache } from '../features/ai/session/ISession.service';
import { prisma } from '@/lib/prisma';

import { cache } from '@/lib/cache';
import { ICacheRepository } from '@/shared/interfaces/ICacheRepository';

// Repositories
export const transactionRepository: ITransactionRepository = new PostgresTransactionRepository();
export const userRepository: IUserRepository = new PostgresUserRepository();
export const cacheRepository: ICacheRepository = cache;
export const investmentRepository: IInvestmentRepository = new PostgresInvestmentRepository();
export const goalRepository: IGoalRepository = new PostgresGoalRepository();

// Services
export const transactionService: TransactionService = new TransactionService(transactionRepository, userRepository, cacheRepository);
export const authService: AuthService = new AuthService(userRepository);
export const investmentService: InvestmentService = new InvestmentService(investmentRepository);
export const goalService: GoalService = new GoalService(goalRepository);

// IA (FING-7) — construção nunca lança nem faz rede (env e SDK são lidos sob demanda)
export const aiRateLimiter: IRateLimiter = createRateLimiter();
const aiLlm = new GeminiLlmProvider();
export const aiService: AiService = new AiService({
  transactions: transactionService,
  goals: goalService,
  investments: investmentService,
  llm: aiLlm,
});

// Agente de escrita (FING-18) — também sem rede/lançamentos na construção
const agentConfig = getAgentConfig();
const pendingActionRepository = new PostgresPendingActionRepository();
const auditLogRepository = new PostgresAuditLogRepository();
const chatSessionRepository = new PostgresChatSessionRepository();
export const aiContextCache: IContextCache = createContextCache(agentConfig);

/** Filas (queueId) que ainda têm ação aberta na sessão: protege os cards da compactação. */
async function openQueueIds(userId: string, sessionId: string): Promise<ReadonlySet<string>> {
  const rows = await prisma.pendingAction.findMany({
    where: { userId, sessionId, status: { in: OPEN_ACTION_STATUSES } },
    select: { queueId: true },
    distinct: ['queueId'],
  });
  return new Set(rows.map((row) => row.queueId));
}

const aiAdapters = { transaction: createTransactionAdapter(transactionService) };

export const aiSessionService: SessionService = new SessionService({
  repo: chatSessionRepository,
  llm: aiLlm,
  config: agentConfig,
  openActions: openQueueIds,
  cardLookup: createQueueCardLookup({ pending: pendingActionRepository, adapters: aiAdapters }),
});

const aiCategorySuggester = new CategorySuggester({ llm: aiLlm, rateLimiter: aiRateLimiter, model: getCategoryModel() });

export const aiAgent: AgentService = new AgentService({
  adapters: aiAdapters,
  pending: pendingActionRepository,
  sessions: aiSessionService,
  llm: aiLlm,
  rateLimiter: aiRateLimiter,
  categorySuggester: aiCategorySuggester,
  context: withContextCache(
    createFinancialContextSource({ transactions: transactionService, goals: goalService, investments: investmentService }),
    aiContextCache,
  ),
  config: agentConfig,
  defaultResponsible: async (userId) => {
    const user = await userRepository.findById(userId);
    return user?.nickname ?? user?.name ?? undefined;
  },
});

export const aiActionExecutor: ActionExecutor = new ActionExecutor({
  adapters: aiAdapters,
  pending: pendingActionRepository,
  audit: auditLogRepository,
  contextCache: aiContextCache,
  categorySuggester: aiCategorySuggester,
});
