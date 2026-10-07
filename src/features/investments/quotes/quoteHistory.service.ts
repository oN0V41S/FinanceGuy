import { ICacheRepository } from '@/shared/interfaces/ICacheRepository';
import { IQuoteHistoryProvider, QuoteHistory, QuoteHistoryQuerySchema, QuoteUnavailableError } from './types';

const FRESH_TTL_SECONDS = 60 * 60;
const LAST_KNOWN_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Série histórica de fechamentos por ticker, com cache fresco (1h) e último valor conhecido (7d). */
export class QuoteHistoryService {
  constructor(
    private readonly provider: IQuoteHistoryProvider,
    private readonly cache: ICacheRepository
  ) {}

  async getHistory(input: unknown): Promise<QuoteHistory> {
    const { symbol, market, range } = QuoteHistoryQuerySchema.parse(input);
    const freshKey = `history:${market}:${symbol}:${range}`;
    const lastKnownKey = `history:last:${market}:${symbol}:${range}`;

    const cached = await this.read(freshKey);
    if (cached) return cached;

    try {
      const history = await this.provider.getHistory(symbol, market, range);
      await this.write(freshKey, history, FRESH_TTL_SECONDS);
      await this.write(lastKnownKey, history, LAST_KNOWN_TTL_SECONDS);
      return history;
    } catch {
      const lastKnown = await this.read(lastKnownKey);
      if (lastKnown) return { ...lastKnown, stale: true };
      throw new QuoteUnavailableError('Histórico indisponível para este ticker no momento.');
    }
  }

  private async read(key: string): Promise<QuoteHistory | null> {
    try {
      const raw = await this.cache.get(key);
      return raw ? (JSON.parse(raw) as QuoteHistory) : null;
    } catch {
      return null;
    }
  }

  private async write(key: string, value: QuoteHistory, ttlSeconds: number): Promise<void> {
    try {
      await this.cache.set(key, JSON.stringify(value), ttlSeconds);
    } catch {
      // cache é otimização; falha não deve quebrar o fluxo
    }
  }
}
