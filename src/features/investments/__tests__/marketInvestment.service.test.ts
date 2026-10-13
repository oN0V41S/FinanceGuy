import { MarketInvestmentService } from '../marketInvestment.service';
import { InvestmentService } from '../investment.service';
import type { IInvestmentRepository } from '../IInvestment.repository';
import type { IInvestmentHistoryRepository } from '../IInvestmentHistory.repository';
import type { InvestmentHistoryEntry } from '../history.types';
import { QuoteService } from '../quotes/quote.service';
import { QuoteUnavailableError } from '../quotes/types';
import type { Investment } from '../validations';

const USER = 'user-1';

const asset: Investment = {
  id: 'inv-1',
  name: 'Petrobras',
  type: 'Renda Variável',
  value: 350,
  ticker: 'PETR4',
  market: 'BR',
  currency: 'BRL',
  unitPrice: 35,
  shares: 10,
  status: 'ACTIVE',
};

const makeRepos = () => {
  const investments: jest.Mocked<IInvestmentRepository> = {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const history: jest.Mocked<IInvestmentHistoryRepository> = {
    record: jest.fn(),
    applyRedeem: jest.fn(async (_id, _u, _upd, entry) => ({ id: 'h1', ...entry }) as InvestmentHistoryEntry),
    listByUser: jest.fn(),
  };
  const quotes = { getQuote: jest.fn() } as unknown as jest.Mocked<QuoteService>;
  return { investments, history, quotes };
};

describe('MarketInvestmentService', () => {
  let repos: ReturnType<typeof makeRepos>;
  let service: MarketInvestmentService;

  beforeEach(() => {
    repos = makeRepos();
    service = new MarketInvestmentService(repos.investments, repos.history, repos.quotes);
    repos.investments.getById.mockResolvedValue(asset);
    repos.quotes.getQuote.mockResolvedValue({
      symbol: 'PETR4',
      price: 40,
      currency: 'BRL',
      provider: 'brapi',
      fetchedAt: '2026-10-06T12:00:00.000Z',
    });
  });

  describe('getPortfolio', () => {
    it('attaches quote and metrics to market assets', async () => {
      repos.investments.getAll.mockResolvedValue([asset]);

      const [item] = await service.getPortfolio(USER);

      expect(item.quote?.price).toBe(40);
      expect(item.metrics).toEqual({ cost: 350, currentValue: 400, profit: 50, profitPct: 14.29 });
    });

    it('flags quoteUnavailable instead of failing when quote fails', async () => {
      repos.investments.getAll.mockResolvedValue([asset]);
      repos.quotes.getQuote.mockRejectedValue(new QuoteUnavailableError());

      const [item] = await service.getPortfolio(USER);

      expect(item.quoteUnavailable).toBe(true);
      expect(item.metrics).toBeUndefined();
    });

    it('does not query quotes for legacy manual investments', async () => {
      repos.investments.getAll.mockResolvedValue([{ id: 'x', name: 'CDB', type: 'Renda Fixa', value: 1000 }]);

      const [item] = await service.getPortfolio(USER);

      expect(repos.quotes.getQuote).not.toHaveBeenCalled();
      expect(item.quote).toBeUndefined();
    });
  });

  describe('previewRedeem', () => {
    it('simulates tax using current quote and does not persist', async () => {
      const preview = await service.previewRedeem('inv-1', { quantity: 10, taxRate: 15 }, USER);

      expect(preview).toMatchObject({ grossValue: 400, profit: 50, taxValue: 7.5, netValue: 392.5, isTotal: true, isEstimate: true });
      expect(repos.history.applyRedeem).not.toHaveBeenCalled();
    });

    it('rejects quantity greater than position', async () => {
      await expect(service.previewRedeem('inv-1', { quantity: 11, taxRate: 15 }, USER)).rejects.toThrow(
        'Quantidade de resgate maior que a posição atual.'
      );
    });

    it('rejects invalid tax rate', async () => {
      await expect(service.previewRedeem('inv-1', { quantity: 1, taxRate: 120 }, USER)).rejects.toThrow();
    });

    it('is scoped by user: unknown investment is not found', async () => {
      repos.investments.getById.mockResolvedValue(null);

      await expect(service.previewRedeem('other', { quantity: 1, taxRate: 0 }, USER)).rejects.toThrow('Investimento não encontrado.');
      expect(repos.investments.getById).toHaveBeenCalledWith('other', USER);
    });
  });

  describe('redeem', () => {
    it('total redeem marks REDEEMED and records an immutable snapshot', async () => {
      await service.redeem('inv-1', { quantity: 10, taxRate: 15, unitPrice: 40 }, USER);

      const [id, userId, update, entry] = repos.history.applyRedeem.mock.calls[0];
      expect([id, userId]).toEqual(['inv-1', USER]);
      expect(update).toEqual({ shares: 0, value: 0, status: 'REDEEMED' });
      expect(entry).toMatchObject({
        kind: 'REDEEM',
        grossValue: 400,
        costBasis: 350,
        profit: 50,
        taxRate: 15,
        taxValue: 7.5,
        netValue: 392.5,
        assetName: 'Petrobras',
        assetTicker: 'PETR4',
        userId: USER,
      });
    });

    it('partial redeem keeps the asset ACTIVE with proportional position', async () => {
      await service.redeem('inv-1', { quantity: 4, taxRate: 20, unitPrice: 40 }, USER);

      const update = repos.history.applyRedeem.mock.calls[0][2];
      expect(update).toEqual({ shares: 6, value: 210, status: 'ACTIVE' });
    });

    it('loss redeem has zero tax', async () => {
      await service.redeem('inv-1', { quantity: 10, taxRate: 15, unitPrice: 30 }, USER);

      expect(repos.history.applyRedeem.mock.calls[0][3]).toMatchObject({ profit: -50, taxValue: 0, netValue: 300 });
    });

    it('refuses to redeem an already redeemed asset', async () => {
      repos.investments.getById.mockResolvedValue({ ...asset, status: 'REDEEMED' });

      await expect(service.redeem('inv-1', { quantity: 1, taxRate: 0 }, USER)).rejects.toThrow('já foi totalmente resgatado');
    });

    it('refuses manual (non-market) investments', async () => {
      repos.investments.getById.mockResolvedValue({ id: 'x', name: 'CDB', type: 'Renda Fixa', value: 1000 });

      await expect(service.redeem('x', { quantity: 1, taxRate: 0 }, USER)).rejects.toThrow('não é um ativo de mercado');
    });

    it('never touches the quote when an explicit price is given', async () => {
      await service.redeem('inv-1', { quantity: 1, taxRate: 0, unitPrice: 40 }, USER);

      expect(repos.quotes.getQuote).not.toHaveBeenCalled();
    });
  });

  describe('getInvestmentHistoryForUser', () => {
    it('returns entries scoped by user with RAG-ready summaries', async () => {
      const entries: InvestmentHistoryEntry[] = [
        {
          id: 'h2',
          kind: 'REDEEM',
          date: new Date('2026-10-05T00:00:00Z'),
          quantity: 10,
          unitPrice: 40,
          grossValue: 400,
          costBasis: 350,
          profit: 50,
          taxRate: 15,
          taxValue: 7.5,
          netValue: 392.5,
          assetName: 'Petrobras',
          assetTicker: 'PETR4',
          currency: 'BRL',
          investmentId: 'inv-1',
        },
        {
          id: 'h1',
          kind: 'BUY',
          date: new Date('2026-09-01T00:00:00Z'),
          quantity: 10,
          unitPrice: 35,
          grossValue: 350,
          assetName: 'Petrobras',
          assetTicker: 'PETR4',
          currency: 'BRL',
          investmentId: 'inv-1',
        },
      ];
      repos.history.listByUser.mockResolvedValue(entries);

      const report = await service.getInvestmentHistoryForUser(USER);

      expect(repos.history.listByUser).toHaveBeenCalledWith(USER, undefined);
      expect(report.summaries).toHaveLength(2);
      expect(report.summaries[0]).toContain('resgate');
      expect(report.summaries[0]).toContain('PETR4');
      expect(report.summaries[1]).toContain('compra');
    });
  });
});

describe('InvestmentService.createInvestment (market asset)', () => {
  const payload = {
    name: 'Apple',
    type: 'Renda Variável',
    ticker: 'aapl',
    market: 'US',
    currency: 'usd',
    purchaseDate: '2026-09-01',
    unitPrice: 180.5,
    shares: 2,
  };

  it('computes invested value and records a BUY in the history', async () => {
    const { investments, history } = makeRepos();
    investments.create.mockImplementation(async (d) => ({ ...d, id: 'new' }) as Investment);
    const service = new InvestmentService(investments, history);

    const created = await service.createInvestment(payload, USER);

    expect(created.value).toBe(361);
    expect(investments.create).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'AAPL', currency: 'USD', userId: USER }));
    expect(history.record).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'BUY', quantity: 2, unitPrice: 180.5, grossValue: 361, assetTicker: 'AAPL', investmentId: 'new' })
    );
  });

  it('rolls back the investment when the history cannot be recorded', async () => {
    const { investments, history } = makeRepos();
    investments.create.mockImplementation(async (d) => ({ ...d, id: 'new' }) as Investment);
    history.record.mockRejectedValue(new Error('db'));
    const service = new InvestmentService(investments, history);

    await expect(service.createInvestment(payload, USER)).rejects.toThrow('Não foi possível registrar a compra');
    expect(investments.delete).toHaveBeenCalledWith('new');
  });

  it('requires market fields when a ticker is provided', async () => {
    const { investments, history } = makeRepos();
    const service = new InvestmentService(investments, history);

    await expect(service.createInvestment({ name: 'X', type: 'Renda Variável', ticker: 'AAPL' }, USER)).rejects.toThrow();
    expect(investments.create).not.toHaveBeenCalled();
  });

  it('does not touch the history for manual investments', async () => {
    const { investments, history } = makeRepos();
    investments.create.mockImplementation(async (d) => ({ ...d, id: 'new' }) as Investment);
    const service = new InvestmentService(investments, history);

    await service.createInvestment({ name: 'CDB', type: 'Renda Fixa', value: 1000 }, USER);

    expect(history.record).not.toHaveBeenCalled();
  });
});
