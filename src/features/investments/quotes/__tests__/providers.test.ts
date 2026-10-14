import { BrapiQuoteProvider } from '../brapiQuote.provider';
import { YahooQuoteProvider } from '../yahooQuote.provider';
import { QuoteUnavailableError } from '../types';

const mockFetch = (body: unknown, ok = true) => {
  global.fetch = jest.fn().mockResolvedValue({ ok, json: async () => body }) as unknown as typeof fetch;
};

describe('BrapiQuoteProvider', () => {
  const provider = new BrapiQuoteProvider();

  it('maps brapi response to Quote', async () => {
    mockFetch({ results: [{ symbol: 'PETR4', shortName: 'PETROBRAS PN', currency: 'BRL', regularMarketPrice: 38.5 }] });

    const quote = await provider.getQuote('PETR4', 'BR');

    expect(quote).toMatchObject({ symbol: 'PETR4', price: 38.5, currency: 'BRL', provider: 'brapi' });
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('https://brapi.dev/api/quote/PETR4');
  });

  it('throws on http error', async () => {
    mockFetch({}, false);
    await expect(provider.getQuote('PETR4', 'BR')).rejects.toBeInstanceOf(QuoteUnavailableError);
  });

  it('throws when price is missing', async () => {
    mockFetch({ results: [{ symbol: 'PETR4' }] });
    await expect(provider.getQuote('PETR4', 'BR')).rejects.toBeInstanceOf(QuoteUnavailableError);
  });
});

describe('YahooQuoteProvider', () => {
  const provider = new YahooQuoteProvider();

  it('maps yahoo chart response to Quote', async () => {
    mockFetch({ chart: { result: [{ meta: { symbol: 'AAPL', longName: 'Apple Inc.', currency: 'USD', regularMarketPrice: 190.1 } }] } });

    const quote = await provider.getQuote('AAPL', 'US');

    expect(quote).toMatchObject({ symbol: 'AAPL', name: 'Apple Inc.', price: 190.1, currency: 'USD', provider: 'yahoo' });
  });

  it('appends .SA suffix for BR tickers', async () => {
    mockFetch({ chart: { result: [{ meta: { currency: 'BRL', regularMarketPrice: 38 } }] } });

    await provider.getQuote('PETR4', 'BR');

    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('/PETR4.SA?');
  });

  it('throws when result is null', async () => {
    mockFetch({ chart: { result: null } });
    await expect(provider.getQuote('XXXX', 'US')).rejects.toBeInstanceOf(QuoteUnavailableError);
  });
});
