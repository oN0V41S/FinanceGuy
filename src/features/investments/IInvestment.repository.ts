import { Investment, InvestmentInput } from './validations';

export interface IInvestmentRepository {
  getAll(userId: string): Promise<Investment[]>;
  getById(id: string, userId: string): Promise<Investment | null>;
  create(data: InvestmentInput): Promise<Investment>;
  update(id: string, data: Partial<InvestmentInput>): Promise<Investment | null>;
  delete(id: string): Promise<boolean>;
}
