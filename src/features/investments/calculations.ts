export interface BuyLot {
  quantity: number;
  unitPrice: number;
}

export interface Position {
  quantity: number;
  unitPrice: number;
}

export interface PositionResult {
  cost: number;
  currentValue: number;
  profit: number;
  profitPct: number;
}

export interface RedeemInput {
  position: Position;
  redeemQuantity: number;
  redeemUnitPrice: number;
  /** Alíquota informada pelo usuário, em % (0–100). */
  taxRate: number;
}

export interface RedeemResult {
  quantity: number;
  grossValue: number;
  cost: number;
  profit: number;
  taxRate: number;
  taxValue: number;
  netValue: number;
  remainingQuantity: number;
  isTotal: boolean;
}

/** Arredonda em 2 casas evitando drift de ponto flutuante (ex.: 3 × 0,1). */
export const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const round8 = (value: number): number => Math.round((value + Number.EPSILON) * 1e8) / 1e8;

export function averagePrice(lots: BuyLot[]): { quantity: number; unitPrice: number; cost: number } {
  const quantity = round8(lots.reduce((acc, lot) => acc + lot.quantity, 0));
  const cost = round2(lots.reduce((acc, lot) => acc + lot.quantity * lot.unitPrice, 0));

  if (quantity === 0) return { quantity: 0, unitPrice: 0, cost: 0 };

  return { quantity, unitPrice: round2(cost / quantity), cost };
}

export function computePosition(position: Position, currentPrice: number): PositionResult {
  const cost = round2(position.quantity * position.unitPrice);
  const currentValue = round2(position.quantity * currentPrice);
  const profit = round2(currentValue - cost);
  const profitPct = cost === 0 ? 0 : round2((profit / cost) * 100);

  return { cost, currentValue, profit, profitPct };
}

export function simulateRedeem({ position, redeemQuantity, redeemUnitPrice, taxRate }: RedeemInput): RedeemResult {
  if (!(redeemQuantity > 0)) throw new Error('Quantidade de resgate deve ser positiva.');
  if (!(redeemUnitPrice > 0)) throw new Error('Preço de resgate deve ser positivo.');
  if (!(taxRate >= 0 && taxRate <= 100)) throw new Error('Alíquota deve estar entre 0 e 100.');
  if (redeemQuantity > position.quantity) throw new Error('Quantidade de resgate maior que a posição atual.');

  const grossValue = round2(redeemQuantity * redeemUnitPrice);
  const cost = round2(redeemQuantity * position.unitPrice);
  const profit = round2(grossValue - cost);
  const taxValue = profit > 0 ? round2((profit * taxRate) / 100) : 0;
  const remainingQuantity = round8(position.quantity - redeemQuantity);

  return {
    quantity: redeemQuantity,
    grossValue,
    cost,
    profit,
    taxRate,
    taxValue,
    netValue: round2(grossValue - taxValue),
    remainingQuantity,
    isTotal: remainingQuantity === 0,
  };
}
