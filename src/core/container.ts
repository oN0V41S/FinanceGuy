import { ITransactionRepository } from '../features/transactions/ITransaction.repository';
import { PostgresTransactionRepository } from '../features/transactions/postgresTransaction.repository';
import { TransactionService } from '../features/transactions/transactions.service';

import { IUserRepository } from '../features/auth/IUser.repository';
import { PostgresUserRepository } from '../features/auth/postgresUser.repository';
import { AuthService } from '../features/auth/auth.service';

import { cache } from '@/lib/cache';
import { ICacheRepository } from '@/shared/interfaces/ICacheRepository';

// Repositories
export const transactionRepository: ITransactionRepository = new PostgresTransactionRepository();
export const userRepository: IUserRepository = new PostgresUserRepository();
export const cacheRepository: ICacheRepository = cache;

// Services
export const transactionService: TransactionService = new TransactionService(transactionRepository, userRepository, cacheRepository);
export const authService: AuthService = new AuthService(userRepository);