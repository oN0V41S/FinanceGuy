import { CreateTransactionSchema, UpdateTransactionSchema, TransactionSchema } from '../validations';

describe('Transaction Validations (Zod)', () => {
  describe('CreateTransactionSchema', () => {
    it('should validate a valid transaction input', () => {
      const validInput = {
        type: 'expense',
        description: 'Supermercado',
        value: 150.50,
        date: '2026-01-21',
        category: 'Alimentação',
        responsible: 'João',
      };

      const result = CreateTransactionSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('expense');
        expect(result.data.value).toBe(150.50);
      }
    });

    it('should validate income transaction', () => {
      const incomeInput = {
        type: 'income',
        description: 'Salário',
        value: 5000,
        date: '2026-01-21',
        category: 'Salário',
        responsible: 'Empresa XYZ',
      };

      const result = CreateTransactionSchema.safeParse(incomeInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('income');
      }
    });

    it('should reject invalid type', () => {
      const invalidInput = {
        type: 'transfer', // inválido
        description: 'Test',
        value: 100,
        date: '2026-01-21',
        category: 'Alimentação',
        responsible: 'João',
      };

      const result = CreateTransactionSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject negative value', () => {
      const invalidInput = {
        type: 'expense',
        description: 'Test',
        value: -100, // negativo
        date: '2026-01-21',
        category: 'Alimentação',
        responsible: 'João',
      };

      const result = CreateTransactionSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject zero value', () => {
      const invalidInput = {
        type: 'expense',
        description: 'Test',
        value: 0, // zero não é válido (positive())
        date: '2026-01-21',
        category: 'Alimentação',
        responsible: 'João',
      };

      const result = CreateTransactionSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const invalidInput = {
        type: 'expense',
        description: 'Test',
        value: 100,
        date: '21/01/2026', // formato inválido
        category: 'Alimentação',
        responsible: 'João',
      };

      const result = CreateTransactionSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject empty category', () => {
      const invalidInput = {
        type: 'expense',
        description: 'Test',
        value: 100,
        date: '2026-01-21',
        category: '', // inválido (categorias agora são por usuário; existência é validada no service)
        responsible: 'João',
      };

      const result = CreateTransactionSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const validInput = {
        type: 'expense',
        description: 'Aluguel',
        value: 1500,
        date: '2026-01-25',
        category: 'Casa',
        responsible: 'Maria',
        total_installments: 3,
        is_recurring: false,
      };

      const result = CreateTransactionSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateTransactionSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        paid: true,
        description: 'Updated description',
      };

      const result = UpdateTransactionSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty object (no update)', () => {
      const emptyUpdate = {};

      const result = UpdateTransactionSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });

    it('should validate full update with all fields', () => {
      const fullUpdate = {
        type: 'income',
        description: 'Salário',
        value: 5000,
        date: '2026-01-20',
        category: 'Salário',
        responsible: 'João',
        paid: true,
      };

      const result = UpdateTransactionSchema.safeParse(fullUpdate);
      expect(result.success).toBe(true);
    });
  });
});

describe('Repository Pattern', () => {
  // Mock tests para ITransactionRepository
  // Será expandido com testes de integração quando DB estiver pronto

  it('should have getAll method', () => {
    // TODO: implementar teste com mock do repository
  });

  it('should have create method', () => {
    // TODO: implementar teste com mock do repository
  });

  it('should have getSummary method', () => {
    // TODO: implementar teste com mock do repository
  });
});
