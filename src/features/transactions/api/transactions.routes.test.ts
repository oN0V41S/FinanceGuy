/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from './route';
import { PUT } from './[id]/route';
import { transactionService } from '@/core/container';
import { CategoryError } from '@/features/categories/categories.service';

jest.mock('@/core/container', () => ({
  transactionService: { createTransaction: jest.fn(), updateTransaction: jest.fn() },
}));

const svc = transactionService as unknown as Record<string, jest.Mock>;
const ctx = { params: Promise.resolve({ id: 't1' }) };
const req = (method: string) =>
  new NextRequest('http://localhost/api/transactions', {
    method,
    headers: { 'x-user-id': 'user-1' },
    body: JSON.stringify({}),
  });

describe('Transactions API - erros de categoria', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it.each(['NOT_FOUND', 'INCOMPATIBLE_TYPE'] as const)('POST mapeia %s para 422 com code', async (code) => {
    svc.createTransaction.mockRejectedValue(new CategoryError(code, 'msg'));
    const res = await POST(req('POST'));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: 'msg', code });
  });

  it('PUT mapeia NOT_FOUND de categoria para 422 e DUPLICATE para 409', async () => {
    svc.updateTransaction.mockRejectedValueOnce(new CategoryError('NOT_FOUND', 'msg'));
    expect((await PUT(req('PUT'), ctx)).status).toBe(422);

    svc.updateTransaction.mockRejectedValueOnce(new CategoryError('DUPLICATE', 'msg'));
    expect((await PUT(req('PUT'), ctx)).status).toBe(409);
  });

  it('POST 500 não vaza error.message', async () => {
    svc.createTransaction.mockRejectedValue(new Error('segredo interno do banco'));
    const res = await POST(req('POST'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('segredo');
  });
});
