// src/features/transactions/__tests__/transactions.service.test.ts
import { TransactionService } from '../transactions.service';
import { ITransactionRepository } from '../ITransaction.repository';
import { IUserRepository } from '@/features/auth/IUser.repository';

describe('TransactionService', () => {
  let service: TransactionService;
  // jest.Mocked<ITransactionRepository> + métodos do novo contrato de operações em lote
  // (deleteFuture/updateFuture ainda não existem na interface — fase RED do TDD)
  let mockTransactionRepo: jest.Mocked<ITransactionRepository> & {
    deleteFuture: jest.Mock;
    updateFuture: jest.Mock;
  };
  let mockUserRepo: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    // Mock do repositório de transações
    mockTransactionRepo = {
      create: jest.fn(),
      getAll: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getSummary: jest.fn(),
      // Contrato alvo: deleteFuture/updateFuture (esta e futuras)
      deleteFuture: jest.fn(),
      updateFuture: jest.fn(),
    } as any;

    // Mock do repositório de usuário
    mockUserRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
    } as any;

    // Por padrão, mockamos que o usuário existe para não quebrar os testes existentes
    mockUserRepo.findById.mockResolvedValue({ id: 'user-id', name: 'Test User', email: 'test@test.com', nickname: 'test' });

    service = new TransactionService(mockTransactionRepo, mockUserRepo);
  });

  describe('createTransaction — parcelamento com datas incrementais', () => {
    it('deve criar parcelas com datas incrementais (base + i meses) e valor dividido por N', async () => {
      const transactionData = {
        userId: 'user-id', // Adicionamos o userId, que agora é obrigatório
        description: 'Compra Notebook',
        value: 1200,
        total_installments: 3,
        type: 'expense',
        category: 'Outros',
        date: '2024-01-01',
        responsible: 'Admin'
      };

      mockTransactionRepo.create.mockResolvedValue({ id: 'parent-id', ...transactionData } as any);

      const result = await service.createTransaction(transactionData);

      // Verifica se a existência do usuário foi checada
      expect(mockUserRepo.findById).toHaveBeenCalledWith('user-id');

      // Verifica se o repositório foi chamado 4 vezes (1 pai + 3 parcelas)
      expect(mockTransactionRepo.create).toHaveBeenCalledTimes(4);

      const createCalls = mockTransactionRepo.create.mock.calls.map(([args]) => args as any);
      const [parentCall, child1, child2, child3] = createCalls;

      // O pai mantém a data base e o valor total
      expect(parentCall).toMatchObject({
        date: '2024-01-01',
        value: 1200,
      });

      // Filhas com datas INCREMENTAIS (base + i meses) e valor = total / N
      expect(child1).toMatchObject({
        installment_number: 1,
        value: 400,
        date: '2024-02-01',
        parent_transaction_id: 'parent-id',
      });
      expect(child2).toMatchObject({
        installment_number: 2,
        value: 400,
        date: '2024-03-01',
        parent_transaction_id: 'parent-id',
      });
      expect(child3).toMatchObject({
        installment_number: 3,
        value: 400,
        date: '2024-04-01',
        parent_transaction_id: 'parent-id',
      });

      expect(result).toMatchObject({ id: 'parent-id' });
      expect((result as any).installments).toHaveLength(3);
    });

    it('deve avançar o mês das parcelas além da virada do ano', async () => {
      const transactionData = {
        userId: 'user-id',
        description: 'Assinatura Anual',
        value: 600,
        total_installments: 3,
        type: 'expense',
        category: 'Outros',
        date: '2024-12-01',
        responsible: 'Admin'
      };

      mockTransactionRepo.create.mockResolvedValue({ id: 'parent-id', ...transactionData } as any);

      await service.createTransaction(transactionData);

      const childCalls = mockTransactionRepo.create.mock.calls.slice(1).map(([args]) => args as any);
      expect(childCalls).toHaveLength(3);
      expect(childCalls[0]).toMatchObject({ installment_number: 1, value: 200, date: '2025-01-01' });
      expect(childCalls[1]).toMatchObject({ installment_number: 2, value: 200, date: '2025-02-01' });
      expect(childCalls[2]).toMatchObject({ installment_number: 3, value: 200, date: '2025-03-01' });
    });
  });

  describe('deleteFutureTransactions — esta e futuras', () => {
    it('a partir de uma FILHA deve deletar apenas parcelas >= data da filha (preserva histórico)', async () => {
      const child = {
        id: 'child-2',
        parent_transaction_id: 'parent-id',
        date: '2024-02-01',
      } as any;
      mockTransactionRepo.getById.mockResolvedValue(child);
      mockTransactionRepo.deleteFuture.mockResolvedValue(2);

      const count = await service.deleteFutureTransactions('child-2', 'user-id');

      expect(mockTransactionRepo.getById).toHaveBeenCalledWith('child-2', 'user-id');
      expect(mockTransactionRepo.deleteFuture).toHaveBeenCalledWith(
        'parent-id',
        'user-id',
        new Date('2024-02-01')
      );
      // Parcela filha NÃO deleta o pai (histórico preservado — regra inegociável)
      expect(mockTransactionRepo.delete).not.toHaveBeenCalled();
      expect(count).toBe(2);
    });

    it('a partir do PAI deve deletar filhas futuras E o próprio pai', async () => {
      const parent = {
        id: 'parent-id',
        parent_transaction_id: null,
        date: '2024-01-01',
      } as any;
      mockTransactionRepo.getById.mockResolvedValue(parent);
      mockTransactionRepo.deleteFuture.mockResolvedValue(3);

      const count = await service.deleteFutureTransactions('parent-id', 'user-id');

      expect(mockTransactionRepo.deleteFuture).toHaveBeenCalledWith(
        'parent-id',
        'user-id',
        new Date('2024-01-01')
      );
      // Como é o PAI, deleta o próprio pai após as filhas
      expect(mockTransactionRepo.delete).toHaveBeenCalledWith('parent-id');
      expect(count).toBe(3);
    });

    it('deve lançar erro quando a transação não existe', async () => {
      mockTransactionRepo.getById.mockResolvedValue(null);

      await expect(
        service.deleteFutureTransactions('inexistente', 'user-id')
      ).rejects.toThrow('Transação não encontrada.');
      expect(mockTransactionRepo.deleteFuture).not.toHaveBeenCalled();
    });
  });

  describe('updateFutureTransactions — esta e futuras', () => {
    it('a partir de uma FILHA deve atualizar apenas parcelas >= data da filha (preserva histórico)', async () => {
      const child = {
        id: 'child-2',
        parent_transaction_id: 'parent-id',
        date: '2024-02-01',
      } as any;
      mockTransactionRepo.getById.mockResolvedValue(child);
      mockTransactionRepo.updateFuture.mockResolvedValue(2);

      const count = await service.updateFutureTransactions('child-2', 'user-id', { value: 500 });

      expect(mockTransactionRepo.getById).toHaveBeenCalledWith('child-2', 'user-id');
      expect(mockTransactionRepo.updateFuture).toHaveBeenCalledWith(
        'parent-id',
        'user-id',
        new Date('2024-02-01'),
        expect.objectContaining({ value: 500 })
      );
      // Parcela filha NÃO atualiza o pai (histórico preservado)
      expect(mockTransactionRepo.update).not.toHaveBeenCalled();
      expect(count).toBe(2);
    });

    it('a partir do PAI deve atualizar filhas futuras E o próprio pai', async () => {
      const parent = {
        id: 'parent-id',
        parent_transaction_id: null,
        date: '2024-01-01',
      } as any;
      mockTransactionRepo.getById.mockResolvedValue(parent);
      mockTransactionRepo.updateFuture.mockResolvedValue(3);

      const count = await service.updateFutureTransactions('parent-id', 'user-id', { value: 500 });

      expect(mockTransactionRepo.updateFuture).toHaveBeenCalledWith(
        'parent-id',
        'user-id',
        new Date('2024-01-01'),
        expect.objectContaining({ value: 500 })
      );
      expect(mockTransactionRepo.update).toHaveBeenCalledWith(
        'parent-id',
        expect.objectContaining({ value: 500 })
      );
      expect(count).toBe(3);
    });

    it('deve lançar ZodError para valor negativo antes de buscar a transação', async () => {
      await expect(
        service.updateFutureTransactions('child-2', 'user-id', { value: -10 })
      ).rejects.toMatchObject({ name: 'ZodError' });

      expect(mockTransactionRepo.getById).not.toHaveBeenCalled();
    });

    it('deve lançar ZodError para categoria fora do enum', async () => {
      await expect(
        service.updateFutureTransactions('child-2', 'user-id', { category: 'CategoriaInexistente' })
      ).rejects.toMatchObject({ name: 'ZodError' });
    });

    it('deve lançar erro quando a transação não existe', async () => {
      mockTransactionRepo.getById.mockResolvedValue(null);

      await expect(
        service.updateFutureTransactions('inexistente', 'user-id', { value: 500 })
      ).rejects.toThrow('Transação não encontrada.');
      expect(mockTransactionRepo.updateFuture).not.toHaveBeenCalled();
    });
  });
});
