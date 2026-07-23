import { ITransactionRepository } from './ITransaction.repository';
import { IUserRepository } from '@/features/auth/IUser.repository';
import { CreateTransactionSchema, UpdateTransactionSchema, TransactionInput } from './validations';

export class TransactionService {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async getAllTransactions(filters?: Record<string, any>) {
    return this.transactionRepository.getAll(filters);
  }

  // Adicione um método para buscar transações por ID, se necessário para o GET
  async getTransactionById(id: string, userId: string) {
    // Garanta que apenas o proprietário da transação possa acessá-la
    return this.transactionRepository.getById(id);
  }


  async getFinancialSummary(filters?: Record<string, any>) {
    return this.transactionRepository.getSummary(filters);
  }

  async createTransaction(data: unknown) {
    // O objeto 'data' neste ponto é { ...body, userId: '...' } vindo do handler da rota.
    // Precisamos garantir que o userId seja preservado, mesmo que CreateTransactionSchema não o valide explicitamente.
    const { userId } = data as TransactionInput; // Extrai o userId de forma segura antes que o Zod possa removê-lo

    // --- NEW: Verify user existence ---
    if (!userId) {
      throw new Error('ID do usuário é obrigatório para criar uma transação.');
    }
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new Error(`Usuário com ID '${userId}' não encontrado. Não é possível criar a transação.`);
    }
    // --- END NEW ---

    // 1. Validação defensiva com Zod (Garante tipo e segurança)
    // Validamos apenas o corpo da transação e, em seguida, adicionamos o userId de volta.
    const validatedTransactionBody = CreateTransactionSchema.parse(data); // Isso pode remover o userId se o schema não o incluir
    
    // Combina o corpo validado com o userId que veio do cabeçalho da requisição (via rota)
    const dataForRepository: TransactionInput = { ...validatedTransactionBody, userId }; // Garante que userId esteja sempre presente

    // 2. Lógica de Parcelamento (Installments)
    if (dataForRepository.total_installments && dataForRepository.total_installments > 1) {
      const valuePerInstallment = dataForRepository.value / dataForRepository.total_installments;

      // Criar transação "Pai" (O registro principal da compra)
      const parentTransaction = await this.transactionRepository.create({
        ...dataForRepository,
        value: dataForRepository.value, // Garante que o valor original seja usado para a transação pai
      });

      // Criar as parcelas "Filhas"
      const childTransactions = [];
      for (let i = 1; i <= dataForRepository.total_installments; i++) {
        const child = await this.transactionRepository.create({
          ...dataForRepository,
          value: valuePerInstallment,
          installment_number: i,
          total_installments: dataForRepository.total_installments,
          parent_transaction_id: parentTransaction.id,
        });
        childTransactions.push(child);
      }

      return { 
        ...parentTransaction, 
        installments: childTransactions 
      };
    }

    // 3. Transação Simples (Sem parcelas)
    return this.transactionRepository.create(dataForRepository);
  }

  async updateTransaction(id: string, data: unknown) {
    const validatedData = UpdateTransactionSchema.parse(data);
    const updated = await this.transactionRepository.update(id, validatedData);
    
    if (!updated) {
      throw new Error('Falha ao atualizar: Transação não encontrada.');
    }
    
    return updated;
  }

  async deleteTransaction(id: string) {
    const success = await this.transactionRepository.delete(id);
    
    if (!success) {
      throw new Error('Falha ao deletar: Transação não encontrada.');
    }
    
    return true;
  }
}