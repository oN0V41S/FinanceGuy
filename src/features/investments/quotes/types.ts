import { z } from 'zod';

export const MarketEnum = z.enum(['BR', 'US', 'CRYPTO', 'FX', 'OTHER']);
export type Market = z.infer<typeof MarketEnum>;

export const QuoteQuerySchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1, 'Ticker é obrigatório')
    .max(20, 'Ticker muito longo')
    .regex(/^[A-Za-z0-9.\-=^]+$/, 'Ticker inválido')
    .transform((s) => s.toUpperCase()),
  market: MarketEnum,
});
export type QuoteQuery = z.infer<typeof QuoteQuerySchema>;

export interface Quote {
  symbol: string;
  name?: string;
  price: number;
  currency: string;
  provider: string;
  fetchedAt: string;
  /** true quando a cotação veio do último valor conhecido (provedores indisponíveis). */
  stale?: boolean;
}

export interface IQuoteProvider {
  readonly name: string;
  getQuote(symbol: string, market: Market): Promise<Quote>;
}

export class QuoteUnavailableError extends Error {
  constructor(message = 'Cotação indisponível no momento. Tente novamente em instantes.') {
    super(message);
    this.name = 'QuoteUnavailableError';
  }
}
