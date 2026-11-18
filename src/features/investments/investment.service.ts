import { IInvestmentRepository } from './IInvestment.repository';
import { IInvestmentHistoryRepository } from './IInvestmentHistory.repository';
import { CreateInvestmentSchema, UpdateInvestmentSchema } from './validations';
import type { ICategoryRepository } from '@/features/categories/ICategory.repository';
import type { Investment } from './validations';

export const INVALID_CATEGORY_MESSAGE = 'Categoria inválida.';

/** categoryId de outro usuário/escopo (ou inexistente): vira 400 nas rotas. */
export class InvalidInvestmentCategoryError extends Error {
  constructor() {
    super(INVALID_CATEGORY_MESSAGE);
    this.name = 'InvalidInvestmentCategoryError';
  }
}

export class InvestmentService {
  constructor(
    private readonly investmentRepository: IInvestmentRepository,
    private readonly historyRepository?: IInvestmentHistoryRepository,
    private readonly categoryLookup?: Pick<ICategoryRepository, 'findById'>
  ) {}

  /** Nunca confiar no cliente: a categoria precisa ser do mesmo usuário e do escopo 'investment'. */
  private async assertCategoryUsable(categoryId: string | null | undefined, userId: string): Promise<void> {
    if (!categoryId) return;

    const category = this.categoryLookup ? await this.categoryLookup.findById(categoryId, userId) : null;
    if (!category || category.scope !== 'investment') {
      throw new InvalidInvestmentCategoryError();
    }
  }

  async getAllInvestments(userId: string): Promise<Investment[]> {
    return this.investmentRepository.getAll(userId);
  }

  async getInvestmentById(id: string, userId: string): Promise<Investment> {
    const investment = await this.investmentRepository.getById(id, userId);

    if (!investment) {
      throw new Error('Investimento não encontrado.');
    }

    return investment;
  }

  async createInvestment(data: unknown, userId: string): Promise<Investment> {
    const validatedData = CreateInvestmentSchema.parse(data);
    await this.assertCategoryUsable(validatedData.categoryId, userId);

    const created = await this.investmentRepository.create({ ...validatedData, userId });

    // Ativo de mercado: registra a compra no histórico (fonte única de verdade, sem criar Transaction).
    if (created.ticker && this.historyRepository) {
      try {
        await this.historyRepository.record({
          userId,
          investmentId: created.id,
          kind: 'BUY',
          date: created.purchaseDate ?? new Date(),
          quantity: created.shares ?? 0,
          unitPrice: created.unitPrice ?? 0,
          grossValue: created.value,
          assetName: created.name,
          assetTicker: created.ticker,
          assetMarket: created.market,
          currency: created.currency,
        });
      } catch {
        await this.investmentRepository.delete(created.id);
        throw new Error('Não foi possível registrar a compra no histórico. Tente novamente.');
      }
    }

    return created;
  }

  async updateInvestment(id: string, data: unknown, userId: string): Promise<Investment> {
    const existing = await this.investmentRepository.getById(id, userId);

    if (!existing) {
      throw new Error('Investimento não encontrado.');
    }

    const validatedData = UpdateInvestmentSchema.parse(data);
    await this.assertCategoryUsable(validatedData.categoryId, userId);

    const updated = await this.investmentRepository.update(id, validatedData);

    if (!updated) {
      throw new Error('Investimento não encontrado.');
    }

    return updated;
  }

  async deleteInvestment(id: string, userId: string): Promise<boolean> {
    const existing = await this.investmentRepository.getById(id, userId);

    if (!existing) {
      throw new Error('Investimento não encontrado.');
    }

    const success = await this.investmentRepository.delete(id);

    if (!success) {
      throw new Error('Investimento não encontrado.');
    }

    return true;
  }
}
