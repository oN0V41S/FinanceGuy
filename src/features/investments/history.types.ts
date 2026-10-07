import type { Market } from './quotes/types';

export type HistoryKind = 'BUY' | 'REDEEM';

export interface InvestmentHistoryEntry {
  id: string;
  kind: HistoryKind;
  date: Date;
  quantity: number;
  unitPrice: number;
  grossValue: number;
  costBasis?: number;
  profit?: number;
  taxRate?: number;
  taxValue?: number;
  netValue?: number;
  note?: string;
  assetName: string;
  assetTicker?: string;
  assetMarket?: Market;
  currency?: string;
  investmentId: string | null;
}

export type InvestmentHistoryInput = Omit<InvestmentHistoryEntry, 'id'> & { userId: string };

export interface RedeemApplyUpdate {
  shares: number;
  value: number;
  status: 'ACTIVE' | 'REDEEMED';
}
