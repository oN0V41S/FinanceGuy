import { IQuoteProvider, Market, Quote, QuoteUnavailableError } from './types';

const BRAPI_URL = 'https://brapi.dev/api/quote';
const TIMEOUT_MS = 5000;

interface BrapiResponse {
  results?: Array<{
    symbol?: string;
    shortName?: string;
    longName?: string;
    currency?: string;
    regularMarketPrice?: number;
  }>;
}

/** Cotações B3 (ações, FIIs, ETFs, BDRs). Token opcional em BRAPI_TOKEN. */
export class BrapiQuoteProvider implements IQuoteProvider {
  readonly name = 'brapi';

  async getQuote(symbol: string, _market: Market): Promise<Quote> {
    const token = process.env.BRAPI_TOKEN;
    const url = `${BRAPI_URL}/${encodeURIComponent(symbol)}`;

    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) throw new QuoteUnavailableError();

    const body = (await response.json()) as BrapiResponse;
    const result = body.results?.[0];

    if (!result || typeof result.regularMarketPrice !== 'number') throw new QuoteUnavailableError();

    return {
      symbol: result.symbol ?? symbol,
      name: result.longName ?? result.shortName,
      price: result.regularMarketPrice,
      currency: result.currency ?? 'BRL',
      provider: this.name,
      fetchedAt: new Date().toISOString(),
    };
  }
}
