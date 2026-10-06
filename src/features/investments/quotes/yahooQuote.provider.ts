import { IQuoteProvider, Market, Quote, QuoteUnavailableError } from './types';

const YAHOO_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
const TIMEOUT_MS = 5000;

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        longName?: string;
        shortName?: string;
        currency?: string;
        regularMarketPrice?: number;
      };
    }> | null;
  };
}

/** Cotações EUA e demais mercados via endpoint público do Yahoo Finance (sem API oficial; mantido isolado). */
export class YahooQuoteProvider implements IQuoteProvider {
  readonly name = 'yahoo';

  async getQuote(symbol: string, market: Market): Promise<Quote> {
    // B3 no Yahoo usa o sufixo ".SA" (ex.: PETR4.SA).
    const yahooSymbol = market === 'BR' && !symbol.endsWith('.SA') ? `${symbol}.SA` : symbol;
    const url = `${YAHOO_URL}/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 FinanceGuy' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) throw new QuoteUnavailableError();

    const body = (await response.json()) as YahooChartResponse;
    const meta = body.chart?.result?.[0]?.meta;

    if (!meta || typeof meta.regularMarketPrice !== 'number') throw new QuoteUnavailableError();

    return {
      symbol,
      name: meta.longName ?? meta.shortName,
      price: meta.regularMarketPrice,
      currency: meta.currency ?? 'USD',
      provider: this.name,
      fetchedAt: new Date().toISOString(),
    };
  }
}
