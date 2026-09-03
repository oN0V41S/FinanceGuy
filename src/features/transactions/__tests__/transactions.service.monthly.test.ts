/**
 * TDD — getMonthlySummary (dashboard analytics Phase 1)
 *
 * Contrato testado (TransactionService.getMonthlySummary):
 * 1. Cache MISS: chama repository.getMonthlySummary, grava no cache e retorna MonthlyPoint[].
 * 2. Cache HIT: retorna do cache sem chamar o repository.
 * 3. Cache corrompido: trata como MISS (A01 — def-in-depth).
 * 4. Chave de cache: `transactions:{escapeGlobChars(userId)}:monthly:{period}`
 * 5. TTL: mesmo padrão (CACHE_TTL env ou 300).
 */
import { TransactionService } from '../transactions.service';
import { ITransactionRepository } from '../ITransaction.repository';
import { IUserRepository } from '@/features/auth/IUser.repository';
import { MonthlyPoint } from '../types';

interface CacheRepositoryLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPattern(pattern: string): Promise<void>;
}

const createTransactionRepoMock = (): jest.Mocked<ITransactionRepository> =>
  ({
    create: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getSummary: jest.fn(),
    deleteFuture: jest.fn(),
    updateFuture: jest.fn(),
    getMonthlySummary: jest.fn(),
  } as unknown as jest.Mocked<ITransactionRepository>);

const createUserRepoMock = (): jest.Mocked<IUserRepository> =>
  ({
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateNickname: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>);

const createCacheMock = (): jest.Mocked<CacheRepositoryLike> =>
  ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delByPattern: jest.fn(),
  } as unknown as jest.Mocked<CacheRepositoryLike>);

describe('TransactionService — getMonthlySummary', () => {
  let service: TransactionService;
  let transactionRepo: jest.Mocked<ITransactionRepository>;
  let userRepo: jest.Mocked<IUserRepository>;
  let cache: jest.Mocked<CacheRepositoryLike>;

  const userId = 'u1';
  const period = 'last6';
  const expectedKey = `transactions:u1:monthly:last6`;

  const monthlyPoints: MonthlyPoint[] = [
    { month: '01', monthLabel: 'Jan', income: 5000, expense: 1200 },
    { month: '02', monthLabel: 'Fev', income: 5000, expense: 900 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CACHE_TTL;

    transactionRepo = createTransactionRepoMock();
    userRepo = createUserRepoMock();
    cache = createCacheMock();

    service = new TransactionService(transactionRepo, userRepo, cache);
  });

  afterEach(() => {
    delete process.env.CACHE_TTL;
    jest.restoreAllMocks();
  });

  it('should call repository and populate cache on MISS (cache.get returns null)', async () => {
    cache.get.mockResolvedValue(null);
    transactionRepo.getMonthlySummary.mockResolvedValue(monthlyPoints);

    const result = await service.getMonthlySummary(userId, period);

    expect(cache.get).toHaveBeenCalledWith(expectedKey);
    expect(transactionRepo.getMonthlySummary).toHaveBeenCalledWith(userId, period);
    expect(cache.set).toHaveBeenCalledWith(expectedKey, JSON.stringify(monthlyPoints), 300);
    expect(result).toEqual(monthlyPoints);
  });

  it('should return parsed cache data on HIT without calling repository', async () => {
    cache.get.mockResolvedValue(JSON.stringify(monthlyPoints));

    const result = await service.getMonthlySummary(userId, period);

    expect(cache.get).toHaveBeenCalledWith(expectedKey);
    expect(transactionRepo.getMonthlySummary).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
    expect(result).toEqual(monthlyPoints);
  });

  it('should respect CACHE_TTL env variable on MISS', async () => {
    process.env.CACHE_TTL = '600';
    cache.get.mockResolvedValue(null);
    transactionRepo.getMonthlySummary.mockResolvedValue(monthlyPoints);

    await service.getMonthlySummary(userId, period);

    expect(cache.set).toHaveBeenCalledWith(expectedKey, JSON.stringify(monthlyPoints), 600);
  });

  it('should treat corrupted cache as MISS, delete key and re-fetch from repository (A01)', async () => {
    cache.get.mockResolvedValue('{invalid-json!!');
    transactionRepo.getMonthlySummary.mockResolvedValue(monthlyPoints);

    const result = await service.getMonthlySummary(userId, period);

    expect(cache.del).toHaveBeenCalledWith(expectedKey);
    expect(transactionRepo.getMonthlySummary).toHaveBeenCalledWith(userId, period);
    expect(result).toEqual(monthlyPoints);
  });

  it('should escape glob characters in userId when building cache key (A03)', async () => {
    const maliciousUserId = 'u1*';
    const escapedKey = `transactions:u1\\*:monthly:last6`;
    cache.get.mockResolvedValue(null);
    transactionRepo.getMonthlySummary.mockResolvedValue(monthlyPoints);

    await service.getMonthlySummary(maliciousUserId, period);

    expect(cache.get).toHaveBeenCalledWith(escapedKey);
    expect(cache.set).toHaveBeenCalledWith(escapedKey, JSON.stringify(monthlyPoints), 300);
  });
});
