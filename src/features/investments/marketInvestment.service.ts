import { IInvestmentRepository } from './IInvestment.repository';
import { IInvestmentHistoryRepository } from './IInvestmentHistory.repository';
import { computePosition, simulateRedeem, round2 } from './calculations';
import type { PositionResult, RedeemResult } from './calculations';
import type { InvestmentHistoryEntry } from './history.types';
import type { Quote } from './quotes/types';
import { QuoteService } from './quotes/quote.service';
import { RedeemSchema } from './validations';
import type { Investment } from './validations';

export interface PortfolioItem extends Investment {
  quote?: Pick<Quote, 'price' | 'currency' | 'provider' | 'fetchedAt' | 'stale'>;
  metrics?: PositionResult;
  /** true quando era ativo de mercado ativo mas não foi possível obter cotação. */
  quoteUnavailable?: boolean;
}

export interface RedeemPreview extends RedeemResult {
  unitPrice: number;
  /** Impostos são uma estimativa com a alíquota informada; não substituem o cálculo oficial. */
  isEstimate: true;
}

export interface InvestmentHistoryReport {
  entries: InvestmentHistoryEntry[];
  /** Resumo textual por operação, pronto para consulta e para uso em RAG. */
  summaries: string[];
}

const brl = (value: number, currency = 'BRL'): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);

const NOT_FOUND = 'Investimento não encontrado.';

export const describeHistoryEntry = (e: InvestmentHistoryEntry): string => {
  const asset = e.assetTicker ? `${e.assetName} (${e.assetTicker})` : e.assetName;
  const date = e.date.toISOString().slice(0, 10);
  const cur = e.currency ?? 'BRL';

  if (e.kind === 'BUY') {
    return `${date}: compra de ${e.quantity} un. de ${asset} a ${brl(e.unitPrice, cur)} (total ${brl(e.grossValue, cur)}).`;
  }

  return (
    `${date}: resgate de ${e.quantity} un. de ${asset} a ${brl(e.unitPrice, cur)} — ` +
    `bruto ${brl(e.grossValue, cur)}, custo ${brl(e.costBasis ?? 0, cur)}, ` +
    `lucro ${brl(e.profit ?? 0, cur)}, imposto estimado ${brl(e.taxValue ?? 0, cur)} (${e.taxRate ?? 0}%), ` +
    `líquido ${brl(e.netValue ?? 0, cur)}.`
  );
};

export class MarketInvestmentService {
  constructor(
    private readonly investments: IInvestmentRepository,
    private readonly history: IInvestmentHistoryRepository,
    private readonly quotes: QuoteService
  ) {}

  async getPortfolio(userId: string): Promise<PortfolioItem[]> {
    const all = await this.investments.getAll(userId);

    return Promise.all(
      all.map(async (investment): Promise<PortfolioItem> => {
        const isActiveAsset =
          investment.ticker && investment.market && investment.shares && investment.unitPrice && investment.status !== 'REDEEMED';
        if (!isActiveAsset) return investment;

        try {
          const quote = await this.quotes.getQuote({ symbol: investment.ticker, market: investment.market });
          return {
            ...investment,
            quote: {
              price: quote.price,
              currency: quote.currency,
              provider: quote.provider,
              fetchedAt: quote.fetchedAt,
              stale: quote.stale,
            },
            metrics: computePosition({ quantity: investment.shares!, unitPrice: investment.unitPrice! }, quote.price),
          };
        } catch {
          return { ...investment, quoteUnavailable: true };
        }
      })
    );
  }

  async previewRedeem(id: string, input: unknown, userId: string): Promise<RedeemPreview> {
    const { investment, request, unitPrice } = await this.prepareRedeem(id, input, userId);
    return this.simulate(investment, request.quantity, unitPrice, request.taxRate);
  }

  async redeem(id: string, input: unknown, userId: string): Promise<InvestmentHistoryEntry> {
    const { investment, request, unitPrice } = await this.prepareRedeem(id, input, userId);
    const result = this.simulate(investment, request.quantity, unitPrice, request.taxRate);

    const remaining = result.remainingQuantity;
    const entry = {
      userId,
      investmentId: investment.id,
      kind: 'REDEEM' as const,
      date: request.date ?? new Date(),
      quantity: result.quantity,
      unitPrice,
      grossValue: result.grossValue,
      costBasis: result.cost,
      profit: result.profit,
      taxRate: result.taxRate,
      taxValue: result.taxValue,
      netValue: result.netValue,
      note: request.note,
      assetName: investment.name,
      assetTicker: investment.ticker,
      assetMarket: investment.market,
      currency: investment.currency,
    };

    // Resgate NÃO cria Transaction: o histórico de investimentos é a única fonte de verdade.
    return this.history.applyRedeem(
      investment.id,
      userId,
      {
        shares: remaining,
        value: round2(remaining * (investment.unitPrice ?? 0)),
        status: result.isTotal ? 'REDEEMED' : 'ACTIVE',
      },
      entry
    );
  }

  async getInvestmentHistoryForUser(userId: string, investmentId?: string): Promise<InvestmentHistoryReport> {
    const entries = await this.history.listByUser(userId, investmentId);
    return { entries, summaries: entries.map(describeHistoryEntry) };
  }

  private async prepareRedeem(id: string, input: unknown, userId: string) {
    const request = RedeemSchema.parse(input);
    const investment = await this.investments.getById(id, userId);

    if (!investment) throw new Error(NOT_FOUND);
    if (!investment.ticker || !investment.shares || !investment.unitPrice) {
      throw new Error('Este investimento não é um ativo de mercado e não pode ser resgatado por cotação.');
    }
    if (investment.status === 'REDEEMED') throw new Error('Este investimento já foi totalmente resgatado.');

    const unitPrice =
      request.unitPrice ?? (await this.quotes.getQuote({ symbol: investment.ticker, market: investment.market })).price;

    return { investment, request, unitPrice };
  }

  private simulate(investment: Investment, quantity: number, unitPrice: number, taxRate: number): RedeemPreview {
    const result = simulateRedeem({
      position: { quantity: investment.shares!, unitPrice: investment.unitPrice! },
      redeemQuantity: quantity,
      redeemUnitPrice: unitPrice,
      taxRate,
    });
    return { ...result, unitPrice, isEstimate: true };
  }
}
