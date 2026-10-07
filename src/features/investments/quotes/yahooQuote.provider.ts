import {
  HistoryRange,
  IQuoteHistoryProvider,
  IQuoteProvider,
  Market,
  Quote,
  QuoteHistory,
  QuoteUnavailableError,
} from './types';

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
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }> | null;
  };
}

// B3 no Yahoo usa o sufixo ".SA" (ex.: PETR4.SA).
const toYahooSymbol = (symbol: string, market: Market) =>
  market === 'BR' && !symbol.endsWith('.SA') ? `${symbol}.SA` : symbol;

/** Cotações EUA e demais mercados via endpoint público do Yahoo Finance (sem API oficial; mantido isolado). */
export class YahooQuoteProvider implements IQuoteProvider, IQuoteHistoryProvider {
  readonly name = 'yahoo';

  private async fetchChart(symbol: string, market: Market, range: string): Promise<YahooChartResponse> {
    const url = `${YAHOO_URL}/${encodeURIComponent(toYahooSymbol(symbol, market))}?interval=1d&range=${range}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 FinanceGuy' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) throw new QuoteUnavailableError();
    return (await response.json()) as YahooChartResponse;
  }

  async getQuote(symbol: string, market: Market): Promise<Quote> {
    const body = await this.fetchChart(symbol, market, '1d');
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

  async getHistory(symbol: string, market: Market, range: HistoryRange): Promise<QuoteHistory> {
    const body = await this.fetchChart(symbol, market, range);
    const result = body.chart?.result?.[0];
    const timestamps = result?.timestamp;
    const closes = result?.indicators?.quote?.[0]?.close;
    if (!result || !timestamps || !closes) throw new QuoteUnavailableError();

    const points = timestamps.flatMap((ts, i) => {
      const close = closes[i];
      return typeof close === 'number' ? [{ date: new Date(ts * 1000).toISOString().slice(0, 10), close }] : [];
    });
    if (points.length === 0) throw new QuoteUnavailableError();

    return {
      symbol,
      currency: result.meta?.currency ?? 'USD',
      range,
      points,
      fetchedAt: new Date().toISOString(),
    };
  }
}
