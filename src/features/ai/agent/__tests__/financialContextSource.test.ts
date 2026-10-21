import { createFinancialContextSource } from '../financialContextSource';
import { AiContextLoadError } from '../../errors';
import { NOW } from '../../__fixtures__/agentFakes';

function deps() {
  return {
    transactions: { getAllTransactions: jest.fn().mockResolvedValue({ data: [] }) },
    goals: { getAllGoals: jest.fn().mockResolvedValue([]) },
    investments: { getAllInvestments: jest.fn().mockResolvedValue([]) },
    categories: { findAll: jest.fn().mockResolvedValue([]) },
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

  describe('carteira por categoria (sob demanda)', () => {
    const investment = {
      id: 'i1',
      name: 'Cripto',
      type: 'Renda Variável',
      value: 100,
      status: 'ACTIVE',
      categoryId: 'c1',
      category: { id: 'c1', name: 'Cripto', color: '#EAB308' },
    };
    const investmentCategory = {
      id: 'c1',
      name: 'Cripto',
      type: 'both',
      color: '#EAB308',
      icon: null,
      isDefault: true,
      scope: 'investment',
    };

    it('pergunta de carteira carrega categorias do escopo investment e monta a seção', async () => {
      const d = deps();
      d.investments.getAllInvestments.mockResolvedValue([investment]);
      d.categories.findAll.mockResolvedValue([investmentCategory]);

      const ctx = await createFinancialContextSource(d as never).getContext('user-1', 'como está minha carteira?');

      expect(d.categories.findAll).toHaveBeenCalledWith('user-1', 'investment');
      expect(ctx.portfolioByCategory).toEqual([{ name: 'Cripto', total: 100, pct: 100, count: 1 }]);
    });

    it('pergunta sem o tema não consulta categorias nem envia a seção', async () => {
      const d = deps();
      d.investments.getAllInvestments.mockResolvedValue([investment]);
      d.categories.findAll.mockResolvedValue([investmentCategory]);

      const ctx = await createFinancialContextSource(d as never).getContext('user-1', 'quanto gastei?');

      expect(d.categories.findAll).not.toHaveBeenCalled();
      expect(ctx.portfolioByCategory).toBeUndefined();
    });

    it('falha ao carregar categorias: seção omitida e o contexto segue', async () => {
      const d = deps();
      d.investments.getAllInvestments.mockResolvedValue([investment]);
      d.categories.findAll.mockRejectedValue(new Error('SEGREDO'));
      const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      const ctx = await createFinancialContextSource(d as never).getContext('user-1', 'quanto tenho em cripto?');
      spy.mockRestore();

      expect(ctx.portfolioByCategory).toBeUndefined();
      expect(ctx.today).toBe('2026-10-14');
    });
  });
});
