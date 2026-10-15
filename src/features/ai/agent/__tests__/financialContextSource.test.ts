import { createFinancialContextSource } from '../financialContextSource';
import { AiContextLoadError } from '../../errors';
import { NOW } from '../../__fixtures__/agentFakes';

function deps() {
  return {
    transactions: { getAllTransactions: jest.fn().mockResolvedValue({ data: [] }) },
    goals: { getAllGoals: jest.fn().mockResolvedValue([]) },
    investments: { getAllInvestments: jest.fn().mockResolvedValue([]) },
    now: () => NOW,
  };
}

describe('createFinancialContextSource', () => {
  it('carrega transações, metas e investimentos do usuário', async () => {
    const d = deps();
    const ctx = await createFinancialContextSource(d as never).getContext('user-1', 'quanto gastei?');
    expect(ctx).toBeDefined();
    expect(d.transactions.getAllTransactions).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
    expect(d.goals.getAllGoals).toHaveBeenCalledWith('user-1');
    expect(d.investments.getAllInvestments).toHaveBeenCalledWith('user-1');
  });

  it('exige userId', async () => {
    await expect(createFinancialContextSource(deps() as never).getContext('', 'x')).rejects.toThrow();
  });

  it('falha de carga vira AiContextLoadError sem logar a mensagem original', async () => {
    const d = deps();
    d.goals.getAllGoals.mockRejectedValue(new Error('SEGREDO'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(createFinancialContextSource(d as never).getContext('user-1', 'x')).rejects.toBeInstanceOf(AiContextLoadError);
    const logged = JSON.stringify(spy.mock.calls);
    spy.mockRestore();
    expect(logged).not.toContain('SEGREDO');
  });
});
