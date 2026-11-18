import { AiService } from '../ai.service';
import { AiContextLoadError, AiTimeoutError } from '../errors';
import type { ILlmProvider } from '../types';

const NOW = new Date('2026-10-15T15:00:00Z');

const SENTINELS = ['DESCRICAO_SENTINELA', 'RESPONSAVEL_SENTINELA', 'USERID_SENTINELA', 'EMAIL_SENTINELA', 'HASH_SENTINELA', 'ID_SENTINELA'];

function makeDeps(over: { transactions?: unknown[]; goals?: unknown[]; investments?: unknown[]; categories?: unknown[] } = {}) {
  const transactions = {
    getAllTransactions: jest.fn().mockResolvedValue({
      data: over.transactions ?? [
        {
          id: 'ID_SENTINELA',
          type: 'expense',
          title: 'Mercado',
          description: 'DESCRICAO_SENTINELA',
          value: 123.45,
          date: '2026-10-05',
          category: 'Alimentação',
          responsible: 'RESPONSAVEL_SENTINELA',
          paid: true,
          userId: 'USERID_SENTINELA',
          email: 'EMAIL_SENTINELA@x.com',
          passwordHash: 'HASH_SENTINELA',
        },
      ],
      fromCache: false,
    }),
  };
  const goals = { getAllGoals: jest.fn().mockResolvedValue(over.goals ?? []) };
  const investments = { getAllInvestments: jest.fn().mockResolvedValue(over.investments ?? []) };
  const categories = { findAll: jest.fn().mockResolvedValue(over.categories ?? []) };
  const llm: jest.Mocked<ILlmProvider> = {
    complete: jest.fn().mockResolvedValue({ text: 'Você gastou R$ 123,45.', stopReason: 'stop', usage: { inputTokens: 100, outputTokens: 20 } }),
  };
  const service = new AiService({ transactions, goals, investments, categories, llm, now: () => NOW });
  return { service, transactions, goals, investments, categories, llm };
}

describe('AiService.ask', () => {
  let logSpy: jest.SpyInstance;
  let errSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(['', undefined as unknown as string, null as unknown as string])('userId falsy (%p) lança antes de tocar nos repositórios', async (uid) => {
    const d = makeDeps();
    await expect(d.service.ask(uid, 'oi')).rejects.toThrow();
    expect(d.transactions.getAllTransactions).not.toHaveBeenCalled();
    expect(d.goals.getAllGoals).not.toHaveBeenCalled();
    expect(d.investments.getAllInvestments).not.toHaveBeenCalled();
    expect(d.llm.complete).not.toHaveBeenCalled();
  });

  it('consulta dados do usuário com a janela BRT correta', async () => {
    const d = makeDeps();
    await d.service.ask('user-1', 'Quanto gastei?');
    expect(d.transactions.getAllTransactions).toHaveBeenCalledWith({ userId: 'user-1', startDate: '2026-05-01', endDate: '2026-10-31' });
    expect(d.goals.getAllGoals).toHaveBeenCalledWith('user-1');
    expect(d.investments.getAllInvestments).toHaveBeenCalledWith('user-1');
  });

  it('busca QUALQUER período citado na pergunta, além da janela padrão', async () => {
    const d = makeDeps();
    await d.service.ask('user-1', 'Quanto gastei em janeiro de 2024?');
    expect(d.transactions.getAllTransactions).toHaveBeenCalledWith({ userId: 'user-1', startDate: '2024-01-01', endDate: '2026-10-31' });
  });

  it('período futuro (ex.: parcelas e contas agendadas) amplia o fim da consulta', async () => {
    const d = makeDeps();
    await d.service.ask('user-1', 'Quanto vou pagar em dezembro de 2026?');
    expect(d.transactions.getAllTransactions).toHaveBeenCalledWith({ userId: 'user-1', startDate: '2026-05-01', endDate: '2026-12-31' });
  });

  it('período recente já coberto não amplia a consulta', async () => {
    const d = makeDeps();
    await d.service.ask('user-1', 'e no mês passado?');
    expect(d.transactions.getAllTransactions).toHaveBeenCalledWith({ userId: 'user-1', startDate: '2026-05-01', endDate: '2026-10-31' });
  });

  it('retorna a resposta do LLM', async () => {
    const d = makeDeps();
    await expect(d.service.ask('user-1', 'Quanto gastei?')).resolves.toEqual({ answer: 'Você gastou R$ 123,45.', truncated: false });
  });

  it('o payload enviado ao LLM contém os dados e a pergunta, sem sentinelas proibidas', async () => {
    const d = makeDeps();
    await d.service.ask('user-1', 'Quanto gastei?');
    const req = d.llm.complete.mock.calls[0][0];
    const payload = JSON.stringify(req);
    expect(payload).toContain('Mercado');
    expect(payload).toContain('123.45');
    expect(payload).toContain('Quanto gastei?');
    expect(req.messages).toHaveLength(1);
    expect(req.messages[0].role).toBe('user');
    for (const s of SENTINELS) expect(payload).not.toContain(s);
    expect(payload).not.toContain('user-1');
  });

  it('sem nenhum dado responde sem chamar o LLM', async () => {
    const d = makeDeps({ transactions: [] });
    const r = await d.service.ask('user-1', 'Como estou?');
    expect(d.llm.complete).not.toHaveBeenCalled();
    expect(r.truncated).toBe(false);
    expect(r.answer).toMatch(/cadastre/i);
  });

  it('propaga truncated quando o LLM atinge max_tokens', async () => {
    const d = makeDeps();
    d.llm.complete.mockResolvedValue({ text: 'parcial', stopReason: 'max_tokens' });
    await expect(d.service.ask('user-1', 'x')).resolves.toEqual({ answer: 'parcial', truncated: true });
  });

  it('propaga erros do provider', async () => {
    const d = makeDeps();
    d.llm.complete.mockRejectedValue(new AiTimeoutError());
    await expect(d.service.ask('user-1', 'x')).rejects.toBeInstanceOf(AiTimeoutError);
  });

  it('falha ao carregar dados vira AiContextLoadError e não chama o LLM', async () => {
    const d = makeDeps();
    d.goals.getAllGoals.mockRejectedValue(new Error('db down'));
    await expect(d.service.ask('user-1', 'x')).rejects.toBeInstanceOf(AiContextLoadError);
    expect(d.llm.complete).not.toHaveBeenCalled();
  });

  it('logs trazem só métricas, sem pergunta, valores ou userId', async () => {
    const d = makeDeps();
    await d.service.ask('user-1', 'PERGUNTA_SENTINELA');
    const logged = JSON.stringify([...logSpy.mock.calls, ...errSpy.mock.calls]);
    expect(logged).not.toContain('PERGUNTA_SENTINELA');
    expect(logged).not.toContain('user-1');
    expect(logged).not.toContain('Mercado');
    expect(logged).toContain('stopReason');
  });

  describe('carteira por categoria (sob demanda)', () => {
    const investment = {
      id: 'i1',
      name: 'CDB',
      type: 'Renda Fixa',
      value: 250,
      status: 'ACTIVE',
      categoryId: 'c1',
      category: { id: 'c1', name: 'Renda Fixa', color: '#3B82F6' },
    };
    const investmentCategory = {
      id: 'c1',
      name: 'Renda Fixa',
      type: 'both',
      color: '#3B82F6',
      icon: null,
      isDefault: true,
      scope: 'investment',
    };

    const userMessage = (d: ReturnType<typeof makeDeps>): string => d.llm.complete.mock.calls[0][0].messages[0].content;

    it('pergunta sobre carteira consulta categorias do escopo investment e envia a seção', async () => {
      const d = makeDeps({ investments: [investment], categories: [investmentCategory] });
      await d.service.ask('user-1', 'Como está minha carteira?');
      expect(d.categories.findAll).toHaveBeenCalledWith('user-1', 'investment');
      expect(userMessage(d)).toContain('portfolioByCategory');
      expect(userMessage(d)).toContain('Renda Fixa');
    });

    it('pergunta sem o tema não consulta categorias nem envia a seção', async () => {
      const d = makeDeps({ investments: [investment], categories: [investmentCategory] });
      await d.service.ask('user-1', 'Quanto gastei?');
      expect(d.categories.findAll).not.toHaveBeenCalled();
      expect(userMessage(d)).not.toContain('portfolioByCategory');
    });

    it('falha ao carregar categorias: seção omitida e a resposta segue', async () => {
      const d = makeDeps({ investments: [investment] });
      d.categories.findAll.mockRejectedValue(new Error('db down'));
      const result = await d.service.ask('user-1', 'Como está minha carteira?');
      expect(result.answer).toBe('Você gastou R$ 123,45.');
      expect(userMessage(d)).not.toContain('portfolioByCategory');
      const logged = JSON.stringify([...logSpy.mock.calls, ...errSpy.mock.calls]);
      expect(logged).not.toContain('db down');
    });

    it('sem carteira ativa a seção fica ausente mesmo pedindo o tema', async () => {
      const d = makeDeps({ investments: [], categories: [investmentCategory] });
      await d.service.ask('user-1', 'Como está minha carteira?');
      expect(userMessage(d)).not.toContain('portfolioByCategory');
    });
  });
});
