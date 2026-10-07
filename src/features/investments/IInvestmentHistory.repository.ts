import type { InvestmentHistoryEntry, InvestmentHistoryInput, RedeemApplyUpdate } from './history.types';

export interface IInvestmentHistoryRepository {
  record(entry: InvestmentHistoryInput): Promise<InvestmentHistoryEntry>;
  /** Atualiza a posição e grava o resgate em uma única transação de banco. */
  applyRedeem(
    investmentId: string,
    userId: string,
    update: RedeemApplyUpdate,
    entry: InvestmentHistoryInput
  ): Promise<InvestmentHistoryEntry>;
  listByUser(userId: string, investmentId?: string): Promise<InvestmentHistoryEntry[]>;
}
