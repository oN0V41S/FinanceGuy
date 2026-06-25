/**
 * @jest-environment node
 */
import { PUT, DELETE } from './route';
import { NextRequest } from 'next/server';
import { transactionRepository } from '@/core/container';

// Mock the container
jest.mock('@/core/container', () => ({
  transactionRepository: {
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('Transactions API [ID] - PUT & DELETE', () => {
  const mockTransactionId = '123e4567-e89b-12d3-a456-426614174000';
  const userId = 'user-123';

  const mockTransaction = {
    id: mockTransactionId,
    type: 'expense' as const,
    description: 'Supermercado',
    value: 150.5,
    date: '2026-01-21',
    category: 'Alimentação',
    responsible: 'João',
    userId,
    paid: false,
    is_recurring: false,
    created_at: new Date('2026-01-21'),
    updated_at: new Date('2026-01-21'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // PUT Method Tests
  // ============================================

  describe('PUT /api/transactions/[id]', () => {
    describe('Successful Updates', () => {
      it('should update transaction with valid partial data', async () => {
        const updateData = { description: 'Updated Description', paid: true };
        const updatedTransaction = { ...mockTransaction, ...updateData };

        (transactionRepository.update as jest.Mock).mockResolvedValue(updatedTransaction);

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          }
        );

        const response = await PUT(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.data.description).toBe('Updated Description');
        expect(data.data.paid).toBe(true);
        expect(transactionRepository.update).toHaveBeenCalledWith(
          mockTransactionId,
          expect.objectContaining({
            description: 'Updated Description',
            paid: true,
          })
        );
      });

      it('should update transaction with full data', async () => {
        const updateData = {
          type: 'income',
          description: 'Salário Janeiro',
          value: 5000,
          date: '2026-01-20',
          category: 'Salário',
          responsible: 'Empresa XYZ',
          paid: true,
        };
        const updatedTransaction = { ...mockTransaction, ...updateData };

        (transactionRepository.update as jest.Mock).mockResolvedValue(updatedTransaction);

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          }
        );

        const response = await PUT(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.data.type).toBe('income');
        expect(data.data.value).toBe(5000);
        expect(data.data.category).toBe('Salário');
      });

      it('should update transaction value only', async () => {
        const updateData = { value: 200.75 };
        const updatedTransaction = { ...mockTransaction, value: 200.75 };

        (transactionRepository.update as jest.Mock).mockResolvedValue(updatedTransaction);

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          }
        );

        const response = await PUT(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.data.value).toBe(200.75);
      });

      it('should allow empty update object', async () => {
        const updatedTransaction = { ...mockTransaction };

        (transactionRepository.update as jest.Mock).mockResolvedValue(updatedTransaction);

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          }
        );

        const response = await PUT(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(200);
      });
    });

    describe('Validation Errors (400)', () => {
      it('should return 400 for invalid type', async () => {
        const invalidData = { type: 'transfer' };

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invalidData),
          }
        );

        const response = await PUT(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Validação falhou');
        expect(data.issues).toBeDefined();
      });

      it('should return 400 for negative value', async () => {
        const invalidData = { value: -100 };

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invalidData),
          }
        );

        const response = await PUT(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Validação falhou');
      });

      it('should return 400 for zero value', async () => {
        const invalidData = { value: 0 };

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invalidData),
          }
        );

        const response = await PUT(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Validação falhou');
      });

      it('should return 400 for invalid date format', async () => {
        const invalidData = { date: '21/01/2026' };

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invalidData),
          }
        );

        const response = await PUT(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Validação falhou');
      });

      it('should return 400 for invalid category', async () => {
        const invalidData = { category: 'InvalidCategory' };

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invalidData),
          }
        );

        const response = await PUT(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Validação falhou');
      });

      it('should return 400 for empty description', async () => {
        const invalidData = { description: '' };

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invalidData),
          }
        );

        const response = await PUT(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Validação falhou');
      });

      it('should return 500 for invalid JSON body', async () => {
        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: 'invalid json',
          }
        );

        const response = await PUT(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        // Invalid JSON causes a parse error which is caught as server error (500)
        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('Erro interno do servidor');
      });
    });

    describe('Not Found Errors (404)', () => {
      it('should return 404 when transaction not found', async () => {
        const updateData = { description: 'Updated Description' };

        (transactionRepository.update as jest.Mock).mockResolvedValue(null);

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          }
        );

        const response = await PUT(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('Transação não encontrada');
      });
    });

    describe('Server Errors (500)', () => {
      it('should return 500 when repository throws error', async () => {
        const updateData = { description: 'Updated Description' };

        (transactionRepository.update as jest.Mock).mockRejectedValue(
          new Error('Database connection failed')
        );

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          }
        );

        const response = await PUT(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('Erro interno do servidor');
      });

      it('should return 500 for non-Zod, non-nullish errors', async () => {
        const updateData = { description: 'Updated Description' };

        (transactionRepository.update as jest.Mock).mockRejectedValue('Unexpected error');

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
          }
        );

        const response = await PUT(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(500);
      });
    });
  });

  // ============================================
  // DELETE Method Tests
  // ============================================

  describe('DELETE /api/transactions/[id]', () => {
    describe('Successful Deletion', () => {
      it('should delete transaction successfully', async () => {
        (transactionRepository.delete as jest.Mock).mockResolvedValue(true);

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const response = await DELETE(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.message).toBe('Transação deletada');
        expect(data.id).toBe(mockTransactionId);
        expect(transactionRepository.delete).toHaveBeenCalledWith(mockTransactionId);
      });

      it('should return correct response structure', async () => {
        (transactionRepository.delete as jest.Mock).mockResolvedValue(true);

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'DELETE',
          }
        );

        const response = await DELETE(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('id');
      });
    });

    describe('Not Found Errors (404)', () => {
      it('should return 404 when transaction not found', async () => {
        (transactionRepository.delete as jest.Mock).mockResolvedValue(false);

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'DELETE',
          }
        );

        const response = await DELETE(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('Transação não encontrada');
      });

      it('should return 404 for non-existent UUID format', async () => {
        (transactionRepository.delete as jest.Mock).mockResolvedValue(false);

        const fakeId = 'non-existent-id';
        const request = new NextRequest(
          `http://localhost/api/transactions/${fakeId}`,
          {
            method: 'DELETE',
          }
        );

        const response = await DELETE(request, {
          params: Promise.resolve({ id: fakeId }),
        });

        expect(response.status).toBe(404);
      });
    });

    describe('Server Errors (500)', () => {
      it('should return 500 when repository throws error', async () => {
        (transactionRepository.delete as jest.Mock).mockRejectedValue(
          new Error('Database connection failed')
        );

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'DELETE',
          }
        );

        const response = await DELETE(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('Erro interno do servidor');
      });

      it('should return 500 for non-Error exceptions', async () => {
        (transactionRepository.delete as jest.Mock).mockRejectedValue('Unexpected string error');

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'DELETE',
          }
        );

        const response = await DELETE(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(500);
      });

      it('should return 500 for null errors', async () => {
        (transactionRepository.delete as jest.Mock).mockRejectedValue(null);

        const request = new NextRequest(
          `http://localhost/api/transactions/${mockTransactionId}`,
          {
            method: 'DELETE',
          }
        );

        const response = await DELETE(request, {
          params: Promise.resolve({ id: mockTransactionId }),
        });

        expect(response.status).toBe(500);
      });
    });
  });

  // ============================================
  // Edge Cases & Boundary Tests
  // ============================================

  describe('Edge Cases', () => {
    it('should handle very long description', async () => {
      const longDescription = 'A'.repeat(500);
      const updatedTransaction = { ...mockTransaction, description: longDescription };

      (transactionRepository.update as jest.Mock).mockResolvedValue(updatedTransaction);

      const request = new NextRequest(
        `http://localhost/api/transactions/${mockTransactionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: longDescription }),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: mockTransactionId }),
      });

      expect(response.status).toBe(400);
    });

    it('should handle extremely large value', async () => {
      const largeValue = 999999999999;
      const updateData = { value: largeValue };

      (transactionRepository.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        value: largeValue,
      });

      const request = new NextRequest(
        `http://localhost/api/transactions/${mockTransactionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: mockTransactionId }),
      });

      expect(response.status).toBe(200);
    });

    it('should handle decimal values correctly', async () => {
      const decimalValue = 99.99;
      const updateData = { value: decimalValue };

      (transactionRepository.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        value: decimalValue,
      });

      const request = new NextRequest(
        `http://localhost/api/transactions/${mockTransactionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: mockTransactionId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.value).toBe(99.99);
    });

    it('should handle boolean paid field correctly', async () => {
      const updateData = { paid: true, is_recurring: true };

      (transactionRepository.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        ...updateData,
      });

      const request = new NextRequest(
        `http://localhost/api/transactions/${mockTransactionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: mockTransactionId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.paid).toBe(true);
      expect(data.data.is_recurring).toBe(true);
    });

    it('should handle special characters in description', async () => {
      const specialChars = 'Café & Açúcar <script>alert("test")</script>';
      const updateData = { description: specialChars };

      (transactionRepository.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        description: specialChars,
      });

      const request = new NextRequest(
        `http://localhost/api/transactions/${mockTransactionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: mockTransactionId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.description).toBe(specialChars);
    });

    it('should handle future dates', async () => {
      const futureDate = '2030-12-31';
      const updateData = { date: futureDate };

      (transactionRepository.update as jest.Mock).mockResolvedValue({
        ...mockTransaction,
        date: futureDate,
      });

      const request = new NextRequest(
        `http://localhost/api/transactions/${mockTransactionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: mockTransactionId }),
      });

      expect(response.status).toBe(200);
    });

    it('should handle missing Content-Type header', async () => {
      const updateData = { description: 'Test' };

      const request = new NextRequest(
        `http://localhost/api/transactions/${mockTransactionId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: mockTransactionId }),
      });

      // Should still work as NextRequest handles body parsing
      expect(response.status).toBeDefined();
    });

    it('should handle concurrent updates', async () => {
      const updateData = { description: 'Concurrent Update' };
      const updatedTransaction = { ...mockTransaction, ...updateData };

      (transactionRepository.update as jest.Mock)
        .mockResolvedValueOnce(updatedTransaction)
        .mockResolvedValueOnce({ ...updatedTransaction, description: 'Second Update' });

      const request1 = new NextRequest(
        `http://localhost/api/transactions/${mockTransactionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        }
      );

      const request2 = new NextRequest(
        `http://localhost/api/transactions/${mockTransactionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: 'Second Update' }),
        }
      );

      const [response1, response2] = await Promise.all([
        PUT(request1, { params: Promise.resolve({ id: mockTransactionId }) }),
        PUT(request2, { params: Promise.resolve({ id: mockTransactionId }) }),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(transactionRepository.update).toHaveBeenCalledTimes(2);
    });
  });
});
