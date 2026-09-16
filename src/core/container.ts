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