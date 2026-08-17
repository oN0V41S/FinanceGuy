/**
 * TDD — FASE RED (Issue #9 — cache server-side com Redis/Upstash)
 *
 * Contrato testado (TransactionService — implementação AINDA SEM cache):
 * 1. Constructor passa a receber ICacheRepository como 3º parâmetro OBRIGATÓRIO.
 * 2. getAllTransactions(filters):
 *    - Cache key = `transactions:{userId}:{md5(JSON.stringify(filters sem userId))}`
 *      (hash via node crypto.createHash('md5')).
 *    - MISS: chama o repository e faz cache.set(key, JSON.stringify(data), ttl)
 *      com `ttl = process.env.CACHE_TTL ?? 300`. Retorna { data, fromCache: false }.
 *    - HIT: retorna JSON.parse sem chamar o repository. Retorna { data, fromCache: true }.
 * 3. getFinancialSummary(filters): MESMOS checks, com chave PRÓPRIA
 *    `transactions:{userId}:{hash}:summary` (I01 — chaves SEPARADAS para
 *    lista e summary; payloads de tipos diferentes na mesma chave geravam
 *    100% MISS na rota real: ping-pong de reads/writes por GET).
 * 4. Invalidação via delByPattern('transactions:{userId}:*') em TODAS as mutations:
 *    createTransaction, updateTransaction, deleteTransaction,
 *    updateFutureTransactions, deleteFutureTransactions.
 * 5. A01 — payload corrompido no Redis: JSON.parse em try/catch → trata como
 *    MISS, `del(cacheKey)` na entrada corrompida e segue o fluxo normal
 *    (repository + re-gravação). Nunca vira 500 persistente.
 * 6. A03 — escapeGlobChars no userId ao montar chave/pattern
 *    (`*`, `?`, `[`, `]` escapados — defense-in-depth).
 *
 * Contrato de assinaturas assumido (fase red — implementação pode ajustar):
 * - updateTransaction(id, data) extrai userId de `data` (mesmo padrão do create).
 * - deleteTransaction(id, userId) passa a receber o userId como 2º parâmetro
 *   (padrão idêntico ao deleteFutureTransactions).
 *
 * Esperado nesta fase: TODOS os testes FALHAM por asserção (o service atual
 * não toca em cache) — red fora do verde, aguardando a implementação.
 */
import { createHash } from 'crypto';
import { TransactionService } from '../transactions.service';
import { ITransactionRepository } from '../ITransaction.repository';
import { IUserRepository } from '@/features/auth/IUser.repository';
import type { Transaction, FinancialSummary } from '@/types/finance';

// Contrato local do cache (equivale a ICacheRepository — ainda não existe)
interface CacheRepositoryLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPattern(pattern: string): Promise<void>;
}

// Computa a chave esperada de forma INDEPENDENTE da implementação:
// transactions:{userId}:{md5(JSON.stringify(filters sem userId))}
const buildCacheKey = (userId: string, filtersWithoutUserId: Record<string, unknown>): string => {
  const hash = createHash('md5').update(JSON.stringify(filtersWithoutUserId)).digest('hex');
  return `transactions:${userId}:${hash}`;
};

const createTransactionRepoMock = (): jest.Mocked<ITransactionRepository> & {
  deleteFuture: jest.Mock;
  updateFuture: jest.Mock;
} =>
  ({
    create: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getSummary: jest.fn(),
    deleteFuture: jest.fn(),
    updateFuture: jest.fn(),
  } as unknown as jest.Mocked<ITransactionRepository> & {
    deleteFuture: jest.Mock;
    updateFuture: jest.Mock;
  });

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

describe('TransactionService — cache server-side', () => {
  let service: TransactionService;
  let transactionRepo: jest.Mocked<ITransactionRepository> & {
    deleteFuture: jest.Mock;
    updateFuture: jest.Mock;
  };
  let userRepo: jest.Mocked<IUserRepository>;
  let cache: jest.Mocked<CacheRepositoryLike>;

  const filters = { userId: 'u1', type: 'expense', startDate: '2026-01-01' };
  const filtersWithoutUserId = { type: 'expense', startDate: '2026-01-01' };
  const expectedKey = buildCacheKey('u1', filtersWithoutUserId);
  // I01 — summary usa chave PRÓPRIA (sufixo `:summary`), distinta da lista.
  const expectedSummaryKey = `${expectedKey}:summary`;

  const transactions: Transaction[] = [
    {
      id: 't1',
      type: 'expense',
      description: 'Café da manhã',
      value: 25,
      date: '2026-01-15',
      category: 'Alimentação',
      responsible: 'Ana',
      paid: false,
      is_recurring: false,
    },
    {
      id: 't2',
      type: 'expense',
      description: 'Uber',
      value: 40,
      date: '2026-01-20',
      category: 'Transporte',
      responsible: 'Ana',
      paid: true,
      is_recurring: false,
    },
  ];

  const summary: FinancialSummary = { income: 5000, expense: 1200, balance: 3800 };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CACHE_TTL;

    transactionRepo = createTransactionRepoMock();
    userRepo = createUserRepoMock();
    cache = createCacheMock();

    userRepo.findById.mockResolvedValue({
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      nickname: 'ana',
    });

    // 3º parâmetro OBRIGATÓRIO (decisão: sempre injetar o cache)
    service = new TransactionService(transactionRepo, userRepo, cache);
  });

  afterEach(() => {
    delete process.env.CACHE_TTL;
    jest.restoreAllMocks();
  });

  describe('getAllTransactions', () => {
    it('should return { data, fromCache: false } and populate the cache on MISS when cache get resolves null', async () => {
      cache.get.mockResolvedValue(null);
      transactionRepo.getAll.mockResolvedValue(transactions);

      const result = await service.getAllTransactions(filters);

      expect(cache.get).toHaveBeenCalledWith(expectedKey);
      expect(transactionRepo.getAll).toHaveBeenCalledWith(filters);
      expect(cache.set).toHaveBeenCalledWith(expectedKey, JSON.stringify(transactions), 300);
      expect(result).toEqual({ data: transactions, fromCache: false });
    });

    it('should build the cache key as transactions:{userId}:{md5} hashing filters WITHOUT userId', async () => {
      cache.get.mockResolvedValue(null);
      transactionRepo.getAll.mockResolvedValue(transactions);

      // Garante que os dois hashes realmente diferem (userId NÃO pode entrar no hash)
      const keyHashingUserIdToo = buildCacheKey('u1', filters);
      expect(keyHashingUserIdToo).not.toBe(expectedKey);

      await service.getAllTransactions(filters);

      expect(cache.get).toHaveBeenCalledWith(expectedKey);
      expect(cache.get).not.toHaveBeenCalledWith(keyHashingUserIdToo);
    });

    it('should return { data: parsed, fromCache: true } on HIT without calling the repository', async () => {
      const getAllSpy = jest.spyOn(transactionRepo, 'getAll');
      cache.get.mockResolvedValue(JSON.stringify(transactions));

      const result = await service.getAllTransactions(filters);

      expect(cache.get).toHaveBeenCalledWith(expectedKey);
      expect(getAllSpy).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
      expect(result).toEqual({ data: transactions, fromCache: true });
    });

    it('should use process.env.CACHE_TTL as ttl on MISS when CACHE_TTL is defined', async () => {
      process.env.CACHE_TTL = '600';
      cache.get.mockResolvedValue(null);
      transactionRepo.getAll.mockResolvedValue(transactions);

      await service.getAllTransactions(filters);

      expect(cache.set).toHaveBeenCalledWith(expectedKey, JSON.stringify(transactions), 600);
    });

    it('should treat a corrupted cached payload as MISS, delete the key and re-fetch from the repository (A01)', async () => {
      cache.get.mockResolvedValue('{invalid-json!!');
      transactionRepo.getAll.mockResolvedValue(transactions);

      const result = await service.getAllTransactions(filters);

      expect(cache.get).toHaveBeenCalledWith(expectedKey);
      expect(cache.del).toHaveBeenCalledWith(expectedKey);
      expect(transactionRepo.getAll).toHaveBeenCalledWith(filters);
      expect(cache.set).toHaveBeenCalledWith(expectedKey, JSON.stringify(transactions), 300);
      expect(result).toEqual({ data: transactions, fromCache: false });
    });

    it('should escape glob characters in the userId when building the cache key (A03)', async () => {
      const maliciousFilters = { userId: 'u1*', type: 'expense' };
      const escapedKey = buildCacheKey('u1\\*', { type: 'expense' });
      cache.get.mockResolvedValue(null);
      transactionRepo.getAll.mockResolvedValue(transactions);

      await service.getAllTransactions(maliciousFilters);

      expect(cache.get).toHaveBeenCalledWith(escapedKey);
      expect(cache.set).toHaveBeenCalledWith(escapedKey, JSON.stringify(transactions), 300);
    });
  });

  describe('getFinancialSummary', () => {
    it('should return { data, fromCache: false } and populate the cache on MISS when cache get resolves null', async () => {
      cache.get.mockResolvedValue(null);
      transactionRepo.getSummary.mockResolvedValue(summary);

      const result = await service.getFinancialSummary(filters);

      expect(cache.get).toHaveBeenCalledWith(expectedSummaryKey);
      expect(transactionRepo.getSummary).toHaveBeenCalledWith(filters);
      expect(cache.set).toHaveBeenCalledWith(expectedSummaryKey, JSON.stringify(summary), 300);
      expect(result).toEqual({ data: summary, fromCache: false });
    });

    it('should return { data: parsed, fromCache: true } on HIT without calling the repository', async () => {
      const getSummarySpy = jest.spyOn(transactionRepo, 'getSummary');
      cache.get.mockResolvedValue(JSON.stringify(summary));

      const result = await service.getFinancialSummary(filters);

      expect(cache.get).toHaveBeenCalledWith(expectedSummaryKey);
      expect(getSummarySpy).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
      expect(result).toEqual({ data: summary, fromCache: true });
    });

    it('should use a DISTINCT key for the summary (transactions:{userId}:{hash}:summary) so list and summary never collide (I01)', async () => {
      cache.get.mockResolvedValue(null);
      transactionRepo.getAll.mockResolvedValue(transactions);
      transactionRepo.getSummary.mockResolvedValue(summary);

      await service.getAllTransactions(filters);
      await service.getFinancialSummary(filters);

      const setCalls = cache.set.mock.calls.map((call) => call[0]);
      expect(setCalls).toHaveLength(2);
      expect(setCalls[0]).toBe(expectedKey);
      expect(setCalls[1]).toBe(expectedSummaryKey);
      expect(setCalls[0]).not.toBe(setCalls[1]);
    });

    it('should treat a corrupted cached summary as MISS, delete the key and re-fetch from the repository (A01)', async () => {
      cache.get.mockResolvedValue('{invalid-json!!');
      transactionRepo.getSummary.mockResolvedValue(summary);

      const result = await service.getFinancialSummary(filters);

      expect(cache.get).toHaveBeenCalledWith(expectedSummaryKey);
      expect(cache.del).toHaveBeenCalledWith(expectedSummaryKey);
      expect(transactionRepo.getSummary).toHaveBeenCalledWith(filters);
      expect(cache.set).toHaveBeenCalledWith(expectedSummaryKey, JSON.stringify(summary), 300);
      expect(result).toEqual({ data: summary, fromCache: false });
    });
  });

  describe('invalidação nas mutations — delByPattern("transactions:{userId}:*")', () => {
    it('should invalidate all user cache keys on createTransaction', async () => {
      transactionRepo.create.mockResolvedValue(transactions[0]);

      await service.createTransaction({
        userId: 'u1',
        description: 'Café da manhã',
        value: 25,
        date: '2026-01-15',
        category: 'Alimentação',
        responsible: 'Ana',
        type: 'expense',
      });

      expect(cache.delByPattern).toHaveBeenCalledTimes(1);
      expect(cache.delByPattern).toHaveBeenCalledWith('transactions:u1:*');
    });

    it('should invalidate all user cache keys on updateTransaction', async () => {
      transactionRepo.update.mockResolvedValue(transactions[0]);

      await service.updateTransaction('t1', { value: 300, userId: 'u1' });

      expect(cache.delByPattern).toHaveBeenCalledTimes(1);
      expect(cache.delByPattern).toHaveBeenCalledWith('transactions:u1:*');
    });

    it('should invalidate all user cache keys on deleteTransaction', async () => {
      transactionRepo.delete.mockResolvedValue(true);

      await service.deleteTransaction('t1', 'u1');

      expect(cache.delByPattern).toHaveBeenCalledTimes(1);
      expect(cache.delByPattern).toHaveBeenCalledWith('transactions:u1:*');
    });

    it('should invalidate all user cache keys on updateFutureTransactions', async () => {
      transactionRepo.getById.mockResolvedValue({
        id: 't1',
        parent_transaction_id: null,
        date: '2026-01-01',
      } as unknown as Transaction);
      transactionRepo.updateFuture.mockResolvedValue(1);

      await service.updateFutureTransactions('t1', 'u1', { value: 500 });

      expect(cache.delByPattern).toHaveBeenCalledTimes(1);
      expect(cache.delByPattern).toHaveBeenCalledWith('transactions:u1:*');
    });

    it('should invalidate all user cache keys on deleteFutureTransactions', async () => {
      transactionRepo.getById.mockResolvedValue({
        id: 't1',
        parent_transaction_id: null,
        date: '2026-01-01',
      } as unknown as Transaction);
      transactionRepo.deleteFuture.mockResolvedValue(1);

      await service.deleteFutureTransactions('t1', 'u1');

      expect(cache.delByPattern).toHaveBeenCalledTimes(1);
      expect(cache.delByPattern).toHaveBeenCalledWith('transactions:u1:*');
    });

    it('should escape glob characters in the userId on delByPattern (A03)', async () => {
      transactionRepo.create.mockResolvedValue(transactions[0]);

      await service.createTransaction({
        userId: 'u1*',
        description: 'Café da manhã',
        value: 25,
        date: '2026-01-15',
        category: 'Alimentação',
        responsible: 'Ana',
        type: 'expense',
      });

      expect(cache.delByPattern).toHaveBeenCalledTimes(1);
      expect(cache.delByPattern).toHaveBeenCalledWith('transactions:u1\\*:*');
    });
  });
});