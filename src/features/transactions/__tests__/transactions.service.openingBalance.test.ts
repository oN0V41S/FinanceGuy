/**
 * TDD — TransactionService.getOpeningBalance (issue #30)
 *
 * Contrato:
 * 1. Cache MISS: chama repository.getOpeningBalance, grava no cache e retorna { data, fromCache: false }.
 * 2. Cache HIT: retorna do cache sem chamar o repository ({ fromCache: true }).
 * 3. Cache corrompido ou de tipo errado: trata como MISS e apaga a chave.
 * 4. Chave sob o prefixo `transactions:{userId}:` (coberta pela invalidação das mutations),
 *    distinta por filtros/`before`, e isolada por usuário.
 * 5. TTL: CACHE_TTL env ou 300.
 * 6. Sem userId → lança erro (nunca consulta sem escopo de usuário).
 */
import { TransactionService } from '../transactions.service';
import { ITransactionRepository } from '../ITransaction.repository';
import { IUserRepository } from '@/features/auth/IUser.repository';

const createRepo = () =>
  ({
    getOpeningBalance: jest.fn(),
  } as unknown as jest.Mocked<ITransactionRepository>);

const createCache = () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delByPattern: jest.fn(),
});

describe('TransactionService — getOpeningBalance', () => {
  let service: TransactionService;
  let repo: jest.Mocked<ITransactionRepository>;
  let cache: ReturnType<typeof createCache>;

  const filters = { userId: 'u1', before: '2025-10-01' };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CACHE_TTL;
    repo = createRepo();
    cache = createCache();
    service = new TransactionService(repo, {} as IUserRepository, cache);
  });

  afterEach(() => {
    delete process.env.CACHE_TTL;
  });

  it('MISS: consulta o repository, grava no cache e retorna fromCache=false', async () => {
    cache.get.mockResolvedValue(null);
    repo.getOpeningBalance.mockResolvedValue(1234.5);

    const result = await service.getOpeningBalance(filters);

    expect(repo.getOpeningBalance).toHaveBeenCalledWith(filters);
    expect(cache.set).toHaveBeenCalledTimes(1);
    const [key, value, ttl] = cache.set.mock.calls[0];
    expect(key).toMatch(/^transactions:u1:opening:[a-f0-9]{32}$/);
    expect(value).toBe(JSON.stringify(1234.5));
    expect(ttl).toBe(300);
    expect(result).toEqual({ data: 1234.5, fromCache: false });
  });

  it('HIT: retorna do cache sem chamar o repository', async () => {
    cache.get.mockResolvedValue(JSON.stringify(-80));

    const result = await service.getOpeningBalance(filters);

    expect(repo.getOpeningBalance).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
    expect(result).toEqual({ data: -80, fromCache: true });
  });

  it('HIT com saldo 0 também é aproveitado (0 não é tratado como ausente)', async () => {
    cache.get.mockResolvedValue(JSON.stringify(0));

    const result = await service.getOpeningBalance(filters);

    expect(repo.getOpeningBalance).not.toHaveBeenCalled();
    expect(result).toEqual({ data: 0, fromCache: true });
  });

  it('cache corrompido: trata como MISS e apaga a chave', async () => {
    cache.get.mockResolvedValue('{invalid-json!!');
    repo.getOpeningBalance.mockResolvedValue(10);

    const result = await service.getOpeningBalance(filters);

    expect(cache.del).toHaveBeenCalledTimes(1);
    expect(repo.getOpeningBalance).toHaveBeenCalled();
    expect(result).toEqual({ data: 10, fromCache: false });
  });

  it('cache com tipo inesperado (objeto): trata como MISS', async () => {
    cache.get.mockResolvedValue(JSON.stringify({ a: 1 }));
    repo.getOpeningBalance.mockResolvedValue(10);

    const result = await service.getOpeningBalance(filters);

    expect(repo.getOpeningBalance).toHaveBeenCalled();
    expect(result.fromCache).toBe(false);
  });

  it('respeita CACHE_TTL', async () => {
    process.env.CACHE_TTL = '600';
    cache.get.mockResolvedValue(null);
    repo.getOpeningBalance.mockResolvedValue(1);

    await service.getOpeningBalance(filters);

    expect(cache.set.mock.calls[0][2]).toBe(600);
  });

  it('chaves diferem por filtros e por `before`, e por usuário', async () => {
    cache.get.mockResolvedValue(null);
    repo.getOpeningBalance.mockResolvedValue(1);

    await service.getOpeningBalance(filters);
    await service.getOpeningBalance({ ...filters, category: 'Casa' });
    await service.getOpeningBalance({ ...filters, before: '2025-10-16' });
    await service.getOpeningBalance({ ...filters, userId: 'u2' });

    const keys = cache.set.mock.calls.map((c) => c[0] as string);
    expect(new Set(keys).size).toBe(4);
    expect(keys[3]).toMatch(/^transactions:u2:opening:/);
  });

  it('userId com glob é escapado no prefixo da chave (A03)', async () => {
    cache.get.mockResolvedValue(null);
    repo.getOpeningBalance.mockResolvedValue(1);

    await service.getOpeningBalance({ ...filters, userId: 'u*' });

    expect(cache.set.mock.calls[0][0]).toMatch(/^transactions:u\\\*:opening:/);
  });

  it('sem userId lança erro e não consulta repository nem cache', async () => {
    await expect(service.getOpeningBalance({ userId: '', before: '2025-10-01' })).rejects.toThrow();

    expect(repo.getOpeningBalance).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();
  });
});
