import { IInvestmentRepository } from './IInvestment.repository';
import { CreateInvestmentSchema, UpdateInvestmentSchema } from './validations';
import type { Investment } from './validations';

export class InvestmentService {
  constructor(private readonly investmentRepository: IInvestmentRepository) {}

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

    return this.investmentRepository.create({ ...validatedData, userId });
  }

  async updateInvestment(id: string, data: unknown, userId: string): Promise<Investment> {
    const existing = await this.investmentRepository.getById(id, userId);

    if (!existing) {
      throw new Error('Investimento não encontrado.');
    }

    const validatedData = UpdateInvestmentSchema.parse(data);

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
