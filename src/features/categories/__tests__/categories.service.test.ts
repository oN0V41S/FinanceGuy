import { CategoriesService, CategoryError } from '../categories.service';
import { ICategoryRepository } from '../ICategory.repository';
import { ICacheRepository } from '@/shared/interfaces/ICacheRepository';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_INVESTMENT_CATEGORIES,
  FALLBACK_INVESTMENT_CATEGORY_KEY,
  MAX_CATEGORIES_PER_USER,
} from '../defaults';
import type { Category } from '../validations';

const userId = 'user-1';

function cat(overrides: Partial<Category> = {}): Category {
  return {
    id: 'c1',
    name: 'Mercado',
    type: 'expense',
    color: '#F97316',
    icon: 'utensils',
    isDefault: false,
    transactionCount: 0,
    ...overrides,
  };
}

describe('CategoriesService', () => {
  let repo: jest.Mocked<ICategoryRepository>;
  let cache: jest.Mocked<ICacheRepository>;
  let service: CategoriesService;

  beforeEach(() => {
    repo = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      findByKey: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(9),
      countTransactions: jest.fn().mockResolvedValue(0),
      countTransactionsByType: jest.fn().mockResolvedValue(0),
      createMany: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn().mockResolvedValue(true),
      countInvestments: jest.fn().mockResolvedValue(0),
      removeInvestmentCategory: jest.fn().mockResolvedValue(0),
    };
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delByPattern: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ICacheRepository>;
    service = new CategoriesService(repo, cache);
  });

  describe('ensureDefaults / list', () => {
    it('semeia as 9 categorias padrão (idempotente via createMany) e lista', async () => {
      repo.count.mockResolvedValueOnce(0);
      repo.findAll.mockResolvedValue([cat()]);

      const result = await service.list(userId);

      expect(repo.createMany).toHaveBeenCalledTimes(1);
      const [uid, items] = repo.createMany.mock.calls[0];
      expect(uid).toBe(userId);
      expect(items).toHaveLength(DEFAULT_CATEGORIES.length);
      expect(items.every((i) => i.isDefault)).toBe(true);
      expect(items.find((i) => i.name === 'Alimentação')?.nameKey).toBe('alimentacao');
      expect(result).toEqual([cat()]);
    });

    it('não semeia de novo quando o usuário já tem categorias', async () => {
      repo.count.mockResolvedValue(3);
      await service.list(userId);
      expect(repo.createMany).not.toHaveBeenCalled();
    });

    it('filtra por tipo compatível (income inclui both)', async () => {
      repo.findAll.mockResolvedValue([
        cat({ id: 'a', name: 'Salário', type: 'income' }),
        cat({ id: 'b', name: 'Casa', type: 'expense' }),
        cat({ id: 'c', name: 'Outros', type: 'both' }),
      ]);
      const result = await service.list(userId, 'income');
      expect(result.map((c) => c.name)).toEqual(['Salário', 'Outros']);
    });

    it('se o seed falhar, devolve fallback somente leitura dos padrões (não bloqueia o app)', async () => {
      repo.count.mockRejectedValue(new Error('db down'));
      repo.findAll.mockRejectedValue(new Error('db down'));
      const result = await service.list(userId);
      expect(result).toHaveLength(DEFAULT_CATEGORIES.length);
      expect(result.every((c) => c.isDefault)).toBe(true);
    });
  });

  describe('create', () => {
    it('cria categoria normalizando nameKey', async () => {
      repo.create.mockResolvedValue(cat({ name: 'Pet Shop' }));
      await service.create({ name: '  Pét   Shop ', type: 'expense' }, userId);
      expect(repo.create).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ name: 'Pét Shop', nameKey: 'pet shop', isDefault: false, type: 'expense' })
      );
    });

    it('rejeita nome duplicado (ignora caixa e acento) com DUPLICATE', async () => {
      repo.findByKey.mockResolvedValue(cat({ name: 'Alimentação' }));
      await expect(service.create({ name: 'alimentacao' }, userId)).rejects.toMatchObject({ code: 'DUPLICATE' });
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejeita acima do limite com LIMIT', async () => {
      repo.count.mockResolvedValue(MAX_CATEGORIES_PER_USER);
      await expect(service.create({ name: 'Nova' }, userId)).rejects.toMatchObject({ code: 'LIMIT' });
    });

    it('trata violação de unicidade concorrente (P2002) como DUPLICATE', async () => {
      repo.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
      await expect(service.create({ name: 'Nova' }, userId)).rejects.toMatchObject({ code: 'DUPLICATE' });
    });

    it('lança ZodError para entrada inválida (cor)', async () => {
      await expect(service.create({ name: 'X', color: 'red' }, userId)).rejects.toMatchObject({ name: 'ZodError' });
    });

    it('invalida cache de transações não é necessário no create', async () => {
      repo.create.mockResolvedValue(cat());
      await service.create({ name: 'Nova' }, userId);
      expect(cache.delByPattern).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('NOT_FOUND quando a categoria não é do usuário', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update('x', { color: '#112233' }, userId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('"Outros" não pode ser renomeada (FORBIDDEN) mas aceita cor/ícone', async () => {
      repo.findById.mockResolvedValue(cat({ id: 'o', name: 'Outros', isDefault: true, type: 'both' }));
      await expect(service.update('o', { name: 'Diversos' }, userId)).rejects.toMatchObject({ code: 'FORBIDDEN' });

      repo.update.mockResolvedValue(cat({ id: 'o', name: 'Outros', color: '#112233' }));
      await expect(service.update('o', { color: '#112233' }, userId)).resolves.toBeDefined();
    });

    it('"Outros" não pode mudar de tipo (precisa ser both) — FORBIDDEN', async () => {
      repo.findById.mockResolvedValue(cat({ id: 'o', name: 'Outros', isDefault: true, type: 'both' }));
      await expect(service.update('o', { type: 'expense' }, userId)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('mudar o tipo para income com despesas existentes => INCOMPATIBLE_TYPE', async () => {
      repo.findById.mockResolvedValue(cat({ id: 'c1', name: 'Mercado', type: 'expense' }));
      repo.countTransactionsByType.mockResolvedValue(3);

      await expect(service.update('c1', { type: 'income' }, userId)).rejects.toMatchObject({
        code: 'INCOMPATIBLE_TYPE',
      });
      expect(repo.countTransactionsByType).toHaveBeenCalledWith(userId, 'Mercado', 'expense');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('mudar o tipo sem transações conflitantes funciona; both não consulta', async () => {
      repo.findById.mockResolvedValue(cat({ id: 'c1', name: 'Mercado', type: 'expense' }));
      repo.update.mockResolvedValue(cat({ type: 'income' }));
      await expect(service.update('c1', { type: 'income' }, userId)).resolves.toBeDefined();

      repo.countTransactionsByType.mockClear();
      await service.update('c1', { type: 'both' }, userId);
      expect(repo.countTransactionsByType).not.toHaveBeenCalled();
    });

    it('rename propaga: passa renameFrom e invalida o cache de transações', async () => {
      repo.findById.mockResolvedValue(cat({ id: 'c1', name: 'Mercado' }));
      repo.update.mockResolvedValue(cat({ id: 'c1', name: 'Supermercado' }));

      await service.update('c1', { name: 'Supermercado' }, userId);

      expect(repo.update).toHaveBeenCalledWith(
        'c1',
        userId,
        expect.objectContaining({ name: 'Supermercado', nameKey: 'supermercado' }),
        'Mercado'
      );
      expect(cache.delByPattern).toHaveBeenCalledWith('transactions:user-1:*');
    });

    it('alterar só cor não dispara rename nem invalidação', async () => {
      repo.findById.mockResolvedValue(cat());
      repo.update.mockResolvedValue(cat({ color: '#112233' }));

      await service.update('c1', { color: '#112233' }, userId);

      expect(repo.update).toHaveBeenCalledWith('c1', userId, { color: '#112233' }, undefined);
      expect(cache.delByPattern).not.toHaveBeenCalled();
    });

    it('rename para nome já usado por OUTRA categoria => DUPLICATE', async () => {
      repo.findById.mockResolvedValue(cat({ id: 'c1', name: 'Mercado' }));
      repo.findByKey.mockResolvedValue(cat({ id: 'c2', name: 'Casa' }));
      await expect(service.update('c1', { name: 'casa' }, userId)).rejects.toMatchObject({ code: 'DUPLICATE' });
    });

    it('renomear só a caixa/acento da própria categoria é permitido', async () => {
      repo.findById.mockResolvedValue(cat({ id: 'c1', name: 'Mercado' }));
      repo.findByKey.mockResolvedValue(cat({ id: 'c1', name: 'Mercado' }));
      repo.update.mockResolvedValue(cat({ id: 'c1', name: 'MERCADO' }));
      await expect(service.update('c1', { name: 'MERCADO' }, userId)).resolves.toBeDefined();
    });
  });

  describe('remove', () => {
    it('NOT_FOUND quando não existe/não é do usuário', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove('x', {}, userId)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('padrão não pode ser excluída (FORBIDDEN)', async () => {
      repo.findById.mockResolvedValue(cat({ isDefault: true, name: 'Casa' }));
      await expect(service.remove('c1', {}, userId)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('sem transações: exclui direto', async () => {
      repo.findById.mockResolvedValue(cat());
      repo.countTransactions.mockResolvedValue(0);
      await service.remove('c1', {}, userId);
      expect(repo.remove).toHaveBeenCalledWith('c1', userId, 'Mercado', undefined);
    });

    it('com transações e sem reassignTo => REASSIGN_REQUIRED com a contagem', async () => {
      repo.findById.mockResolvedValue(cat());
      repo.countTransactions.mockResolvedValue(4);
      await expect(service.remove('c1', {}, userId)).rejects.toMatchObject({
        code: 'REASSIGN_REQUIRED',
        details: { transactionCount: 4 },
      });
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('reassignTo igual à origem => INVALID_REASSIGN', async () => {
      repo.findById
        .mockResolvedValueOnce(cat({ id: 'c1' }))
        .mockResolvedValueOnce(cat({ id: 'c1' }));
      repo.countTransactions.mockResolvedValue(2);
      await expect(service.remove('c1', { reassignTo: 'c1' }, userId)).rejects.toMatchObject({
        code: 'INVALID_REASSIGN',
      });
    });

    it('reassignTo de outro usuário/inexistente => INVALID_REASSIGN (IDOR)', async () => {
      repo.findById.mockResolvedValueOnce(cat({ id: 'c1' })).mockResolvedValueOnce(null);
      repo.countTransactions.mockResolvedValue(2);
      await expect(service.remove('c1', { reassignTo: 'alheia' }, userId)).rejects.toMatchObject({
        code: 'INVALID_REASSIGN',
      });
      expect(repo.findById).toHaveBeenLastCalledWith('alheia', userId);
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('destino incompatível com os tipos das transações movidas => INCOMPATIBLE_TYPE', async () => {
      repo.findById
        .mockResolvedValueOnce(cat({ id: 'c1', name: 'Mercado', type: 'both' }))
        .mockResolvedValueOnce(cat({ id: 's', name: 'Salário', type: 'income' }));
      repo.countTransactions.mockResolvedValue(3);
      repo.countTransactionsByType.mockResolvedValue(2);

      await expect(service.remove('c1', { reassignTo: 's' }, userId)).rejects.toMatchObject({
        code: 'INCOMPATIBLE_TYPE',
      });
      expect(repo.countTransactionsByType).toHaveBeenCalledWith(userId, 'Mercado', 'expense');
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('reatribui atomicamente e invalida o cache', async () => {
      repo.findById
        .mockResolvedValueOnce(cat({ id: 'c1', name: 'Mercado' }))
        .mockResolvedValueOnce(cat({ id: 'o', name: 'Outros', isDefault: true }));
      repo.countTransactions.mockResolvedValue(3);

      const result = await service.remove('c1', { reassignTo: 'o' }, userId);

      expect(repo.remove).toHaveBeenCalledWith('c1', userId, 'Mercado', 'Outros');
      expect(cache.delByPattern).toHaveBeenCalledWith('transactions:user-1:*');
      expect(result).toEqual({ moved: 3 });
    });
  });

  describe('assertUsable (integração com transações)', () => {
    it('aceita categoria existente e compatível com o tipo', async () => {
      repo.findByKey.mockResolvedValue(cat({ name: 'Salário', type: 'income' }));
      await expect(service.assertUsable(userId, 'salario', 'income')).resolves.toMatchObject({ name: 'Salário' });
    });

    it('NOT_FOUND para categoria inexistente', async () => {
      repo.findByKey.mockResolvedValue(null);
      await expect(service.assertUsable(userId, 'Inventada', 'expense')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('INCOMPATIBLE_TYPE quando o tipo não bate', async () => {
      repo.findByKey.mockResolvedValue(cat({ name: 'Salário', type: 'income' }));
      await expect(service.assertUsable(userId, 'Salário', 'expense')).rejects.toMatchObject({
        code: 'INCOMPATIBLE_TYPE',
      });
    });
  });

  describe('escopo investment', () => {
    const invCat = (o: Partial<Category> = {}): Category =>
      cat({ id: 'i1', name: 'Cripto', type: 'both', isDefault: false, scope: 'investment', ...o });
    const fallbackCat = (): Category =>
      invCat({ id: 'fb', name: 'Outros investimentos', isDefault: true });

    it('seed lazy por escopo: semeia os padrões de investimento com scope e fallback protegido', async () => {
      repo.count.mockResolvedValueOnce(0);
      repo.findAll.mockResolvedValue([invCat()]);

      await service.list(userId, undefined, 'investment');

      expect(repo.count).toHaveBeenCalledWith(userId, 'investment');
      const [, items] = repo.createMany.mock.calls[0];
      expect(items).toHaveLength(DEFAULT_INVESTMENT_CATEGORIES.length);
      expect(items.every((i) => i.scope === 'investment' && i.isDefault && i.type === 'both')).toBe(true);
      expect(items[items.length - 1].nameKey).toBe(FALLBACK_INVESTMENT_CATEGORY_KEY);
      expect(repo.findAll).toHaveBeenCalledWith(userId, 'investment');
    });

    it('seed é independente: transações já semeadas não impedem o seed de investimentos', async () => {
      repo.count.mockImplementation(async (_u, scope) => (scope === 'transaction' ? 9 : 0));
      await service.list(userId, undefined, 'investment');
      expect(repo.createMany).toHaveBeenCalledTimes(1);
    });

    it('list padrão continua no escopo transaction', async () => {
      await service.list(userId);
      expect(repo.findAll).toHaveBeenCalledWith(userId, 'transaction');
    });

    it('falha no seed devolve padrões de investimento em memória', async () => {
      repo.count.mockRejectedValue(new Error('db down'));
      const result = await service.list(userId, undefined, 'investment');
      expect(result).toHaveLength(DEFAULT_INVESTMENT_CATEGORIES.length);
      expect(result.every((c) => c.scope === 'investment')).toBe(true);
    });

    it('create usa o scope: duplicado checado só no mesmo escopo (mesmo nome em outro escopo é permitido)', async () => {
      repo.create.mockResolvedValue(invCat({ name: 'Casa' }));
      await service.create({ name: 'Casa', scope: 'investment' }, userId);
      expect(repo.findByKey).toHaveBeenCalledWith(userId, 'casa', 'investment');
      expect(repo.create).toHaveBeenCalledWith(userId, expect.objectContaining({ scope: 'investment', type: 'both' }));
    });

    it('create duplicado no mesmo escopo => DUPLICATE', async () => {
      repo.findByKey.mockResolvedValue(invCat());
      await expect(service.create({ name: 'cripto', scope: 'investment' }, userId)).rejects.toMatchObject({
        code: 'DUPLICATE',
      });
    });

    it('create sem scope assume transaction', async () => {
      repo.create.mockResolvedValue(cat());
      await service.create({ name: 'Nova' }, userId);
      expect(repo.create).toHaveBeenCalledWith(userId, expect.objectContaining({ scope: 'transaction' }));
    });

    it('limite MAX_CATEGORIES_PER_USER vale por escopo', async () => {
      repo.count.mockImplementation(async (_u, scope) => (scope === 'transaction' ? MAX_CATEGORIES_PER_USER : 7));
      repo.create.mockResolvedValue(invCat());
      await expect(service.create({ name: 'Nova', scope: 'investment' }, userId)).resolves.toBeDefined();
      await expect(service.create({ name: 'Nova' }, userId)).rejects.toMatchObject({ code: 'LIMIT' });
    });

    it('"Outros investimentos" não pode ser renomeada, mas aceita cor', async () => {
      repo.findById.mockResolvedValue(fallbackCat());
      await expect(service.update('fb', { name: 'Diversos' }, userId)).rejects.toMatchObject({ code: 'FORBIDDEN' });

      repo.update.mockResolvedValue({ ...fallbackCat(), color: '#112233' });
      await expect(service.update('fb', { color: '#112233' }, userId)).resolves.toBeDefined();
    });

    it('rename de categoria de investimento usa o escopo do registro e não propaga a transações', async () => {
      repo.findById.mockResolvedValue(invCat());
      repo.update.mockResolvedValue(invCat({ name: 'Bitcoin' }));

      await service.update('i1', { name: 'Bitcoin' }, userId);

      expect(repo.findByKey).toHaveBeenCalledWith(userId, 'bitcoin', 'investment');
      expect(repo.update).toHaveBeenCalledWith('i1', userId, expect.objectContaining({ name: 'Bitcoin' }), undefined);
      expect(cache.delByPattern).not.toHaveBeenCalled();
    });

    it('excluir categoria de investimento migra ativos para o fallback na mesma operação', async () => {
      repo.findById.mockResolvedValue(invCat());
      repo.count.mockResolvedValue(7);
      repo.findByKey.mockResolvedValue(fallbackCat());
      repo.removeInvestmentCategory.mockResolvedValue(3);

      const result = await service.remove('i1', {}, userId);

      expect(repo.findByKey).toHaveBeenCalledWith(userId, FALLBACK_INVESTMENT_CATEGORY_KEY, 'investment');
      expect(repo.removeInvestmentCategory).toHaveBeenCalledWith('i1', userId, 'fb');
      expect(repo.remove).not.toHaveBeenCalled();
      expect(result).toEqual({ moved: 3 });
    });

    it('excluir sem ativos também funciona (moved 0)', async () => {
      repo.findById.mockResolvedValue(invCat());
      repo.count.mockResolvedValue(7);
      repo.findByKey.mockResolvedValue(fallbackCat());
      repo.removeInvestmentCategory.mockResolvedValue(0);
      await expect(service.remove('i1', {}, userId)).resolves.toEqual({ moved: 0 });
    });

    it('fallback ausente => INVALID_REASSIGN amigável, sem excluir', async () => {
      repo.findById.mockResolvedValue(invCat());
      repo.count.mockResolvedValue(7);
      repo.findByKey.mockResolvedValue(null);
      await expect(service.remove('i1', {}, userId)).rejects.toMatchObject({ code: 'INVALID_REASSIGN' });
      expect(repo.removeInvestmentCategory).not.toHaveBeenCalled();
    });

    it('categoria padrão/fallback de investimento não pode ser excluída', async () => {
      repo.findById.mockResolvedValue(fallbackCat());
      await expect(service.remove('fb', {}, userId)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('assertUsable consulta sempre o escopo transaction', async () => {
      repo.findByKey.mockResolvedValue(cat({ type: 'both' }));
      await service.assertUsable(userId, 'Mercado', 'expense');
      expect(repo.findByKey).toHaveBeenCalledWith(userId, 'mercado', 'transaction');
    });
  });

  it('CategoryError expõe code e message amigável', () => {
    const err = new CategoryError('DUPLICATE', 'Já existe uma categoria com esse nome.');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('DUPLICATE');
  });
});
