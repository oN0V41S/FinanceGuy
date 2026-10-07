import { QuoteService } from '../quote.service';
import { IQuoteProvider, Quote, QuoteUnavailableError } from '../types';
import { ICacheRepository } from '@/shared/interfaces/ICacheRepository';

const makeQuote = (provider: string, price = 40): Quote => ({
  symbol: 'PETR4',
  price,
  currency: 'BRL',
  provider,
  fetchedAt: '2026-10-06T12:00:00.000Z',
});

const makeCache = (): jest.Mocked<ICacheRepository> & { store: Map<string, string> } => {
  const store = new Map<string, string>();
  return {
    store,
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    set: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    del: jest.fn(),
    delByPattern: jest.fn(),
  };
};

describe('QuoteService', () => {
  let brapi: jest.Mocked<IQuoteProvider>;
  let yahoo: jest.Mocked<IQuoteProvider>;
  let cache: ReturnType<typeof makeCache>;
  let service: QuoteService;

  beforeEach(() => {
    brapi = { name: 'brapi', getQuote: jest.fn() };
    yahoo = { name: 'yahoo', getQuote: jest.fn() };
    cache = makeCache();
    service = new QuoteService({ brapi, yahoo }, cache);
  });

  it('uses brapi first for BR market and caches the result', async () => {
    brapi.getQuote.mockResolvedValue(makeQuote('brapi'));

    const quote = await service.getQuote({ symbol: 'petr4', market: 'BR' });

    expect(quote.provider).toBe('brapi');
    expect(brapi.getQuote).toHaveBeenCalledWith('PETR4', 'BR');
    expect(yahoo.getQuote).not.toHaveBeenCalled();
    expect(cache.set).toHaveBeenCalledTimes(2);
  });

  it('returns cached quote without calling providers', async () => {
    brapi.getQuote.mockResolvedValue(makeQuote('brapi'));
    await service.getQuote({ symbol: 'PETR4', market: 'BR' });
    brapi.getQuote.mockClear();

    const quote = await service.getQuote({ symbol: 'PETR4', market: 'BR' });

    expect(quote.price).toBe(40);
    expect(brapi.getQuote).not.toHaveBeenCalled();
  });

  it('falls back to yahoo when brapi fails', async () => {
    brapi.getQuote.mockRejectedValue(new QuoteUnavailableError());
    yahoo.getQuote.mockResolvedValue(makeQuote('yahoo', 41));

    const quote = await service.getQuote({ symbol: 'PETR4', market: 'BR' });

    expect(quote.provider).toBe('yahoo');
    expect(quote.price).toBe(41);
  });

  it('uses only yahoo for US market', async () => {
    yahoo.getQuote.mockResolvedValue({ ...makeQuote('yahoo', 190), symbol: 'AAPL', currency: 'USD' });

    const quote = await service.getQuote({ symbol: 'AAPL', market: 'US' });

    expect(quote.currency).toBe('USD');
    expect(brapi.getQuote).not.toHaveBeenCalled();
  });

  it('returns last known quote flagged as stale when all providers fail', async () => {
    cache.store.set('quote:last:BR:PETR4', JSON.stringify(makeQuote('brapi', 38)));
    brapi.getQuote.mockRejectedValue(new Error('boom'));
    yahoo.getQuote.mockRejectedValue(new Error('boom'));

    const quote = await service.getQuote({ symbol: 'PETR4', market: 'BR' });

    expect(quote.stale).toBe(true);
    expect(quote.price).toBe(38);
  });

  it('throws QuoteUnavailableError when nothing is available', async () => {
    brapi.getQuote.mockRejectedValue(new Error('boom'));
    yahoo.getQuote.mockRejectedValue(new Error('boom'));

    await expect(service.getQuote({ symbol: 'PETR4', market: 'BR' })).rejects.toBeInstanceOf(QuoteUnavailableError);
  });

  it('keeps working when cache fails', async () => {
    cache.get.mockRejectedValue(new Error('redis down'));
    cache.set.mockRejectedValue(new Error('redis down'));
    brapi.getQuote.mockResolvedValue(makeQuote('brapi'));

    await expect(service.getQuote({ symbol: 'PETR4', market: 'BR' })).resolves.toMatchObject({ price: 40 });
  });

  it('rejects invalid symbol input', async () => {
    await expect(service.getQuote({ symbol: '', market: 'BR' })).rejects.toThrow();
    await expect(service.getQuote({ symbol: 'PE TR4!', market: 'BR' })).rejects.toThrow();
    await expect(service.getQuote({ symbol: 'PETR4', market: 'XX' })).rejects.toThrow();
  });
});
