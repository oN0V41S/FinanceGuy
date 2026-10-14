/**
 * FING-18 — correção de IDOR: update/delete escopados por userId + searchTransactions.
 */
import { TransactionService } from '../transactions.service';

function build() {
  const repo = {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteFuture: jest.fn(),
    updateFuture: jest.fn(),
    getSummary: jest.fn(),
    getMonthlySummary: jest.fn(),
    getAvailableYears: jest.fn(),
    getOpeningBalance: jest.fn(),
    search: jest.fn(),
  };
  const users = { findById: jest.fn() };
  const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn(), delByPattern: jest.fn() };
  const service = new TransactionService(repo as never, users as never, cache as never);
  return { repo, cache, service };
}

describe('TransactionService — ownership (IDOR)', () => {
  it('updateTransaction repassa userId ao repositório', async () => {
    const { repo, service } = build();
    repo.update.mockResolvedValue({ id: 't1' });
    await service.updateTransaction('t1', { value: 10, userId: 'A' });
    expect(repo.update).toHaveBeenCalledWith('t1', 'A', expect.objectContaining({ value: 10 }));
  });

  it('updateTransaction sem userId lança "não encontrada" sem tocar o repositório', async () => {
    const { repo, service } = build();
    await expect(service.updateTransaction('t1', { value: 10 })).rejects.toThrow('Transação não encontrada.');
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('usuário B não consegue atualizar transação do usuário A', async () => {
    const { repo, cache, service } = build();
    repo.update.mockResolvedValue(null); // escopo userId=B não acha a linha de A
    await expect(service.updateTransaction('tA', { value: 1, userId: 'B' })).rejects.toThrow('Transação não encontrada.');
    expect(repo.update).toHaveBeenCalledWith('tA', 'B', expect.anything());
    expect(cache.delByPattern).not.toHaveBeenCalled();
  });

  it('usuário B não consegue deletar transação do usuário A', async () => {
    const { repo, cache, service } = build();
    repo.delete.mockResolvedValue(false);
    await expect(service.deleteTransaction('tA', 'B')).rejects.toThrow('Transação não encontrada.');
    expect(repo.delete).toHaveBeenCalledWith('tA', 'B');
    expect(cache.delByPattern).not.toHaveBeenCalled();
  });

  it('deleteTransaction exige userId', async () => {
    const { repo, service } = build();
    await expect(service.deleteTransaction('t1', '')).rejects.toThrow('Transação não encontrada.');
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

describe('TransactionService.searchTransactions', () => {
  it('delega ao repositório com limite padrão 5 e máximo 5', async () => {
    const { repo, service } = build();
    repo.search.mockResolvedValue([{ id: 't1' }]);
    const res = await service.searchTransactions({ userId: 'A', query: 'mercado' });
    expect(repo.search).toHaveBeenCalledWith(expect.objectContaining({ userId: 'A', query: 'mercado', limit: 5 }));
    expect(res).toEqual([{ id: 't1' }]);

    await service.searchTransactions({ userId: 'A', limit: 50 });
    expect(repo.search).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 5 }));
    await service.searchTransactions({ userId: 'A', limit: 2 });
    expect(repo.search).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 2 }));
  });

  it('sem userId retorna lista vazia sem consultar', async () => {
    const { repo, service } = build();
    await expect(service.searchTransactions({ userId: '' })).resolves.toEqual([]);
    expect(repo.search).not.toHaveBeenCalled();
  });
});
