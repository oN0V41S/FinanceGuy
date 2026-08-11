import { ITransactionRepository } from './ITransaction.repository';
import { IUserRepository } from '@/features/auth/IUser.repository';
import { CreateTransactionSchema, UpdateTransactionSchema, TransactionInput } from './validations';

/**
 * Soma `months` a uma data 'YYYY-MM-DD' preservando o dia.
 * Usa componentes locais (getFullYear/getMonth/getDate) para evitar
 * desvios de fuso horário do toISOString().
 */
function addMonths(dateString: string, months: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setMonth(date.getMonth() + months);

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export class TransactionService {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async getAllTransactions(filters?: Record<string, any>) {
    return this.transactionRepository.getAll(filters);
  }

  async getTransactionById(id: string, userId: string) {
    const transaction = await this.transactionRepository.getById(id, userId);

    if (!transaction) {
      throw new Error('Transação não encontrada.');
    }

    return transaction;
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

      // Criar as parcelas "Filhas" com datas incrementais (base + i meses)
      const childTransactions = [];
      for (let i = 1; i <= dataForRepository.total_installments; i++) {
        const child = await this.transactionRepository.create({
          ...dataForRepository,
          value: valuePerInstallment,
          date: addMonths(dataForRepository.date, i),
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
      throw new Error('Transação não encontrada.');
    }
    
    return updated;
  }

  async deleteTransaction(id: string) {
    const success = await this.transactionRepository.delete(id);
    
    if (!success) {
      throw new Error('Transação não encontrada.');
    }
    
    return true;
  }

  async deleteFutureTransactions(id: string, userId: string): Promise<number> {
    const transaction = await this.transactionRepository.getById(id, userId);

    if (!transaction) {
      throw new Error('Transação não encontrada.');
    }

    const parentId = transaction.parent_transaction_id ?? transaction.id;
    const count = await this.transactionRepository.deleteFuture(
      parentId,
      userId,
      new Date(transaction.date)
    );

    // Se for o PAI (parent_transaction_id null), remove o próprio pai também.
    // Parcelas anteriores (histórico) NUNCA são alteradas — o deleteMany filtra date >= referencia.
    if (transaction.parent_transaction_id === null) {
      await this.transactionRepository.delete(id);
    }

    return count;
  }

  async updateFutureTransactions(id: string, userId: string, data: unknown): Promise<number> {
    // Validação ANTES de qualquer lookup — lança ZodError sem consultar a transação.
    const validatedData = UpdateTransactionSchema.parse(data);

    const transaction = await this.transactionRepository.getById(id, userId);

    if (!transaction) {
      throw new Error('Transação não encontrada.');
    }

    const parentId = transaction.parent_transaction_id ?? transaction.id;
    const count = await this.transactionRepository.updateFuture(
      parentId,
      userId,
      new Date(transaction.date),
      validatedData
    );

    // Se for o PAI, atualiza o próprio pai também.
    if (transaction.parent_transaction_id === null) {
      await this.transactionRepository.update(id, validatedData);
    }

    return count;
  }
}