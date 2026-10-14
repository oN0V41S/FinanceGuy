import { averagePrice, computePosition, simulateRedeem } from '../calculations';

describe('averagePrice', () => {
  it('computes weighted average price across buys', () => {
    const result = averagePrice([
      { quantity: 10, unitPrice: 30 },
      { quantity: 10, unitPrice: 40 },
    ]);
    expect(result).toEqual({ quantity: 20, unitPrice: 35, cost: 700 });
  });

  it('returns zeros for empty list', () => {
    expect(averagePrice([])).toEqual({ quantity: 0, unitPrice: 0, cost: 0 });
  });
});

describe('computePosition', () => {
  it('computes current value, profit and profit percentage', () => {
    const result = computePosition({ quantity: 10, unitPrice: 35 }, 40);
    expect(result).toEqual({ cost: 350, currentValue: 400, profit: 50, profitPct: 14.29 });
  });

  it('handles losses', () => {
    const result = computePosition({ quantity: 10, unitPrice: 40 }, 35);
    expect(result.profit).toBe(-50);
    expect(result.profitPct).toBe(-12.5);
  });

  it('returns 0% when cost is zero', () => {
    expect(computePosition({ quantity: 0, unitPrice: 0 }, 10).profitPct).toBe(0);
  });

  it('avoids floating point drift', () => {
    const result = computePosition({ quantity: 3, unitPrice: 0.1 }, 0.2);
    expect(result.cost).toBe(0.3);
    expect(result.currentValue).toBe(0.6);
    expect(result.profit).toBe(0.3);
  });
});

describe('simulateRedeem', () => {
  const position = { quantity: 10, unitPrice: 35 };

  it('applies user-informed tax rate over profit', () => {
    const result = simulateRedeem({ position, redeemQuantity: 10, redeemUnitPrice: 40, taxRate: 15 });
    expect(result).toEqual({
      quantity: 10,
      grossValue: 400,
      cost: 350,
      profit: 50,
      taxRate: 15,
      taxValue: 7.5,
      netValue: 392.5,
      remainingQuantity: 0,
      isTotal: true,
    });
  });

  it('charges no tax on losses', () => {
    const result = simulateRedeem({ position, redeemQuantity: 10, redeemUnitPrice: 30, taxRate: 15 });
    expect(result.profit).toBe(-50);
    expect(result.taxValue).toBe(0);
    expect(result.netValue).toBe(300);
  });

  it('supports partial redeem using proportional cost', () => {
    const result = simulateRedeem({ position, redeemQuantity: 4, redeemUnitPrice: 40, taxRate: 20 });
    expect(result.grossValue).toBe(160);
    expect(result.cost).toBe(140);
    expect(result.profit).toBe(20);
    expect(result.taxValue).toBe(4);
    expect(result.netValue).toBe(156);
    expect(result.remainingQuantity).toBe(6);
    expect(result.isTotal).toBe(false);
  });

  it('accepts a zero tax rate', () => {
    const result = simulateRedeem({ position, redeemQuantity: 10, redeemUnitPrice: 40, taxRate: 0 });
    expect(result.taxValue).toBe(0);
    expect(result.netValue).toBe(400);
  });

  it('rejects quantity above position', () => {
    expect(() => simulateRedeem({ position, redeemQuantity: 11, redeemUnitPrice: 40, taxRate: 15 })).toThrow(
      'Quantidade de resgate maior que a posição atual.'
    );
  });

  it('rejects non positive quantity or price and invalid tax rate', () => {
    expect(() => simulateRedeem({ position, redeemQuantity: 0, redeemUnitPrice: 40, taxRate: 15 })).toThrow();
    expect(() => simulateRedeem({ position, redeemQuantity: 1, redeemUnitPrice: 0, taxRate: 15 })).toThrow();
    expect(() => simulateRedeem({ position, redeemQuantity: 1, redeemUnitPrice: 40, taxRate: 101 })).toThrow();
    expect(() => simulateRedeem({ position, redeemQuantity: 1, redeemUnitPrice: 40, taxRate: -1 })).toThrow();
  });
});
