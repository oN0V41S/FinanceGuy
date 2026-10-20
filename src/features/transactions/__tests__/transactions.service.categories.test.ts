import { TransactionService } from '../transactions.service';
import { CategoryError } from '@/features/categories/categories.service';

describe('TransactionService — integração com categorias do usuário', () => {
  const repo = {
    create: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
  };
  const userRepo = { findById: jest.fn() };
  const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn(), delByPattern: jest.fn() };
  const categories = { assertUsable: jest.fn() };

  const service = new TransactionService(repo as never, userRepo as never, cache as never, categories);

  const body = {
    type: 'expense',
    value: 50,
    date: '2026-10-01',
    category: 'mercado',
    responsible: 'Ana',
    userId: 'user-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userRepo.findById.mockResolvedValue({ id: 'user-1' });
    repo.create.mockImplementation(async (d) => ({ id: 't1', ...d }));
  });

  it('create: valida a categoria e grava o nome canônico', async () => {
    categories.assertUsable.mockResolvedValue({ name: 'Mercado' });

    await service.createTransaction(body);

    expect(categories.assertUsable).toHaveBeenCalledWith('user-1', 'mercado', 'expense');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ category: 'Mercado' }));
  });

  it('create: não grava quando a categoria é inválida/incompatível', async () => {
    categories.assertUsable.mockRejectedValue(new CategoryError('INCOMPATIBLE_TYPE', 'incompatível'));

    await expect(service.createTransaction(body)).rejects.toMatchObject({ code: 'INCOMPATIBLE_TYPE' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('update: usa o type da transação existente quando o payload só troca a categoria', async () => {
    repo.getById.mockResolvedValue({ id: 't1', type: 'income' });
    repo.update.mockResolvedValue({ id: 't1' });
    categories.assertUsable.mockResolvedValue({ name: 'Salário' });

    await service.updateTransaction('t1', { category: 'salário', userId: 'user-1' });

    expect(categories.assertUsable).toHaveBeenCalledWith('user-1', 'salário', 'income');
    expect(repo.update).toHaveBeenCalledWith('t1', expect.objectContaining({ category: 'Salário' }));
  });

  it('update: não consulta categorias quando a categoria não muda', async () => {
    repo.update.mockResolvedValue({ id: 't1' });

    await service.updateTransaction('t1', { value: 10, userId: 'user-1' });

    expect(categories.assertUsable).not.toHaveBeenCalled();
  });
});
