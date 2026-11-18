/**
 * @jest-environment node
 */
import { createContextCache, withContextCache, InMemoryContextCache, UpstashContextCache } from '../contextCache';
import { wantsPortfolio } from '../../portfolioIntent';
import type { FinancialContextDto, FinancialContextSource } from '../../types';

const mockRedis = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
jest.mock('@upstash/redis', () => ({ Redis: jest.fn(() => mockRedis) }));

const dto = { today: '2026-10-14' } as unknown as FinancialContextDto;
const NOW = new Date('2026-10-14T15:00:00.000Z');

describe('InMemoryContextCache', () => {
  it('get/set/invalidate por usuário', async () => {
    const cache = new InMemoryContextCache(60, () => NOW.getTime());
    expect(await cache.get('u1')).toBeNull();
    await cache.set('u1', dto);
    expect(await cache.get('u1')).toEqual(dto);
    expect(await cache.get('u2')).toBeNull();
    await cache.invalidate('u1');
    expect(await cache.get('u1')).toBeNull();
  });

  it('expira após o TTL', async () => {
    let t = NOW.getTime();
    const cache = new InMemoryContextCache(60, () => t);
    await cache.set('u1', dto);
    t += 59_000;
    expect(await cache.get('u1')).toEqual(dto);
    t += 2_000;
    expect(await cache.get('u1')).toBeNull();
  });

  it('descarta as entradas mais antigas quando cheio', async () => {
    const cache = new InMemoryContextCache(60, () => NOW.getTime(), 2);
    await cache.set('a', dto);
    await cache.set('b', dto);
    await cache.set('c', dto);
    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('c')).toEqual(dto);
  });
});

describe('UpstashContextCache', () => {
  const makeClient = () => ({ get: jest.fn(), set: jest.fn(), del: jest.fn() });

  it('usa a chave ai:ctx:{userId} com TTL', async () => {
    const client = makeClient();
    client.get.mockResolvedValue(dto);
    const cache = new UpstashContextCache(client, 60);
    await cache.set('u1', dto);
    expect(client.set).toHaveBeenCalledWith('ai:ctx:u1', dto, { ex: 60 });
    expect(await cache.get('u1')).toEqual(dto);
    expect(client.get).toHaveBeenCalledWith('ai:ctx:u1');
    await cache.invalidate('u1');
    expect(client.del).toHaveBeenCalledWith('ai:ctx:u1');
  });

  it('aceita valor serializado como string', async () => {
    const client = makeClient();
    client.get.mockResolvedValue(JSON.stringify(dto));
    expect(await new UpstashContextCache(client, 60).get('u1')).toEqual(dto);
  });

  it('ausente ou lixo vira miss', async () => {
    const client = makeClient();
    const cache = new UpstashContextCache(client, 60);
    client.get.mockResolvedValue(null);
    expect(await cache.get('u1')).toBeNull();
    client.get.mockResolvedValue('{nao-json');
    expect(await cache.get('u1')).toBeNull();
    client.get.mockResolvedValue(42);
    expect(await cache.get('u1')).toBeNull();
  });
});

describe('createContextCache', () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  afterAll(() => spy.mockRestore());

  it('sem Upstash usa memória e respeita o TTL do config', async () => {
    const cache = createContextCache({ contextCacheTtlSeconds: 60 }, {});
    await cache.set('u1', dto);
    expect(await cache.get('u1')).toEqual(dto);
  });

  it('TTL inválido cai para 60', async () => {
    const cache = createContextCache({ contextCacheTtlSeconds: 0 }, {});
    await cache.set('u1', dto);
    expect(await cache.get('u1')).toEqual(dto);
  });

  it('com Upstash configurado nunca lança: falha de rede vira miss/no-op', async () => {
    const cache = createContextCache(
      { contextCacheTtlSeconds: 60 },
      { UPSTASH_REDIS_REST_URL: 'https://x.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'x' },
    );
    mockRedis.get.mockRejectedValue(new Error('net'));
    mockRedis.set.mockRejectedValue(new Error('net'));
    mockRedis.del.mockRejectedValue(new Error('net'));
    await expect(cache.set('u1', dto)).resolves.toBeUndefined();
    await expect(cache.get('u1')).resolves.toEqual(dto); // fallback em memória guardou
    await expect(cache.invalidate('u1')).resolves.toBeUndefined();
    await expect(cache.get('u1')).resolves.toBeNull();
  });

  it('com Upstash saudável lê e grava pelo Redis', async () => {
    const cache = createContextCache(
      { contextCacheTtlSeconds: 30 },
      { UPSTASH_REDIS_REST_URL: 'https://x.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'x' },
    );
    mockRedis.get.mockResolvedValue(dto);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    await cache.set('u1', dto);
    expect(mockRedis.set).toHaveBeenCalledWith('ai:ctx:u1', dto, { ex: 30 });
    expect(await cache.get('u1')).toEqual(dto);
    await cache.invalidate('u1');
    expect(mockRedis.del).toHaveBeenCalledWith('ai:ctx:u1');
  });
});

describe('withContextCache', () => {
  const makeSource = () => {
    const getContext = jest.fn().mockResolvedValue(dto);
    return { source: { getContext } as FinancialContextSource, getContext };
  };
  const makeCache = () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
  });

  it('pergunta sem período: miss consulta a fonte e grava; hit não consulta', async () => {
    const { source, getContext } = makeSource();
    const cache = makeCache();
    const wrapped = withContextCache(source, cache, () => NOW);
    expect(await wrapped.getContext('u1', 'quanto gastei?')).toEqual(dto);
    expect(getContext).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith('u1', dto);

    cache.get.mockResolvedValue(dto);
    expect(await wrapped.getContext('u1', 'e o saldo?')).toEqual(dto);
    expect(getContext).toHaveBeenCalledTimes(1);
  });

  it('pergunta com período: ignora o cache (DTO depende do recorte)', async () => {
    const { source, getContext } = makeSource();
    const cache = makeCache();
    cache.get.mockResolvedValue(dto);
    const wrapped = withContextCache(source, cache, () => NOW);
    await wrapped.getContext('u1', 'gastos de 16 a 31 de dezembro');
    await wrapped.getContext('u1', 'últimos 3 meses');
    expect(getContext).toHaveBeenCalledTimes(2);
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('pergunta sobre carteira: ignora o cache (DTO pode ter portfolioByCategory)', async () => {
    const { source, getContext } = makeSource();
    const cache = makeCache();
    cache.get.mockResolvedValue(dto);
    const wrapped = withContextCache(source, cache, () => NOW);
    await wrapped.getContext('u1', 'como está minha carteira?');
    expect(getContext).toHaveBeenCalledTimes(1);
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('DTO com portfolioByCategory nunca vaza para pergunta sem o tema (nem o contrário)', async () => {
    const dtoSemSecao = { today: '2026-10-14' } as unknown as FinancialContextDto;
    const dtoComSecao = {
      today: '2026-10-14',
      portfolioByCategory: [{ name: 'Cripto', total: 10, pct: 100, count: 1 }],
    } as unknown as FinancialContextDto;
    const getContext = jest
      .fn()
      .mockImplementation((_userId: string, question: string) =>
        Promise.resolve(wantsPortfolio(question) ? dtoComSecao : dtoSemSecao),
      );
    const cache = new InMemoryContextCache(60, () => NOW.getTime());
    const wrapped = withContextCache({ getContext } as FinancialContextSource, cache, () => NOW);

    // 1) pergunta sem o tema: miss → fonte → gravado sem a seção.
    const semTema1 = await wrapped.getContext('u1', 'quanto gastei?');
    expect('portfolioByCategory' in semTema1).toBe(false);

    // 2) pergunta de carteira: bypass → fonte devolve a seção; nada é gravado por cima.
    const comTema = await wrapped.getContext('u1', 'como está minha carteira?');
    expect((comTema as { portfolioByCategory?: unknown }).portfolioByCategory).toBeDefined();

    // 3) repetir pergunta sem o tema: cache hit do DTO sem seção (não vazou a de carteira).
    const semTema2 = await wrapped.getContext('u1', 'e o saldo?');
    expect(semTema2).toBe(dtoSemSecao);
    expect('portfolioByCategory' in semTema2).toBe(false);
    expect(getContext).toHaveBeenCalledTimes(2);
  });

  it('erro do cache degrada para miss', async () => {
    const { source, getContext } = makeSource();
    const cache = makeCache();
    cache.get.mockRejectedValue(new Error('boom'));
    cache.set.mockRejectedValue(new Error('boom'));
    const wrapped = withContextCache(source, cache, () => NOW);
    expect(await wrapped.getContext('u1', 'oi')).toEqual(dto);
    expect(getContext).toHaveBeenCalledTimes(1);
  });

  it('erro da fonte propaga', async () => {
    const { source, getContext } = makeSource();
    getContext.mockRejectedValue(new Error('db'));
    const wrapped = withContextCache(source, makeCache(), () => NOW);
    await expect(wrapped.getContext('u1', 'oi')).rejects.toThrow('db');
  });
});
