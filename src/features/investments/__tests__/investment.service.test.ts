import { InvestmentService } from '../investment.service';
import { IInvestmentRepository } from '../IInvestment.repository';
import { Investment } from '../validations';
import { InvalidInvestmentCategoryError } from '../investment.service';
import type { ICategoryRepository } from '@/features/categories/ICategory.repository';

describe('InvestmentService', () => {
  let repository: jest.Mocked<IInvestmentRepository>;
  let service: InvestmentService;

  const userId = 'user-1';
  const investment: Investment = {
    id: 'inv-1',
    name: 'Tesouro Selic',
    type: 'Renda Fixa',
    value: 1000,
    quantity: '10 cotas',
    term: '2 anos',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    repository = {
      getAll: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new InvestmentService(repository);
  });

  describe('getAllInvestments', () => {
    it('returns all investments for the user', async () => {
      repository.getAll.mockResolvedValue([investment]);
      const result = await service.getAllInvestments(userId);
      expect(result).toEqual([investment]);
      expect(repository.getAll).toHaveBeenCalledWith(userId);
    });
  });

  describe('getInvestmentById', () => {
    it('returns investment when found', async () => {
      repository.getById.mockResolvedValue(investment);
      const result = await service.getInvestmentById('inv-1', userId);
      expect(result).toEqual(investment);
    });

    it('throws when not found', async () => {
      repository.getById.mockResolvedValue(null);
      await expect(service.getInvestmentById('missing', userId)).rejects.toThrow();
    });
  });

  describe('createInvestment', () => {
    it('validates and creates the investment', async () => {
      repository.create.mockResolvedValue(investment);
      const result = await service.createInvestment(
        { name: 'Tesouro Selic', type: 'Renda Fixa', value: 1000, quantity: '10 cotas', term: '2 anos' },
        userId
      );
      expect(repository.create).toHaveBeenCalledWith({
        name: 'Tesouro Selic',
        type: 'Renda Fixa',
        value: 1000,
        quantity: '10 cotas',
        term: '2 anos',
        userId,
      });
      expect(result).toEqual(investment);
    });

    it('throws ZodError on invalid data', async () => {
      await expect(
        service.createInvestment({ name: '', type: 'Renda Fixa', value: 1000 }, userId)
      ).rejects.toThrow();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateInvestment', () => {
    it('updates the investment when owned by user', async () => {
      repository.getById.mockResolvedValue(investment);
      repository.update.mockResolvedValue({ ...investment, name: 'Novo nome' });

      const result = await service.updateInvestment('inv-1', { name: 'Novo nome' }, userId);

      expect(repository.getById).toHaveBeenCalledWith('inv-1', userId);
      expect(repository.update).toHaveBeenCalledWith('inv-1', { name: 'Novo nome' });
      expect(result.name).toBe('Novo nome');
    });

    it('throws when investment not found or not owned by user', async () => {
      repository.getById.mockResolvedValue(null);
      await expect(service.updateInvestment('inv-1', { name: 'x' }, userId)).rejects.toThrow();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws ZodError on invalid update data', async () => {
      repository.getById.mockResolvedValue(investment);
      await expect(service.updateInvestment('inv-1', { value: -1 }, userId)).rejects.toThrow();
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('categoryId', () => {
    const categoryId = 'ckxyz0000000000000000000a';
    let categories: jest.Mocked<Pick<ICategoryRepository, 'findById'>>;
    const invCategory = {
      id: categoryId,
      name: 'Cripto',
      type: 'both' as const,
      color: null,
      icon: null,
      isDefault: false,
      scope: 'investment' as const,
    };
    const base = { name: 'BTC', type: 'Renda Variável', value: 500 };

    beforeEach(() => {
      categories = { findById: jest.fn() };
      service = new InvestmentService(repository, undefined, categories);
    });

    it('create: categoria do usuário no escopo investment é aceita e persistida', async () => {
      categories.findById.mockResolvedValue(invCategory);
      repository.create.mockResolvedValue({ ...investment, categoryId });

      await service.createInvestment({ ...base, categoryId }, userId);

      expect(categories.findById).toHaveBeenCalledWith(categoryId, userId);
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ categoryId, userId }));
    });

    it('create: categoria inexistente/de outro usuário => "Categoria inválida."', async () => {
      categories.findById.mockResolvedValue(null);
      const promise = service.createInvestment({ ...base, categoryId }, userId);
      await expect(promise).rejects.toBeInstanceOf(InvalidInvestmentCategoryError);
      await expect(promise).rejects.toThrow('Categoria inválida.');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('create: categoria de escopo transaction é rejeitada', async () => {
      categories.findById.mockResolvedValue({ ...invCategory, scope: 'transaction' });
      await expect(service.createInvestment({ ...base, categoryId }, userId)).rejects.toBeInstanceOf(
        InvalidInvestmentCategoryError
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('create: categoryId null/ausente não consulta categorias', async () => {
      repository.create.mockResolvedValue(investment);
      await service.createInvestment({ ...base, categoryId: null }, userId);
      await service.createInvestment(base, userId);
      expect(categories.findById).not.toHaveBeenCalled();
    });

    it('create: categoryId que não é cuid => ZodError (400 na rota)', async () => {
      await expect(service.createInvestment({ ...base, categoryId: 'abc' }, userId)).rejects.toMatchObject({
        name: 'ZodError',
      });
    });

    it('update: valida a categoria e permite limpar com null', async () => {
      repository.getById.mockResolvedValue(investment);
      repository.update.mockResolvedValue({ ...investment, categoryId: null });

      await service.updateInvestment('inv-1', { categoryId: null }, userId);
      expect(repository.update).toHaveBeenCalledWith('inv-1', { categoryId: null });
      expect(categories.findById).not.toHaveBeenCalled();

      categories.findById.mockResolvedValue(null);
      await expect(service.updateInvestment('inv-1', { categoryId }, userId)).rejects.toBeInstanceOf(
        InvalidInvestmentCategoryError
      );
    });

    it('sem lookup configurado, categoryId é rejeitado (fail-closed)', async () => {
      service = new InvestmentService(repository);
      await expect(service.createInvestment({ ...base, categoryId }, userId)).rejects.toBeInstanceOf(
        InvalidInvestmentCategoryError
      );
    });
  });

  describe('deleteInvestment', () => {
    it('deletes the investment when owned by user', async () => {
      repository.getById.mockResolvedValue(investment);
      repository.delete.mockResolvedValue(true);

      await service.deleteInvestment('inv-1', userId);

      expect(repository.getById).toHaveBeenCalledWith('inv-1', userId);
      expect(repository.delete).toHaveBeenCalledWith('inv-1');
    });

    it('throws when investment not found or not owned by user', async () => {
      repository.getById.mockResolvedValue(null);
      await expect(service.deleteInvestment('inv-1', userId)).rejects.toThrow();
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
