// src/features/transactions/__tests__/transactions.service.test.ts
import { TransactionService } from '../transactions.service';
import { ITransactionRepository } from '../ITransaction.repository';
import { IUserRepository } from '@/features/auth/IUser.repository';

describe('TransactionService', () => {
  let service: TransactionService;
  let mockTransactionRepo: jest.Mocked<ITransactionRepository>;
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

  it('deve calcular e criar parcelas corretamente quando total_installments > 1', async () => {
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
    
    // Verifica se o valor da parcela foi dividido corretamente (1200 / 3 = 400)
    expect(mockTransactionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      value: 400,
      installment_number: 1
    }));
  });
});