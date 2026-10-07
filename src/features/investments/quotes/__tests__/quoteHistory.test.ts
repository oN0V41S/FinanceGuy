import { QuoteHistoryService } from '../quoteHistory.service';
import { YahooQuoteProvider } from '../yahooQuote.provider';
import { IQuoteHistoryProvider, QuoteHistory, QuoteUnavailableError } from '../types';
import { ICacheRepository } from '@/shared/interfaces/ICacheRepository';

const history: QuoteHistory = {
  symbol: 'PETR4',
  currency: 'BRL',
  range: '3mo',
  points: [
    { date: '2026-09-01', close: 38.1 },
    { date: '2026-09-02', close: 38.9 },
  ],
  fetchedAt: '2026-10-06T12:00:00.000Z',
};

const makeCache = (): jest.Mocked<ICacheRepository> => {
  const store = new Map<string, string>();
  return {
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    set: jest.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    del: jest.fn(),
    delByPattern: jest.fn(),
  };
};

describe('YahooQuoteProvider.getHistory', () => {
  afterEach(() => jest.restoreAllMocks());

  it('converte timestamps/fechamentos, ignora nulos e usa sufixo .SA no BR', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        chart: {
          result: [
            {
              meta: { currency: 'BRL' },
              timestamp: [1788264000, 1788350400, 1788436800],
              indicators: { quote: [{ close: [38.1, null, 38.9] }] },
            },
          ],
        },
      }),
    } as Response);

    const result = await new YahooQuoteProvider().getHistory('PETR4', 'BR', '3mo');

    expect(String(fetchMock.mock.calls[0][0])).toContain('PETR4.SA?interval=1d&range=3mo');
    expect(result.currency).toBe('BRL');
    expect(result.points.map((p) => p.close)).toEqual([38.1, 38.9]);
    expect(result.points[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('lança QuoteUnavailableError quando não há série', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ chart: { result: null } }) } as Response);
    await expect(new YahooQuoteProvider().getHistory('XXXX', 'US', '1mo')).rejects.toBeInstanceOf(QuoteUnavailableError);
  });
});

describe('QuoteHistoryService', () => {
  it('valida entrada, busca no provedor e usa cache na segunda chamada', async () => {
    const provider: jest.Mocked<IQuoteHistoryProvider> = { getHistory: jest.fn().mockResolvedValue(history) };
    const service = new QuoteHistoryService(provider, makeCache());

    await service.getHistory({ symbol: 'petr4', market: 'BR', range: '3mo' });
    await service.getHistory({ symbol: 'PETR4', market: 'BR', range: '3mo' });

    expect(provider.getHistory).toHaveBeenCalledTimes(1);
    expect(provider.getHistory).toHaveBeenCalledWith('PETR4', 'BR', '3mo');
  });

  it('rejeita período inválido', async () => {
    const service = new QuoteHistoryService({ getHistory: jest.fn() }, makeCache());
    await expect(service.getHistory({ symbol: 'PETR4', market: 'BR', range: '10y' })).rejects.toThrow();
  });

  it('devolve o último histórico conhecido (stale) quando o provedor cai', async () => {
    const provider: jest.Mocked<IQuoteHistoryProvider> = { getHistory: jest.fn().mockRejectedValue(new QuoteUnavailableError()) };
    const cache = makeCache();
    cache.get.mockImplementation(async (k: string) => (k.startsWith('history:last:') ? JSON.stringify(history) : null));
    const service = new QuoteHistoryService(provider, cache);

    const result = await service.getHistory({ symbol: 'PETR4', market: 'BR', range: '3mo' });
    expect(result.stale).toBe(true);
  });

  it('propaga QuoteUnavailableError sem cache', async () => {
    const provider: jest.Mocked<IQuoteHistoryProvider> = { getHistory: jest.fn().mockRejectedValue(new Error('boom')) };
    const service = new QuoteHistoryService(provider, makeCache());
    await expect(service.getHistory({ symbol: 'PETR4', market: 'BR', range: '3mo' })).rejects.toBeInstanceOf(
      QuoteUnavailableError
    );
  });
});
