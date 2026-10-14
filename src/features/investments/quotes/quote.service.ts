import { ICacheRepository } from '@/shared/interfaces/ICacheRepository';
import { IQuoteProvider, Market, Quote, QuoteQuerySchema, QuoteUnavailableError } from './types';

const FRESH_TTL_SECONDS = 15 * 60;
const LAST_KNOWN_TTL_SECONDS = 7 * 24 * 60 * 60;

export class QuoteService {
  /**
   * @param providers mapa de provedores por nome; a ordem de tentativa por mercado vem de `order`.
   */
  constructor(
    private readonly providers: Record<string, IQuoteProvider>,
    private readonly cache: ICacheRepository,
    private readonly order: Record<Market, string[]> = {
      BR: ['brapi', 'yahoo'],
      US: ['yahoo'],
      CRYPTO: ['yahoo'],
      FX: ['yahoo'],
      OTHER: ['yahoo'],
    }
  ) {}

  async getQuote(input: unknown): Promise<Quote> {
    const { symbol, market } = QuoteQuerySchema.parse(input);
    const freshKey = `quote:${market}:${symbol}`;
    const lastKnownKey = `quote:last:${market}:${symbol}`;

    const cached = await this.readCache(freshKey);
    if (cached) return cached;

    for (const providerName of this.order[market]) {
      const provider = this.providers[providerName];
      if (!provider) continue;

      try {
        const quote = await provider.getQuote(symbol, market);
        await this.writeCache(freshKey, quote, FRESH_TTL_SECONDS);
        await this.writeCache(lastKnownKey, quote, LAST_KNOWN_TTL_SECONDS);
        return quote;
      } catch {
        // tenta o próximo provedor; detalhes de erro externos não são logados com dados sensíveis
      }
    }

    const lastKnown = await this.readCache(lastKnownKey);
    if (lastKnown) return { ...lastKnown, stale: true };

    throw new QuoteUnavailableError();
  }

  private async readCache(key: string): Promise<Quote | null> {
    try {
      const raw = await this.cache.get(key);
      return raw ? (JSON.parse(raw) as Quote) : null;
    } catch {
      return null;
    }
  }

  private async writeCache(key: string, quote: Quote, ttlSeconds: number): Promise<void> {
    try {
      await this.cache.set(key, JSON.stringify(quote), ttlSeconds);
    } catch {
      // cache é otimização; falha não deve quebrar o fluxo
    }
  }
}
