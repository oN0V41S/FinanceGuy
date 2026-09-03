import { createHash } from 'crypto';
import { ITransactionRepository } from './ITransaction.repository';
import { IUserRepository } from '@/features/auth/IUser.repository';
import { ICacheRepository } from '@/shared/interfaces/ICacheRepository';
import { CreateTransactionSchema, UpdateTransactionSchema, TransactionInput } from './validations';
import type { Transaction, FinancialSummary } from '@/types/finance';
import type { MonthlyPoint } from './types';

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

/** TTL padrão do cache quando CACHE_TTL não está definido (em segundos). */
const DEFAULT_CACHE_TTL = 300;

/**
 * Escapa caracteres glob (`*`, `?`, `[`, `]`) presentes no userId ao montar
 * chaves e padrões de invalidação (A03 — defense-in-depth). O userId vem do
 * JWT (UUID hoje), mas um valor externo nunca deve conseguir ampliar um
 * padrão de deleção para alcançar chaves de outros usuários.
 */
function escapeGlobChars(value: string): string {
  return value.replace(/[*?\[\]]/g, '\\$&');
}

export class TransactionService {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly userRepository: IUserRepository,
    private readonly cacheRepository: ICacheRepository
  ) {}

  /**
   * Chave do cache da LISTA: `transactions:{userId}:{md5(JSON.stringify(filters sem userId))}`.
   * O hash cobre APENAS os filtros — o userId compõe o prefixo (namespace).
   * Retorna null quando não há userId (sem cache para requisições fora de contexto).
   */
  private buildCacheKey(filters?: Record<string, any>): string | null {
    if (!filters || typeof filters.userId !== 'string' || filters.userId.trim() === '') {
      return null;
    }

    const { userId, ...filtersWithoutUserId } = filters;
    const hash = createHash('md5').update(JSON.stringify(filtersWithoutUserId)).digest('hex');

    return `transactions:${escapeGlobChars(userId)}:${hash}`;
  }

  /**
   * Chave do cache do SUMMARY: `transactions:{userId}:{hash}:summary` — chave
   * DISTINTA da lista (I01). Compartilhar a mesma chave entre payloads de
   * tipos diferentes (array vs objeto) gerava 100% MISS na rota real
   * (ping-pong: 2 reads + 2 writes por GET). O prefixo comum mantém a
   * invalidação `transactions:{userId}:*` cobrindo AMBAS.
   */
  private buildSummaryCacheKey(filters?: Record<string, any>): string | null {
    const baseKey = this.buildCacheKey(filters);

    return baseKey ? `${baseKey}:summary` : null;
  }

  /**
   * Padrão de invalidação das mutations: `transactions:{userId}:*` (cobre a
   * chave da lista e a do summary, ambas sob o prefixo comum). O userId passa
   * por escapeGlobChars para que caracteres glob nunca ampliem o padrão.
   */
  private buildInvalidationPattern(userId: string): string {
    return `transactions:${escapeGlobChars(userId)}:*`;
  }

  private getTtl(): number {
    return Number(process.env.CACHE_TTL ?? DEFAULT_CACHE_TTL);
  }

  async getAllTransactions(filters?: Record<string, any>): Promise<{ data: Transaction[]; fromCache: boolean }> {
    const cacheKey = this.buildCacheKey(filters);

    if (cacheKey) {
      const cached = await this.cacheRepository.get(cacheKey);

      if (cached !== null) {
        try {
          const parsed = JSON.parse(cached) as unknown;

          // Chave exclusiva da LISTA (I01): payload válido é SEMPRE um array.
          if (Array.isArray(parsed)) {
            return { data: parsed, fromCache: true };
          }
        } catch {
          // A01 — payload corrompido no Redis: JSON.parse lançaria e TODO GET
          // viraria 500 persistente. Trata como MISS, apaga a entrada
          // corrompida e segue o fluxo normal (repository + re-gravação).
          await this.cacheRepository.del(cacheKey);
        }
      }
    }

    const data = await this.transactionRepository.getAll(filters);

    if (cacheKey) {
      await this.cacheRepository.set(cacheKey, JSON.stringify(data), this.getTtl());
    }

    return { data, fromCache: false };
  }

  async getTransactionById(id: string, userId: string) {
    const transaction = await this.transactionRepository.getById(id, userId);

    if (!transaction) {
      throw new Error('Transação não encontrada.');
    }

    return transaction;
  }

  async getFinancialSummary(filters?: Record<string, any>): Promise<{ data: FinancialSummary; fromCache: boolean }> {
    // Chave DISTINTA da lista (I01): `transactions:{userId}:{hash}:summary`.
    const cacheKey = this.buildSummaryCacheKey(filters);

    if (cacheKey) {
      const cached = await this.cacheRepository.get(cacheKey);

      if (cached !== null) {
        try {
          const parsed = JSON.parse(cached) as unknown;

          // Payload válido do summary é SEMPRE um objeto não-array.
          if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return { data: parsed as FinancialSummary, fromCache: true };
          }
        } catch {
          // A01 — payload corrompido: trata como MISS, apaga a entrada
          // corrompida e segue o fluxo normal (repository + re-gravação).
          await this.cacheRepository.del(cacheKey);
        }
      }
    }

    const data = await this.transactionRepository.getSummary(filters);

    if (cacheKey) {
      await this.cacheRepository.set(cacheKey, JSON.stringify(data), this.getTtl());
    }

    return { data, fromCache: false };
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

    let result: Transaction | (Transaction & { installments: Transaction[] });

    // 2. Lógica de Parcelamento (Installments)
    if (dataForRepository.total_installments && dataForRepository.total_installments > 1) {
      const valuePerInstallment = dataForRepository.value / dataForRepository.total_installments;

      // Criar transação "Pai" (O registro principal da compra)
      const parentTransaction = await this.transactionRepository.create({
        ...dataForRepository,
        value: dataForRepository.value, // Garante que o valor original seja usado para a transação pai
      });

      // Criar as parcelas "Filhas" com datas incrementais (base + i meses)
      const childTransactions: Transaction[] = [];
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

      result = { ...parentTransaction, installments: childTransactions };
    } else {
      // 3. Transação Simples (Sem parcelas)
      result = await this.transactionRepository.create(dataForRepository);
    }

    // Invalidação: qualquer mutation invalida TODAS as chaves do usuário.
    await this.cacheRepository.delByPattern(this.buildInvalidationPattern(userId));

    return result;
  }

  async updateTransaction(id: string, data: unknown) {
    const validatedData = UpdateTransactionSchema.parse(data);
    const userId = (data as Partial<TransactionInput>).userId;

    const updated = await this.transactionRepository.update(id, validatedData);

    if (!updated) {
      throw new Error('Transação não encontrada.');
    }

    if (userId) {
      await this.cacheRepository.delByPattern(this.buildInvalidationPattern(userId));
    }

    return updated;
  }

  async deleteTransaction(id: string, userId: string) {
    const success = await this.transactionRepository.delete(id);

    if (!success) {
      throw new Error('Transação não encontrada.');
    }

    await this.cacheRepository.delByPattern(this.buildInvalidationPattern(userId));

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

    await this.cacheRepository.delByPattern(this.buildInvalidationPattern(userId));

    return count;
  }

  async getMonthlySummary(userId: string, period: string): Promise<MonthlyPoint[]> {
    const cacheKey = `transactions:${escapeGlobChars(userId)}:monthly:${period}`;

    const cached = await this.cacheRepository.get(cacheKey);
    if (cached !== null) {
      try {
        const parsed = JSON.parse(cached) as unknown;
        if (Array.isArray(parsed)) {
          return parsed as MonthlyPoint[];
        }
      } catch {
        // A01 — payload corrompido: trata como MISS.
        await this.cacheRepository.del(cacheKey);
      }
    }

    const data = await this.transactionRepository.getMonthlySummary(userId, period);
    await this.cacheRepository.set(cacheKey, JSON.stringify(data), this.getTtl());

    return data;
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

    await this.cacheRepository.delByPattern(this.buildInvalidationPattern(userId));

    return count;
  }
}