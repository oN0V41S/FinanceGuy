/**
 * @jest-environment node
 */
import { GET, POST } from './route';
import { DELETE } from './[id]/route';
import { NextRequest } from 'next/server';
import { transactionService, transactionRepository } from '@/core/container';

// Mocking the container
jest.mock('@/core/container', () => ({
  transactionService: {
    getAllTransactions: jest.fn(),
    createTransaction: jest.fn(),
    getFinancialSummary: jest.fn(),
    deleteTransaction: jest.fn(),
  },
}));

describe('Transactions API Integration', () => {
  const userId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create, retrieve, and delete a transaction', async () => {
    const transactionData = {
      type: 'expense',
      description: 'Test Transaction',
      value: 100,
      date: '2026-01-21',
      category: 'Alimentação',
      responsible: 'Test User',
    };

    const createdTransaction = { id: '1', ...transactionData, userId };

    (transactionService.createTransaction as jest.Mock).mockResolvedValue(createdTransaction);
    (transactionService.getAllTransactions as jest.Mock).mockResolvedValue([createdTransaction]);
    (transactionService.getFinancialSummary as jest.Mock).mockResolvedValue({});
    (transactionService.deleteTransaction as jest.Mock).mockResolvedValue(true);

    // 1. Action: POST /api/transactions
    const postReq = new NextRequest('http://localhost/api/transactions', {
      method: 'POST',
      headers: { 'x-user-id': userId },
      body: JSON.stringify(transactionData),
    });

    const postResponse = await POST(postReq);
    expect(postResponse.status).toBe(201);
    const postData = await postResponse.json();
    expect(postData.data).toEqual(createdTransaction);

    // 2. Action: GET /api/transactions
    const getReq = new NextRequest('http://localhost/api/transactions', {
      method: 'GET',
      headers: { 'x-user-id': userId },
    });

    const getResponse = await GET(getReq);
    expect(getResponse.status).toBe(200);
    const getData = await getResponse.json();
    expect(getData.data).toContainEqual(createdTransaction);

    // 3. Action: DELETE /api/transactions/[id]
    const deleteReq = new NextRequest(`http://localhost/api/transactions/${createdTransaction.id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    });

    const deleteResponse = await DELETE(deleteReq, { params: Promise.resolve({ id: createdTransaction.id }) });
    expect(deleteResponse.status).toBe(200);
    
    // Verify delete was called
    expect(transactionService.deleteTransaction).toHaveBeenCalledWith(createdTransaction.id);
  });
});
